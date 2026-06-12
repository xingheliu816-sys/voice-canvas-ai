import synonyms from '@/lib/synonyms/synonyms.json';

const typedSynonyms = synonyms as unknown as {
  verbs: Record<string, string[]>;
  shapes: Record<string, string[]>;
  colors: Record<string, string[]>;
  positions: Record<string, string[]>;
  sizes: Record<string, string[]>;
  asr_fixes: Record<string, string>;
};

const asrFixes = typedSynonyms.asr_fixes;

// 构建反向索引：同义词 → { category, standard }
const reverseMap = new Map<string, { category: string; standard: string }>();

for (const [category, groups] of Object.entries(typedSynonyms)) {
  if (category === 'asr_fixes') continue;
  for (const [standard, words] of Object.entries(groups)) {
    for (const w of words) {
      reverseMap.set(w, { category, standard });
    }
  }
}

export function normalize(text: string): string {
  let t = text.trim();
  for (const [wrong, correct] of Object.entries(asrFixes)) {
    t = t.replace(new RegExp(wrong, 'g'), correct);
  }
  return t;
}

export interface Normalized {
  raw: string;
  verb: string | null;
  color: string | null;
  shape: string | null;
  position: string | null;
  size: string | null;
  number: number | null;
  text: string | null;
  isMultiple: boolean;
}

export function analyze(text: string): Normalized {
  const result: Normalized = {
    raw: text,
    verb: null, color: null, shape: null,
    position: null, size: null, number: null,
    text: null, isMultiple: false
  };

  result.isMultiple = /和|还有|然后|再画|接着|另外/.test(text);

  const numMatch = text.match(/(\d+)/);
  if (numMatch && numMatch[1]) result.number = parseInt(numMatch[1], 10);

  const quoteMatch = text.match(/[''"'""'](.+?)[''"'""']/);
  if (quoteMatch && quoteMatch[1]) result.text = quoteMatch[1];

  // 按字符长度降序匹配，确保长词优先（"左上角" > "左"）
  const sorted = [...reverseMap.entries()]
    .filter(([word]) => text.includes(word))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [word, { category, standard }] of sorted) {
    if (category === 'verbs' && !result.verb) result.verb = standard;
    if (category === 'colors' && !result.color) result.color = standard;
    if (category === 'shapes' && !result.shape) result.shape = standard;
    if (category === 'positions' && !result.position) result.position = standard;
    if (category === 'sizes' && !result.size) result.size = standard;
  }

  return result;
}
