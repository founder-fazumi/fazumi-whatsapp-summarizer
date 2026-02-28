import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Contact", ar: "تواصل" }}
      title={{ en: "Contact Fazumi", ar: "تواصل مع Fazumi" }}
      description={{ en: "Choose feedback or support, fill in the form, and we will show a local success state for now.", ar: "اختر بين الملاحظات أو الدعم، واملأ النموذج، وسنعرض حالة نجاح محلية حاليًا." }}
    >
      <ContactForm />
    </PublicPageShell>
  );
}
