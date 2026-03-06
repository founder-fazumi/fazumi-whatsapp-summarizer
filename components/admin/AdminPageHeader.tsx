interface AdminPageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)] md:text-3xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>

      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

