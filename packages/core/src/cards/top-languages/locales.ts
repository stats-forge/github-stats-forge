import { defineLocales } from '@stats-forge/card-kit';

/** The top-languages card's labels in the locales they have been translated into. */
const langCardLocales = defineLocales({
  en: {
    title: 'Most Used Languages',
    others: 'Other',
    noData: 'No languages data.',
  },
  ar: {
    title: 'أكثر اللغات استخدامًا',
    noData: 'لا توجد بيانات للغات.',
  },
  az: {
    title: 'Ən Çox İstifadə Olunan Dillər',
    noData: 'Dil məlumatı yoxdur.',
  },
  ca: {
    title: 'Llenguatges més utilitzats',
    noData: "Sense dades d'idiomes",
  },
  'zh-cn': {
    title: '最常用的语言',
    noData: '没有语言数据。',
  },
  'zh-tw': {
    title: '最常用的語言',
    noData: '沒有語言資料。',
  },
  cs: {
    title: 'Nejpoužívanější jazyky',
    noData: 'Žádné jazykové údaje.',
  },
  de: {
    title: 'Meist verwendete Sprachen',
    noData: 'Keine Sprachdaten.',
  },
  bg: {
    title: 'Най-използвани езици',
    noData: 'Няма данни за езици',
  },
  bn: {
    title: 'সর্বাধিক ব্যবহৃত ভাষা সমূহ',
    noData: 'কোন ভাষার ডেটা নেই।',
  },
  sw: {
    title: 'Lugha zilizotumika zaidi',
    noData: 'Hakuna kumbukumbu ya lugha zozote',
  },
  ur: {
    title: 'سب سے زیادہ استعمال شدہ زبانیں',
    noData: 'کوئی زبان کا ڈیٹا نہیں۔',
  },
  es: {
    title: 'Lenguajes más usados',
    noData: 'Sin datos de idiomas.',
  },
  fa: {
    title: 'زبان‌های پرکاربرد',
    noData: 'داده‌ای برای زبان‌ها وجود ندارد.',
  },
  fi: {
    title: 'Käytetyimmät kielet',
    noData: 'Ei kielitietoja.',
  },
  fr: {
    title: 'Langages les plus utilisés',
    noData: 'Aucune donnée sur les langues.',
  },
  hi: {
    title: 'सर्वाधिक प्रयुक्त भाषा',
    noData: 'कोई भाषा डेटा नहीं',
  },
  sa: {
    title: 'सर्वाधिक-प्रयुक्ताः भाषाः',
    noData: 'भाषा-विवरणं नास्ति।',
  },
  hu: {
    title: 'Leggyakrabban használt nyelvek',
    noData: 'Nincsenek nyelvi adatok.',
  },
  it: {
    title: 'Linguaggi più utilizzati',
    noData: 'Nessun dato sulle lingue.',
  },
  ja: {
    title: '最もよく使っている言語',
    noData: '言語データがありません。',
  },
  ko: {
    title: '가장 많이 사용된 언어',
    noData: '언어 데이터가 없습니다.',
  },
  nl: {
    title: 'Meest gebruikte talen',
    noData: 'Ingen sprogdata.',
  },
  'pt-pt': {
    title: 'Linguagens mais usadas',
    noData: 'Sem dados de linguagens.',
  },
  'pt-br': {
    title: 'Linguagens mais usadas',
    noData: 'Sem dados de linguagens.',
  },
  ne: {
    title: 'अधिक प्रयोग गरिएको भाषाहरू',
    noData: 'कुनै भाषा डाटा छैन।',
  },
  el: {
    title: 'Οι περισσότερο χρησιμοποιούμενες γλώσσες',
    noData: 'Δεν υπάρχουν δεδομένα γλωσσών.',
  },
  ro: {
    title: 'Cele Mai Folosite Limbaje',
    noData: 'Lipsesc date despre limbă.',
  },
  ru: {
    title: 'Наиболее используемые языки',
    noData: 'Нет данных о языках.',
  },
  'uk-ua': {
    title: 'Найбільш використовувані мови',
    noData: 'Немає даних про мови.',
  },
  id: {
    title: 'Bahasa Yang Paling Banyak Digunakan',
    noData: 'Tidak ada data bahasa.',
  },
  ml: {
    title: 'കൂടുതൽ ഉപയോഗിച്ച ഭാഷകൾ',
    noData: 'ഭാഷാ ഡാറ്റയില്ല.',
  },
  my: {
    title: 'အများဆုံးအသုံးပြုသောဘာသာစကားများ',
    noData: 'ဒေတာ မရှိပါ။',
  },
  ta: {
    title: 'அதிகம் பயன்படுத்தப்படும் மொழிகள்',
    noData: 'மொழி தரவு இல்லை.',
  },
  sk: {
    title: 'Najviac používané jazyky',
    noData: 'Žiadne údaje o jazykoch.',
  },
  tr: {
    title: 'En Çok Kullanılan Diller',
    noData: 'Dil verisi yok.',
  },
  pl: {
    title: 'Najczęściej używane języki',
    noData: 'Brak danych dotyczących języków.',
  },
  uz: {
    title: 'Eng koʻp ishlatiladigan tillar',
    noData: "Til haqida ma'lumot yo'q.",
  },
  vi: {
    title: 'Ngôn Ngữ Thường Sử Dụng',
    noData: 'Không có dữ liệu ngôn ngữ.',
  },
  sv: {
    title: 'Mest använda språken',
    noData: 'Inga språkdata.',
  },
  he: {
    title: 'השפות הכי משומשות',
    noData: 'אין נתוני שפות',
  },
  fil: {
    title: 'Mga Pinakamadalas na Ginagamit na Wika',
    noData: 'Walang datos ng lenggwahe.',
  },
  th: {
    title: 'ภาษาที่ใช้บ่อยที่สุด',
    noData: 'ไม่มีข้อมูลภาษา',
  },
  sr: {
    title: 'Најкоришћенији језици',
    noData: 'Нема података о језицима.',
  },
  'sr-latn': {
    title: 'Najkorišćeniji jezici',
    noData: 'Nema podataka o jezicima.',
  },
  no: {
    title: 'Mest brukte språk',
    noData: 'Ingen språkdata.',
  },
  be: {
    title: 'Найбольш ужываныя мовы',
    noData: 'Няма дадзеных пра мовы.',
  },
});

export { langCardLocales };
