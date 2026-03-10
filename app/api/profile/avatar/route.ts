import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const AVATAR_LIST_LIMIT = 50;

async function ensureAvatarBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  if (!buckets.some((bucket) => bucket.id === AVATAR_BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      allowedMimeTypes: Object.keys(ALLOWED_AVATAR_TYPES),
      fileSizeLimit: AVATAR_MAX_BYTES,
    });

    if (createError) {
      throw createError;
    }
  }

  return admin;
}

async function listAvatarPaths(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: existingObjects, error: listError } = await admin.storage.from(AVATAR_BUCKET).list(userId, {
    limit: AVATAR_LIST_LIMIT,
  });

  if (listError) {
    throw listError;
  }

  return existingObjects?.map((object) => `${userId}/${object.name}`) ?? [];
}

async function removeAvatarPaths(admin: ReturnType<typeof createAdminClient>, paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await admin.storage.from(AVATAR_BUCKET).remove(paths);

  if (removeError) {
    throw removeError;
  }
}

async function rollbackAuthMetadata(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  previousUserMetadata: Record<string, unknown>
) {
  const { error: rollbackError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: previousUserMetadata,
  });

  return rollbackError;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Avatar file is required." }, { status: 400 });
  }

  const extension = ALLOWED_AVATAR_TYPES[file.type as keyof typeof ALLOWED_AVATAR_TYPES];

  if (!extension) {
    return NextResponse.json({ error: "Unsupported avatar file type." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "Avatar file is too large." }, { status: 400 });
  }

  try {
    const admin = await ensureAvatarBucket();
    const storage = admin.storage.from(AVATAR_BUCKET);
    const previousUserMetadata: Record<string, unknown> = {
      ...(user.user_metadata ?? {}),
    };
    const stalePaths = await listAvatarPaths(admin, user.id);
    const filePath = `${user.id}/avatar-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await storage.upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = storage.getPublicUrl(filePath);
    const avatarUrl = publicUrl;
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...previousUserMetadata,
        avatar_url: avatarUrl,
      },
    });

    if (authUpdateError) {
      try {
        await removeAvatarPaths(admin, [filePath]);
      } catch (cleanupError) {
        console.error(
          "[/api/profile/avatar] Failed to remove uploaded avatar after auth update error.",
          cleanupError instanceof Error ? cleanupError.message : cleanupError
        );
      }

      return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      const rollbackError = await rollbackAuthMetadata(admin, user.id, previousUserMetadata);

      if (rollbackError) {
        console.error(
          "[/api/profile/avatar] Failed to roll back auth metadata after profile write error.",
          rollbackError.message
        );
      } else {
        try {
          await removeAvatarPaths(admin, [filePath]);
        } catch (cleanupError) {
          console.error(
            "[/api/profile/avatar] Failed to remove uploaded avatar after profile write error.",
            cleanupError instanceof Error ? cleanupError.message : cleanupError
          );
        }
      }

      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    try {
      await removeAvatarPaths(admin, stalePaths);
    } catch (cleanupError) {
      console.error(
        "[/api/profile/avatar] Failed to remove stale avatar files after upload.",
        cleanupError instanceof Error ? cleanupError.message : cleanupError
      );
    }

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not upload avatar.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await ensureAvatarBucket();
    const previousUserMetadata: Record<string, unknown> = {
      ...(user.user_metadata ?? {}),
    };
    const existingAvatarPaths = await listAvatarPaths(admin, user.id);
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...previousUserMetadata,
        avatar_url: null,
      },
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      const rollbackError = await rollbackAuthMetadata(admin, user.id, previousUserMetadata);

      if (rollbackError) {
        console.error(
          "[/api/profile/avatar] Failed to roll back auth metadata after avatar removal profile error.",
          rollbackError.message
        );
      }

      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    try {
      await removeAvatarPaths(admin, existingAvatarPaths);
    } catch (cleanupError) {
      console.error(
        "[/api/profile/avatar] Failed to remove avatar files after clearing the profile photo.",
        cleanupError instanceof Error ? cleanupError.message : cleanupError
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not remove avatar.",
      },
      { status: 500 }
    );
  }
}
