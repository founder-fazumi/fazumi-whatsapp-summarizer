import type { Locale } from "@/lib/i18n";

export type SampleLangPref = "auto" | "en" | "ar";

const SAMPLE_CHATS: Record<Exclude<SampleLangPref, "auto">, string> = {
  en: `Teacher: Good evening everyone. Reminder that the Math quiz is on Monday 17 March at 8:00 AM and covers units 4, 5, and 6.
Parent: Will there be word problems on the quiz?
Teacher: Yes, around 30% of the quiz will be word problems, so please review pages 78-82 tonight.
Teacher: Science projects are due on Thursday 20 March. Upload a PDF or PowerPoint to the school portal before 7:00 PM.
Parent: Is there a slide limit for the project?
Teacher: Maximum 10 slides, and please include the bibliography.
Teacher: Field trip permission slips and the 15 QR fee must be sent back by Wednesday 19 March.
Parent: Can students hand in the fee at the front office?
Teacher: Yes, cash at the front office is fine.
Teacher: Parent-teacher conferences are scheduled for Saturday 22 March from 3:00 PM to 6:00 PM. Please book your slot in the school app tonight.`,
  ar: `المعلمة: مساء الخير جميعًا. تذكير بأن اختبار الرياضيات يوم الاثنين 17 مارس الساعة 8:00 صباحًا ويغطي الوحدات 4 و5 و6.
ولي أمر: هل سيتضمن الاختبار مسائل كلامية؟
المعلمة: نعم، حوالي 30% من الاختبار سيكون مسائل كلامية، لذلك يرجى مراجعة الصفحات 78-82 الليلة.
المعلمة: مشروع العلوم مطلوب يوم الخميس 20 مارس. يرجى رفع ملف PDF أو PowerPoint على بوابة المدرسة قبل الساعة 7:00 مساءً.
ولي أمر: هل هناك حد أقصى لعدد الشرائح؟
المعلمة: الحد الأقصى 10 شرائح، ويرجى إضافة المراجع.
المعلمة: يجب إعادة استمارات الرحلة ورسوم 15 QR قبل يوم الأربعاء 19 مارس.
ولي أمر: هل يمكن للطلاب تسليم الرسوم في المكتب الأمامي؟
المعلمة: نعم، الدفع النقدي في المكتب الأمامي مناسب.
المعلمة: اجتماعات أولياء الأمور والمعلمين ستكون يوم السبت 22 مارس من 3:00 مساءً إلى 6:00 مساءً. يرجى حجز الموعد من تطبيق المدرسة الليلة.`,
};

export function getSampleChat(
  langPref: SampleLangPref,
  locale: Locale
): string {
  const resolved = langPref === "auto" ? locale : langPref;
  return SAMPLE_CHATS[resolved];
}
