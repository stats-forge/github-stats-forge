import { defineLocales } from './localize.ts';

/**
 * The wordings more than one card draws, in the locales they have been translated into.
 *
 * `lastYear` lived in the wakatime card's table until 2026-09-08, which is where the
 * stats card reached for it — the translations here are that table's, moved verbatim.
 */
const commonLocales = defineLocales({
  en: {
    lastYear: 'last year',
  },
  ar: {
    lastYear: 'العام الماضي',
  },
  az: {
    lastYear: 'Ötən il',
  },
  ca: {
    lastYear: "L'any passat",
  },
  'zh-cn': {
    lastYear: '去年',
  },
  'zh-tw': {
    lastYear: '去年',
  },
  cs: {
    lastYear: 'Minulý rok',
  },
  de: {
    lastYear: 'Letztes Jahr',
  },
  sw: {
    lastYear: 'Mwaka uliopita',
  },
  ur: {
    lastYear: 'پچھلا سال',
  },
  bg: {
    lastYear: 'миналата год.',
  },
  bn: {
    lastYear: 'গত বছর',
  },
  es: {
    lastYear: 'El año pasado',
  },
  fa: {
    lastYear: 'سال گذشته',
  },
  fi: {
    lastYear: 'Viime vuosi',
  },
  fr: {
    lastYear: "L'année dernière",
  },
  hi: {
    lastYear: 'पिछले साल',
  },
  sa: {
    lastYear: 'गतवर्षे',
  },
  hu: {
    lastYear: 'Tavaly',
  },
  it: {
    lastYear: "L'anno scorso",
  },
  ja: {
    lastYear: '昨年',
  },
  ko: {
    lastYear: '작년',
  },
  nl: {
    lastYear: 'Vorig jaar',
  },
  'pt-pt': {
    lastYear: 'Ano passado',
  },
  'pt-br': {
    lastYear: 'Ano passado',
  },
  ne: {
    lastYear: 'गत वर्ष',
  },
  el: {
    lastYear: 'Πέρυσι',
  },
  ro: {
    lastYear: 'Anul trecut',
  },
  ru: {
    lastYear: 'За прошлый год',
  },
  'uk-ua': {
    lastYear: 'За минулий рік',
  },
  id: {
    lastYear: 'Tahun lalu',
  },
  ml: {
    lastYear: 'കഴിഞ്ഞ വർഷം',
  },
  my: {
    lastYear: 'မနှစ်က',
  },
  ta: {
    lastYear: 'கடந்த ஆண்டு',
  },
  sk: {
    lastYear: 'Minulý rok',
  },
  tr: {
    lastYear: 'Geçen yıl',
  },
  pl: {
    lastYear: 'W zeszłym roku',
  },
  uz: {
    lastYear: "O'tgan yil",
  },
  vi: {
    lastYear: 'Năm ngoái',
  },
  sv: {
    lastYear: 'Förra året',
  },
  he: {
    lastYear: 'שנה שעברה',
  },
  fil: {
    lastYear: 'Nakaraang Taon',
  },
  th: {
    lastYear: 'ปีที่แล้ว',
  },
  sr: {
    lastYear: 'Прошла год.',
  },
  'sr-latn': {
    lastYear: 'Prošla god.',
  },
  no: {
    lastYear: 'I fjor',
  },
  be: {
    lastYear: 'мінулы год',
  },
});

export { commonLocales };
