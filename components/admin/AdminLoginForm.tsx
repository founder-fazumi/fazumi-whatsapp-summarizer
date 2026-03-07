"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminLoginFormProps {
  nextPath: string;
}

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        body: JSON.stringify({
          next: nextPath,
          password,
          username,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            redirectTo?: string;
          }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Invalid credentials.");
        return;
      }

      window.location.assign(payload?.redirectTo ?? nextPath ?? "/admin_dashboard");
    } catch {
      setError("Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="admin-username"
          className="block text-sm font-semibold text-[var(--foreground)]"
        >
          Username
        </label>
        <Input
          id="admin-username"
          autoComplete="username"
          disabled={isSubmitting}
          onChange={(event) => setUsername(event.target.value)}
          required
          value={username}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-password"
          className="block text-sm font-semibold text-[var(--foreground)]"
        >
          Password
        </label>
        <div className="relative">
          <Input
            id="admin-password"
            autoComplete="current-password"
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        Log in
      </Button>
    </form>
  );
}
