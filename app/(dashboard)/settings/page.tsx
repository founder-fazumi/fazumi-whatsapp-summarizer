import { DashboardShell } from "@/components/layout/DashboardShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <DashboardShell>
      <SettingsPanel />
    </DashboardShell>
  );
}
