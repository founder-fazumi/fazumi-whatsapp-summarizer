"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CHANNELS = [
  { value: "organic", label: "Organic" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "x", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "content", label: "Content" },
  { value: "partnerships", label: "Partnerships" },
  { value: "other", label: "Other" },
] as const;

interface MarketingSpendFormProps {
  onCreated?: () => Promise<void> | void;
}

export function MarketingSpendForm({ onCreated }: MarketingSpendFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    channel: "organic",
    amount: "",
    month: new Date().toISOString().slice(0, 7),
    notes: "",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/marketing-spend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not save marketing spend.");
      }

      setFormData({
        channel: "organic",
        amount: "",
        month: new Date().toISOString().slice(0, 7),
        notes: "",
      });

      await onCreated?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save marketing spend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full bg-[var(--surface-elevated)]">
      <CardHeader>
        <CardTitle>Add marketing spend</CardTitle>
        <CardDescription>
          Log channel spend so CAC is based on real numbers instead of spreadsheet drift.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Channel
              </span>
              <select
                value={formData.channel}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    channel: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Amount (USD)
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Month
              </span>
              <Input
                type="month"
                value={formData.month}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    month: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              <p className="font-semibold text-[var(--text-strong)]">What gets updated</p>
              <p className="mt-1 leading-6">
                The income page recalculates 30-day spend and CAC after each saved row.
              </p>
            </div>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Notes
            </span>
            <Textarea
              value={formData.notes}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Launch, creative test, agency invoice, founder promo, etc."
              className="min-h-[120px]"
            />
          </label>

          {error ? (
            <div className="rounded-[var(--radius)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading || !formData.amount}>
            <Plus className="h-4 w-4" />
            {loading ? "Saving..." : "Add spend row"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
