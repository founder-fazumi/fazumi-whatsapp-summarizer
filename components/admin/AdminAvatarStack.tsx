"use client";

interface AdminAvatarStackProps {
  users: Array<{ id: string; name: string; email: string }>;
  max?: number;
}

function getInitials(name: string, email: string, id: string) {
  const source = name.trim() || email.trim() || id.trim();
  return source.slice(0, 2).toUpperCase();
}

export function AdminAvatarStack({
  users,
  max = 5,
}: AdminAvatarStackProps) {
  const visibleUsers = users.slice(0, max);
  const overflowCount = Math.max(users.length - max, 0);

  if (visibleUsers.length === 0 && overflowCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          title={user.name || user.email}
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-elevated)] bg-[var(--primary-soft)] text-[10px] font-semibold text-[var(--primary)]",
            index === 0 ? "" : "-ml-2",
          ].join(" ")}
          style={{ zIndex: index + 1 }}
        >
          {getInitials(user.name, user.email, user.id)}
        </div>
      ))}

      {overflowCount > 0 ? (
        <div
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-elevated)] bg-[var(--surface-muted)] text-[10px] font-semibold text-[var(--muted-foreground)]",
            visibleUsers.length > 0 ? "-ml-2" : "",
          ].join(" ")}
          style={{ zIndex: visibleUsers.length + 1 }}
          title={`+${overflowCount}`}
        >
          +{overflowCount}
        </div>
      ) : null}
    </div>
  );
}
