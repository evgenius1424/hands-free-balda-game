export type Locale = "en" | "ru";

export interface VoiceCommands {
  numberWords: Record<string, number>;
  cancelWords: Set<string>;
}

const NUMBER_WORDS_RU: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  НОЛЬ: 0,
  ОДИН: 1,
  РАЗ: 1,
  ДВА: 2,
  ПАРА: 2,
  ТРИ: 3,
  ЧЕТЫРЕ: 4,
  ПЯТЬ: 5,
  ШЕСТЬ: 6,
  СЕМЬ: 7,
  ВОСЕМЬ: 8,
  ДЕВЯТЬ: 9,
};

const CANCEL_WORDS_RU = new Set([
  "ОТМЕНА",
  "СТОП",
  "НЕТ",
  "СБРОС"
]);

const NUMBER_WORDS_EN: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  ZERO: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
};

const CANCEL_WORDS_EN = new Set([
  "CANCEL",
  "STOP",
  "NO",
  "RESET"
]);

export function getVoiceCommands(locale: Locale): VoiceCommands {
  switch (locale) {
    case "ru":
      return {
        numberWords: NUMBER_WORDS_RU,
        cancelWords: CANCEL_WORDS_RU,
      };
    case "en":
    default:
      return {
        numberWords: NUMBER_WORDS_EN,
        cancelWords: CANCEL_WORDS_EN,
      };
  }
}

export function parseNumberCommand(
  word: string,
  numberWords: Record<string, number>
): number | null {
  const upperWord = word.toUpperCase().trim();
  return numberWords[upperWord] ?? null;
}

export function isCancelCommand(
  word: string,
  cancelWords: Set<string>
): boolean {
  const upperWord = word.toUpperCase().trim();
  return cancelWords.has(upperWord);
}