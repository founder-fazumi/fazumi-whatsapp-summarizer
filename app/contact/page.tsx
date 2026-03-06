import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Contact", ar: "اتصل بنا" }}
      title={{ en: "Contact Fazumi", ar: "اتصل بفازومي" }}
      description={{ en: "Choose feedback or support, send the form, and it will land directly in FAZUMI's admin inbox for triage.", ar: "نحن هنا للمساعدة. اختر الملاحظات أو الدعم الفني، ثم أرسل النموذج ليصل مباشرة إلى صندوق إدارة فازومي للفرز والمتابعة." }}
    >
      <ContactForm />
    </PublicPageShell>
  );
}
