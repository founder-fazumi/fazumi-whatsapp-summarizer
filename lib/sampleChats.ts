import type { Locale } from "@/lib/i18n";
import type { LangPref } from "@/lib/ai/summarize";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";

// Kept for any external callers that reference this type by name.
export type SampleLangPref = LangPref;

type SampleKey = "en" | "ar";

const SAMPLE_CHATS: Record<ImportSourcePlatform, Record<SampleKey, string>> = {
  whatsapp: {
    en: `[17/03/2026, 18:40] Grade 4 Teacher: Good evening parents. Reminder that the Math quiz is on Monday 17 March at 8:00 AM and covers units 4, 5, and 6.
[17/03/2026, 18:42] Parent: Will there be word problems on the quiz?
[17/03/2026, 18:44] Grade 4 Teacher: Yes, around 30% of the quiz will be word problems, so please review pages 78-82 tonight.
[17/03/2026, 18:47] School Admin: Science projects are due on Thursday 20 March. Upload a PDF or PowerPoint to the school portal before 7:00 PM.
[17/03/2026, 18:49] School Admin: Field trip permission slips and the 15 QAR fee must be sent back by Wednesday 19 March.
[17/03/2026, 18:53] PE Teacher: Sports practice Thursday 3:00 PM. Please send sports kit and water bottle.`,
    ar: `[17/03/2026، 18:40] معلمة الصف الرابع: مساء الخير يا أولياء الأمور. تذكير بأن اختبار الرياضيات يوم الاثنين 17 مارس الساعة 8:00 صباحًا ويغطي الوحدات 4 و5 و6.
[17/03/2026، 18:42] ولي أمر: هل سيتضمن الاختبار مسائل كلامية؟
[17/03/2026، 18:44] معلمة الصف الرابع: نعم، حوالي 30% من الاختبار سيكون مسائل كلامية، لذلك يرجى مراجعة الصفحات 78-82 الليلة.
[17/03/2026، 18:47] إدارة المدرسة: مشروع العلوم مطلوب يوم الخميس 20 مارس. يرجى رفع ملف PDF أو PowerPoint على بوابة المدرسة قبل الساعة 7:00 مساءً.
[17/03/2026، 18:49] إدارة المدرسة: يجب إعادة استمارات الرحلة ورسوم 15 QAR قبل يوم الأربعاء 19 مارس.
[17/03/2026، 18:53] معلم الرياضة: تدريب الرياضة الخميس الساعة 3:00 مساءً. يرجى إرسال الحقيبة الرياضية وزجاجة الماء.`,
  },
  telegram: {
    en: `[17.03.2026 18:40] Class Announcements: Grade 5 reading logs are due tomorrow by 7:30 AM.
[17.03.2026 18:42] Class Announcements: School bus fee for April is 180 SAR. Pay through the parent portal tonight if possible.
[17.03.2026 18:44] Arabic Teacher: Bring the Arabic notebook and spelling sheet on Wednesday.
[17.03.2026 18:47] Parent Council: Please confirm attendance for Saturday family day in the Google Form.`,
    ar: `[17.03.2026 18:40] إعلانات الصف: سجل القراءة للصف الخامس مطلوب غدًا قبل 7:30 صباحًا.
[17.03.2026 18:42] إعلانات الصف: رسوم حافلة شهر أبريل هي 180 SAR. يرجى السداد عبر بوابة أولياء الأمور الليلة إن أمكن.
[17.03.2026 18:44] معلمة العربية: أحضروا دفتر العربي وورقة الإملاء يوم الأربعاء.
[17.03.2026 18:47] مجلس أولياء الأمور: يرجى تأكيد الحضور ليوم العائلة يوم السبت عبر نموذج Google.`,
  },
  facebook: {
    en: `March 17 at 6:40 PM - School Office
Reminder: KG2 photo day is this Thursday. Children should wear the blue uniform.

March 17 at 6:44 PM - School Office
Ramadan activity fee is 25 AED and must be paid by Wednesday.

March 17 at 6:49 PM - Homeroom Teacher
Please send colored paper, glue, and scissors tomorrow.

March 17 at 6:55 PM - School Office
Messenger link for the permission form: https://school.example/form`,
    ar: `17 مارس الساعة 6:40 مساءً - مكتب المدرسة
تذكير: يوم التصوير لرياض الأطفال 2 هذا الخميس. يجب أن يرتدي الأطفال الزي الأزرق.

17 مارس الساعة 6:44 مساءً - مكتب المدرسة
رسوم نشاط رمضان 25 AED ويجب سدادها قبل يوم الأربعاء.

17 مارس الساعة 6:49 مساءً - معلمة الصف
يرجى إرسال ورق ملون وصمغ ومقص غدًا.

17 مارس الساعة 6:55 مساءً - مكتب المدرسة
رابط نموذج الإذن: https://school.example/form`,
  },
};

const FALLBACK_SAMPLE_CHATS: Record<SampleKey, string> = {
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
  locale: Locale,
  sourcePlatform: ImportSourcePlatform = "whatsapp"
): string {
  // Normalize to a key that has sample data: "ar" stays "ar", everything else → "en".
  const resolved: SampleKey =
    (langPref === "auto" ? locale : langPref) === "ar" ? "ar" : "en";
  return SAMPLE_CHATS[sourcePlatform]?.[resolved] ?? FALLBACK_SAMPLE_CHATS[resolved];
}
