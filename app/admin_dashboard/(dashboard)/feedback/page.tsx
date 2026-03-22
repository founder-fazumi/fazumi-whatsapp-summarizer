import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminFeedbackRedirectPage() {
  redirect("/admin-dashboard/inbox?tab=feedback");
}
