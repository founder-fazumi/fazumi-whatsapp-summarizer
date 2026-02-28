import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Contact", ar: "تواصل" }}
      title={{ en: "Contact Fazumi", ar: "تواصل مع Fazumi" }}
      description={{ en: "Choose feedback or support, fill in the form, and we will open your email app with a ready-to-send message.", ar: "اختر بين الملاحظات أو الدعم واملأ النموذج وسنفتح تطبيق البريد لديك مع رسالة جاهزة للإرسال." }}
    >
      <ContactForm />
    </PublicPageShell>
  );
}
