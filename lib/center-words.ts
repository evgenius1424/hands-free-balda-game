import { type Locale } from "@/types/game";

const wordsCache = new Map<string, string[]>();

async function loadCenterWords(locale: string): Promise<string[]> {
  if (wordsCache.has(locale)) {
    return wordsCache.get(locale)!;
  }

  try {
    const words = await import(`../data/center-words/${locale}.json`).then(
      (module) => module.default,
    );
    wordsCache.set(locale, words);
    return words;
  } catch (error) {
    console.error(`Failed to load center words for locale ${locale}:`, error);
    return [];
  }
}

export async function getRandomCenterWord(
  locale: Locale = "ru",
): Promise<string> {
  const words = await loadCenterWords(locale);
  if (words.length === 0) {
    console.warn(`No center words available for locale ${locale}`);
    return "";
  }
  const idx = Math.floor(Math.random() * words.length);
  return words[idx];
}
