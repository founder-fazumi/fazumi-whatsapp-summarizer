import { createAdminClient } from "@/lib/supabase/admin";

interface AuditEntry {
  adminUsername: string;
  action: string;
  targetType: "user" | "feedback" | "support" | "subscription";
  targetIds: string[];
  details?: Record<string, unknown>;
  ip?: string;
}

/**
 * Write an admin action to admin_audit_log.
 * Failures are swallowed — audit logging must never break the primary action.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_username: entry.adminUsername,
      action: entry.action,
      target_type: entry.targetType,
      target_ids: entry.targetIds,
      details: entry.details ?? {},
      ip: entry.ip ?? null,
    });
  } catch {
    // Audit failure must never propagate — log and continue
    console.error(JSON.stringify({
      source: "admin/audit",
      msg: "Failed to write audit log",
      action: entry.action,
      ts: new Date().toISOString(),
    }));
  }
}
