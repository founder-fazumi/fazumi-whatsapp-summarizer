import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ContactMode = "feedback" | "support";

function isValidMode(value: unknown): value is ContactMode {
  return value === "feedback" || value === "support";
}

function normalizeLocale(value: unknown) {
  return value === "ar" ? "ar" : "en";
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const phone = value.trim();
  return phone.length > 0 ? phone.slice(0, 32) : null;
}

function normalizeTags() {
  return [] as string[];
}

function inferFeedbackType(
  value: unknown,
  rating: string | null
): "bug" | "feature" | "complaint" | "praise" | "support" {
  if (
    value === "bug" ||
    value === "feature" ||
    value === "complaint" ||
    value === "praise" ||
    value === "support"
  ) {
    return value;
  }

  if (rating === "love" || rating === "good") {
    return "praise";
  }

  if (rating === "bad" || rating === "rough") {
    return "complaint";
  }

  return "feature";
}

function inferPriority(rating: string | null) {
  return rating === "rough" ? "high" : "normal";
}

async function insertLegacyFeedback(
  admin: ReturnType<typeof createAdminClient>,
  payload: {
    phone: string | null;
    message: string;
    email: string;
    subject: string;
    locale: "en" | "ar";
    type: "bug" | "feature" | "complaint" | "praise" | "support";
    rating: string | null;
    mode: ContactMode;
  }
) {
  const legacyPriority = payload.mode === "support" ? "medium" : payload.rating === "rough" ? "high" : "medium";
  const { error } = await admin.from("user_feedback").insert({
    phone_e164: payload.phone ?? `email:${payload.email}`,
    message: payload.message,
    meta_json: {
      email: payload.email,
      subject: payload.subject,
      locale: payload.locale,
      type: payload.type,
      status: "pending",
      priority: legacyPriority,
      rating: payload.rating,
      source: payload.mode === "support" ? "contact-support" : "contact-feedback",
    },
  });

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: unknown;
      email?: unknown;
      phone?: unknown;
      subject?: unknown;
      message?: unknown;
      locale?: unknown;
      rating?: unknown;
      feedbackType?: unknown;
      website?: unknown;
    };

    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    if (!isValidMode(body.mode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid contact mode." },
        { status: 400 }
      );
    }

    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
    if (message.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Message must be at least 10 characters." },
        { status: 400 }
      );
    }

    const locale = normalizeLocale(body.locale);
    const rating =
      typeof body.rating === "string" && body.rating.trim().length > 0
        ? body.rating.trim().slice(0, 24)
        : null;
    const fallbackSubject =
      body.mode === "feedback"
        ? locale === "ar"
          ? "ملاحظات المنتج"
          : "Product feedback"
        : locale === "ar"
          ? "طلب دعم"
          : "Support request";
    const subject =
      typeof body.subject === "string" && body.subject.trim().length > 0
        ? body.subject.trim().slice(0, 160)
        : fallbackSubject;
    const phone = normalizePhone(body.phone);
    const tags = normalizeTags();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const feedbackType = inferFeedbackType(body.feedbackType, rating);

    if (body.mode === "feedback") {
      const { error } = await admin.from("user_feedback").insert({
        user_id: user?.id ?? null,
        email,
        phone_e164: phone,
        subject,
        locale,
        type: feedbackType,
        status: "new",
        priority: inferPriority(rating),
        message,
        rating,
        tags,
        admin_notes: null,
        response: null,
        responded_at: null,
        last_updated_at: nowIso,
      });

      if (error) {
        await insertLegacyFeedback(admin, {
          phone,
          message,
          email,
          subject,
          locale,
          type: feedbackType,
          rating,
          mode: body.mode,
        });
      }
    } else {
      const { error } = await admin.from("support_requests").insert({
        user_id: user?.id ?? null,
        email,
        phone_e164: phone,
        subject,
        message,
        locale,
        status: "new",
        priority: "normal",
        tags,
        admin_notes: null,
        last_updated_at: nowIso,
      });

      if (error) {
        await insertLegacyFeedback(admin, {
          phone,
          message,
          email,
          subject,
          locale,
          type: "support",
          rating,
          mode: body.mode,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not save the contact request.",
      },
      { status: 500 }
    );
  }
}
