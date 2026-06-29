const ARMENIAN = /[\u0530-\u058F]/;
const LATIN_OR_CYRILLIC = /[A-Za-z\u0400-\u04FF]/;

/** Latin/Cyrillic letters that are often confused with Armenian in HY copy. */
const LOOKALIKE_TO_ARMENIAN: Record<string, string> = {
  a: "ա",
  A: "Ա",
  b: "բ",
  B: "Բ",
  c: "ց",
  C: "Ց",
  d: "դ",
  D: "Դ",
  e: "ե",
  E: "Ե",
  g: "գ",
  G: "Գ",
  h: "հ",
  H: "Հ",
  i: "ի",
  I: "Ի",
  k: "կ",
  K: "Կ",
  l: "լ",
  L: "Լ",
  m: "մ",
  M: "Մ",
  n: "ն",
  N: "Ն",
  o: "ո",
  O: "Ո",
  p: "պ",
  P: "Պ",
  r: "ր",
  R: "Ր",
  s: "ս",
  S: "Ս",
  t: "տ",
  T: "Տ",
  u: "ու",
  v: "վ",
  V: "Վ",
  y: "յ",
  Y: "Յ",
  z: "զ",
  Z: "Զ",
  а: "ա",
  А: "Ա",
  б: "բ",
  Б: "Բ",
  в: "վ",
  В: "Վ",
  г: "գ",
  Г: "Գ",
  д: "դ",
  Д: "Դ",
  е: "ե",
  Е: "Ե",
  и: "ի",
  И: "Ի",
  к: "կ",
  К: "Կ",
  л: "լ",
  Л: "Լ",
  м: "մ",
  М: "Մ",
  н: "ն",
  Н: "Ն",
  о: "ո",
  О: "Ո",
  п: "պ",
  П: "Պ",
  р: "ր",
  Р: "Ր",
  с: "ս",
  С: "Ս",
  т: "տ",
  Т: "Տ",
  х: "խ",
  Х: "Խ",
  ч: "չ",
  Ч: "Չ",
  ш: "շ",
  Ш: "Շ",
  ь: "ի",
  ы: "ը",
};

function isSkuLike(word: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(word) && !ARMENIAN.test(word);
}

function fixWord(word: string): string {
  if (!ARMENIAN.test(word) || isSkuLike(word)) return word;
  let out = "";
  for (const ch of word) {
    if (ARMENIAN.test(ch)) out += ch;
    else if (LOOKALIKE_TO_ARMENIAN[ch]) out += LOOKALIKE_TO_ARMENIAN[ch];
    else out += ch;
  }
  return out;
}

/** Replace Latin/Cyrillic lookalikes inside Armenian words. */
export function fixHyMixedScript(text: string | null | undefined): string {
  if (!text?.trim()) return text ?? "";
  if (!ARMENIAN.test(text)) return text;
  return text.replace(/[\u0530-\u058Fa-zA-Z\u0400-\u04FF]+/g, fixWord);
}

export function hasHyMixedScript(text: string | null | undefined): boolean {
  if (!text?.trim() || !ARMENIAN.test(text)) return false;
  return fixHyMixedScript(text) !== text;
}

export function findHyScriptIssues(text: string | null | undefined): string[] {
  if (!text?.trim() || !ARMENIAN.test(text)) return [];
  const issues: string[] = [];
  for (const word of text.match(/[\u0530-\u058Fa-zA-Z\u0400-\u04FF]+/g) ?? []) {
    if (!ARMENIAN.test(word) || isSkuLike(word)) continue;
    for (const ch of word) {
      if (LATIN_OR_CYRILLIC.test(ch) && LOOKALIKE_TO_ARMENIAN[ch]) {
        issues.push(ch);
      }
    }
  }
  return [...new Set(issues)];
}
