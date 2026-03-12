import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Contact", ar: "اتصل بنا" }}
      title={{ en: "Contact Fazumi", ar: "اتصل بفازومي" }}
      description={{ en: "Questions about the product, account, billing, or refunds? Send a message here and Fazumi will reply by email.", ar: "هل لديك سؤال عن المنتج أو الحساب أو الفوترة أو الاسترداد؟ أرسل رسالتك هنا وسيرد عليك فازومي عبر البريد الإلكتروني." }}
    >
      <ContactForm />
    </PublicPageShell>
  );
}
