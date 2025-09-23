export type Locale = "en" | "ru";

export interface LanguageConfig {
  /** Speech recognition language code */
  speechRecognitionLang: string;

  /** Word transformation rules applied before validation and processing */
  wordTransformations: Array<{
    name: string;
    transform: (word: string) => string;
  }>;

  /** Language-specific word validation rules */
  validation: {
    /** Minimum word length */
    minLength: number;
    /** Maximum word length */
    maxLength: number;
    /** Regex pattern for valid characters */
    validCharactersPattern: RegExp;
    /** Custom validation function */
    customValidation?: (word: string) => boolean;
  };

  /** Voice command configurations */
  voiceCommands: {
    numberWords: Record<string, number>;
    cancelWords: Set<string>;
  };

  /** Additional language-specific settings */
  settings: {
    /** Case sensitivity for word matching */
    caseSensitive: boolean;
    /** Default character set description */
    characterSet: string;
  };
}

// Russian language configuration
const russianConfig: LanguageConfig = {
  speechRecognitionLang: "ru-RU",

  wordTransformations: [
    {
      name: "normalizeYo",
      transform: (word: string) => {
        return word.replace(/ё/g, "е").replace(/Ё/g, "Е");
      },
    },
    {
      name: "removeAccents",
      transform: (word: string) => {
        return word.replace(/[́̀̂̃̄̆̇̈̊̋̌̍̎̏̐̑̒̓̔̕]/g, "");
      },
    },
  ],

  validation: {
    minLength: 2,
    maxLength: 15,
    validCharactersPattern: /^[А-Я]+$/,
    customValidation: (word: string) => {
      // Additional Russian-specific validation
      // Example: reject words with only consonants or only vowels
      const vowels = /[АЕЁИОУЫЭЮЯ]/;
      const consonants = /[БВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬЪЬ]/;
      return vowels.test(word) && consonants.test(word);
    },
  },

  voiceCommands: {
    numberWords: {
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
    },
    cancelWords: new Set(["ОТМЕНА", "СТОП", "НЕТ", "СБРОС"]),
  },

  settings: {
    caseSensitive: false,
    characterSet: "Cyrillic (А-Я)",
  },
};

// English language configuration
const englishConfig: LanguageConfig = {
  speechRecognitionLang: "en-US",

  wordTransformations: [
    {
      name: "removeAccents",
      transform: (word: string) => {
        // Remove accents and convert to basic Latin letters
        return word
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[àáâãäå]/gi, "a")
          .replace(/[èéêë]/gi, "e")
          .replace(/[ìíîï]/gi, "i")
          .replace(/[òóôõö]/gi, "o")
          .replace(/[ùúûü]/gi, "u")
          .replace(/[ñ]/gi, "n")
          .replace(/[ç]/gi, "c");
      },
    },
    {
      name: "removeSpecialChars",
      transform: (word: string) => {
        // Remove apostrophes and hyphens for speech recognition
        return word.replace(/['-]/g, "");
      },
    },
  ],

  validation: {
    minLength: 2,
    maxLength: 20,
    validCharactersPattern: /^[A-Z]+$/,
    customValidation: (word: string) => {
      // Basic English validation - ensure it has vowels
      const vowels = /[AEIOU]/;
      return vowels.test(word) || word.length <= 3; // Allow short words without vowels
    },
  },

  voiceCommands: {
    numberWords: {
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
    },
    cancelWords: new Set(["CANCEL", "STOP", "NO", "RESET"]),
  },

  settings: {
    caseSensitive: false,
    characterSet: "Latin (A-Z)",
  },
};

// Language configuration registry
const LANGUAGE_CONFIGS: Record<Locale, LanguageConfig> = {
  ru: russianConfig,
  en: englishConfig,
};

/**
 * Get language configuration for a specific locale
 */
export function getLanguageConfig(locale: Locale): LanguageConfig {
  return LANGUAGE_CONFIGS[locale] || LANGUAGE_CONFIGS.en;
}

/**
 * Apply all word transformations for a language
 */
export function transformWord(word: string, locale: Locale): string {
  const config = getLanguageConfig(locale);
  let result = word.toUpperCase().trim();

  // Apply each transformation in order
  for (const transformation of config.wordTransformations) {
    result = transformation.transform(result);
  }

  return result;
}

/**
 * Validate a word according to language-specific rules
 */
export function validateWordForLanguage(word: string, locale: Locale): boolean {
  if (!word) return false;

  const config = getLanguageConfig(locale);
  const transformedWord = transformWord(word, locale);

  // Check length constraints
  if (
    transformedWord.length < config.validation.minLength ||
    transformedWord.length > config.validation.maxLength
  ) {
    return false;
  }

  // Check character pattern
  if (!config.validation.validCharactersPattern.test(transformedWord)) {
    return false;
  }

  // Apply custom validation if available
  if (config.validation.customValidation) {
    return config.validation.customValidation(transformedWord);
  }

  return true;
}

/**
 * Get speech recognition language code for a locale
 */
export function getSpeechRecognitionLang(locale: Locale): string {
  return getLanguageConfig(locale).speechRecognitionLang;
}

/**
 * Get voice commands for a locale
 */
export function getVoiceCommandsForLanguage(locale: Locale) {
  return getLanguageConfig(locale).voiceCommands;
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): Locale[] {
  return Object.keys(LANGUAGE_CONFIGS) as Locale[];
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is Locale {
  return locale in LANGUAGE_CONFIGS;
}
