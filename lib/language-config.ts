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

  /** Words to filter out from speech recognition */
  filteredWords: {
    /** Common words that should be ignored during recognition */
    commonWords: Set<string>;
    /** Short words that are too common or not useful for the game */
    excludedShortWords: Set<string>;
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
    cancelWords: new Set(["ОТМЕНА", "СТОП", "СБРОС"]),
  },

  filteredWords: {
    commonWords: new Set([
      // Common Russian words that interfere with speech recognition
      "ДА",
      "НЕТ",
      "ОК",
      "ОХ",
      "АХ",
      "ЭХ",
      "УХ",
      "ИХ",
      "ТО",
      "ТУ",
      "ТЫ",
      "МЫ",
      "ОН",
      "ОНА",
      "ОНО",
      "ОНИ",
      "И",
      "А",
      "НО",
      "ИЛИ",
      "ЖЕ",
      "УЖЕ",
      "ЕЩЕ",
      "ВОТ",
      "ТАК",
      "КАК",
      "ГДЕ",
      "КТО",
      "ЧТО",
      "НУ",
      "ЛА",
      "НА",
      "ЗА",
      "ПО",
      "ОТ",
      "ДО",
      "БЕЗ",
      "ХМ",
      "ММ",
      "ЭМ",
      "АГА",
      "УГУ",
      "ОГО",
    ]),
    excludedShortWords: new Set([
      // Very short words that are too common or not useful
      "А",
      "И",
      "О",
      "У",
      "Я",
      "Е",
      "Ё",
      "Ы",
      "Э",
      "Ю",
      "Б",
      "В",
      "Г",
      "Д",
      "Ж",
      "З",
      "К",
      "Л",
      "М",
      "Н",
      "П",
      "Р",
      "С",
      "Т",
      "Ф",
      "Х",
      "Ц",
      "Ч",
      "Ш",
      "Щ",
    ]),
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
    cancelWords: new Set(["CANCEL", "STOP", "RESET"]),
  },

  filteredWords: {
    commonWords: new Set([
      // Common English words that interfere with speech recognition
      "YES",
      "NO",
      "OK",
      "OH",
      "AH",
      "EH",
      "UH",
      "HM",
      "MM",
      "THE",
      "AND",
      "OR",
      "BUT",
      "SO",
      "TO",
      "OF",
      "IN",
      "ON",
      "AT",
      "BY",
      "FOR",
      "WITH",
      "FROM",
      "UP",
      "OUT",
      "OFF",
      "IS",
      "ARE",
      "WAS",
      "WERE",
      "BE",
      "BEEN",
      "HAVE",
      "HAS",
      "DO",
      "DOES",
      "DID",
      "WILL",
      "CAN",
      "COULD",
      "WOULD",
      "HI",
      "HEY",
      "WELL",
      "NOW",
      "THEN",
      "HERE",
      "THERE",
    ]),
    excludedShortWords: new Set([
      // Very short words that are too common or not useful
      "A",
      "I",
      "O",
      "U",
      "E",
      "Y",
      "B",
      "C",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "N",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "V",
      "W",
      "X",
      "Z",
    ]),
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

/**
 * Check if a word should be filtered out (ignored) for a given language
 */
export function isWordFiltered(word: string, locale: Locale): boolean {
  const config = getLanguageConfig(locale);
  const upperWord = word.toUpperCase().trim();

  // Check if it's a common word to filter
  if (config.filteredWords.commonWords.has(upperWord)) {
    return true;
  }

  // Check if it's an excluded short word
  if (config.filteredWords.excludedShortWords.has(upperWord)) {
    return true;
  }

  return false;
}

/**
 * Get filtered words configuration for a locale
 */
export function getFilteredWords(locale: Locale) {
  return getLanguageConfig(locale).filteredWords;
}

/**
 * Process a word with filtering - returns null if word should be ignored
 */
export function processWordWithFiltering(
  word: string,
  locale: Locale,
): {
  transformedWord: string;
  isValid: boolean;
  isFiltered: boolean;
} | null {
  const transformedWord = transformWord(word, locale);
  const isFiltered = isWordFiltered(transformedWord, locale);

  // Return null if the word should be filtered out
  if (isFiltered) {
    return null;
  }

  const isValid = validateWordForLanguage(word, locale);

  return {
    transformedWord,
    isValid,
    isFiltered: false,
  };
}
