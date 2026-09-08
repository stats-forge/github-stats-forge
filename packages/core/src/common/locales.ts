import { defineLocales } from './localize.ts';

/**
 * The wordings more than one card draws, in the locales they have been translated into.
 *
 * `lastYear` lived in the wakatime card's table until 2026-09-08, which is where the
 * stats card reached for it — the translations here are that table's, moved verbatim.
 */
const commonLocales = defineLocales({
  lastYear: {
    en: 'last year',
    ar: 'العام الماضي',
    az: 'Ötən il',
    ca: "L'any passat",
    cn: '去年',
    'zh-tw': '去年',
    cs: 'Minulý rok',
    de: 'Letztes Jahr',
    sw: 'Mwaka uliopita',
    ur: 'پچھلا سال',
    bg: 'миналата год.',
    bn: 'গত বছর',
    es: 'El año pasado',
    fa: 'سال گذشته',
    fi: 'Viime vuosi',
    fr: "L'année dernière",
    hi: 'पिछले साल',
    sa: 'गतवर्षे',
    hu: 'Tavaly',
    it: "L'anno scorso",
    ja: '昨年',
    kr: '작년',
    nl: 'Vorig jaar',
    'pt-pt': 'Ano passado',
    'pt-br': 'Ano passado',
    np: 'गत वर्ष',
    el: 'Πέρυσι',
    ro: 'Anul trecut',
    ru: 'За прошлый год',
    'uk-ua': 'За минулий рік',
    id: 'Tahun lalu',
    ml: 'കഴിഞ്ഞ വർഷം',
    my: 'မနှစ်က',
    ta: `கடந்த ஆண்டு`,
    sk: 'Minulý rok',
    tr: 'Geçen yıl',
    pl: 'W zeszłym roku',
    uz: "O'tgan yil",
    vi: 'Năm ngoái',
    se: 'Förra året',
    he: 'שנה שעברה',
    fil: 'Nakaraang Taon',
    th: 'ปีที่แล้ว',
    sr: 'Прошла год.',
    'sr-latn': 'Prošla god.',
    no: 'I fjor',
    be: 'мінулы год',
  },
});

export { commonLocales };
