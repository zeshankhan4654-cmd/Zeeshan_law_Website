/**
 * The verse the chamber asked to have set below the introduction.
 *
 * ⚠️ The Arabic below must be checked against a printed mushaf before this
 * site goes live. It is reproduced here in the simple (imlaei) orthography
 * rather than the Uthmani script, which is easier to verify by eye — but
 * scripture is not something to take on trust from a code comment, and a
 * misplaced diacritic is a real error, not a typo.
 *
 * Surah An-Nisa (4), part of verse 58 — the verse on judging with justice.
 */
export const JUSTICE_VERSE = {
  arabic:
    "إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا وَإِذَا حَكَمْتُمْ بَيْنَ النَّاسِ أَنْ تَحْكُمُوا بِالْعَدْلِ",
  english:
    "Indeed, Allah commands you to render trusts to whom they are due, and when you judge between people, to judge with justice.",
  reference: "Surah An-Nisa 4:58",
} as const;
