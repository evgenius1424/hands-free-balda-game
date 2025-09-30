import { describe, expect, it } from "vitest";
import {
  getFilteredWords,
  getLanguageConfig,
  getLocales,
  getSpeechRecognitionLang,
  getVoiceCommandsForLanguage,
  isLocaleSupported,
  isWordFiltered,
  processWordWithFiltering,
  transformWord,
  validateWordForLanguage,
} from "../language-config";

describe("Language Configuration", () => {
  describe("transformWord", () => {
    it("should normalize Russian ё to е", () => {
      const result = transformWord("ТЁМНЫЙ", "ru");
      expect(result).toBe("ТЕМНЫЙ");
    });

    it("should remove accents from English words", () => {
      const result = transformWord("café", "en");
      expect(result).toBe("CAFE");
    });

    it("should remove apostrophes and hyphens in English", () => {
      const result = transformWord("don't", "en");
      expect(result).toBe("DONT");
    });

    it("should uppercase and trim words", () => {
      expect(transformWord("  hello  ", "en")).toBe("HELLO");
      expect(transformWord("  привет  ", "ru")).toBe("ПРИВЕТ");
    });
  });

  describe("validateWordForLanguage", () => {
    it("should validate Russian words", () => {
      expect(validateWordForLanguage("СЛОВО", "ru")).toBe(true);
      expect(validateWordForLanguage("А", "ru")).toBe(false); // too short
      expect(validateWordForLanguage("HELLO", "ru")).toBe(false); // wrong alphabet
    });

    it("should validate English words", () => {
      expect(validateWordForLanguage("HELLO", "en")).toBe(true);
      expect(validateWordForLanguage("A", "en")).toBe(false); // too short
      expect(validateWordForLanguage("ПРИВЕТ", "en")).toBe(false); // wrong alphabet
    });

    it("should apply custom validation rules", () => {
      // Russian words need both vowels and consonants
      expect(validateWordForLanguage("АЕИО", "ru")).toBe(false); // only vowels
      expect(validateWordForLanguage("БВГД", "ru")).toBe(false); // only consonants
      expect(validateWordForLanguage("СЛОВО", "ru")).toBe(true); // mixed
    });

    it("should handle transformed words with ё", () => {
      expect(validateWordForLanguage("ТЁМНЫЙ", "ru")).toBe(true);
    });
  });

  describe("getSpeechRecognitionLang", () => {
    it("should return correct speech recognition codes", () => {
      expect(getSpeechRecognitionLang("ru")).toBe("ru-RU");
      expect(getSpeechRecognitionLang("en")).toBe("en-US");
    });
  });

  describe("getVoiceCommandsForLanguage", () => {
    it("should return Russian voice commands", () => {
      const commands = getVoiceCommandsForLanguage("ru");
      expect(commands.numberWords["ОДИН"]).toBe(1);
      expect(commands.numberWords["ДВА"]).toBe(2);
      expect(commands.cancelWords.has("ОТМЕНА")).toBe(true);
    });

    it("should return English voice commands", () => {
      const commands = getVoiceCommandsForLanguage("en");
      expect(commands.numberWords["ONE"]).toBe(1);
      expect(commands.numberWords["TWO"]).toBe(2);
      expect(commands.cancelWords.has("CANCEL")).toBe(true);
    });
  });

  describe("utility functions", () => {
    it("should return supported locales", () => {
      const locales = getLocales();
      expect(locales).toContain("en");
      expect(locales).toContain("ru");
    });

    it("should check locale support", () => {
      expect(isLocaleSupported("en")).toBe(true);
      expect(isLocaleSupported("ru")).toBe(true);
      expect(isLocaleSupported("fr")).toBe(false);
    });
  });

  describe("getLanguageConfig", () => {
    it("should return complete configuration for each language", () => {
      const ruConfig = getLanguageConfig("ru");
      expect(ruConfig.speechRecognitionLang).toBe("ru-RU");
      expect(ruConfig.wordTransformations).toHaveLength(2);
      expect(ruConfig.validation.validCharactersPattern).toEqual(/^[А-Я]+$/);

      const enConfig = getLanguageConfig("en");
      expect(enConfig.speechRecognitionLang).toBe("en-US");
      expect(enConfig.wordTransformations).toHaveLength(2);
      expect(enConfig.validation.validCharactersPattern).toEqual(/^[A-Z]+$/);
    });

    it("should fallback to English for unknown locales", () => {
      const config = getLanguageConfig("unknown" as Locale);
      expect(config.speechRecognitionLang).toBe("en-US");
    });
  });

  describe("word filtering", () => {
    it("should filter common Russian words", () => {
      expect(isWordFiltered("ДА", "ru")).toBe(true);
      expect(isWordFiltered("НЕТ", "ru")).toBe(true);
      expect(isWordFiltered("ОК", "ru")).toBe(true);
      expect(isWordFiltered("АХ", "ru")).toBe(true);
    });

    it("should filter common English words", () => {
      expect(isWordFiltered("YES", "en")).toBe(true);
      expect(isWordFiltered("NO", "en")).toBe(true);
      expect(isWordFiltered("OK", "en")).toBe(true);
      expect(isWordFiltered("THE", "en")).toBe(true);
    });

    it("should filter short single letters", () => {
      expect(isWordFiltered("А", "ru")).toBe(true);
      expect(isWordFiltered("И", "ru")).toBe(true);
      expect(isWordFiltered("A", "en")).toBe(true);
      expect(isWordFiltered("I", "en")).toBe(true);
    });

    it("should not filter valid game words", () => {
      expect(isWordFiltered("СЛОВО", "ru")).toBe(false);
      expect(isWordFiltered("БАЛДА", "ru")).toBe(false);
      expect(isWordFiltered("WORD", "en")).toBe(false);
      expect(isWordFiltered("GAME", "en")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isWordFiltered("да", "ru")).toBe(true);
      expect(isWordFiltered("Да", "ru")).toBe(true);
      expect(isWordFiltered("yes", "en")).toBe(true);
      expect(isWordFiltered("Yes", "en")).toBe(true);
    });
  });

  describe("processWordWithFiltering", () => {
    it("should return null for filtered words", () => {
      const result = processWordWithFiltering("ДА", "ru");
      expect(result).toBeNull();
    });

    it("should process valid unfiltered words", () => {
      const result = processWordWithFiltering("СЛОВО", "ru");
      expect(result).not.toBeNull();
      expect(result?.transformedWord).toBe("СЛОВО");
      expect(result?.isValid).toBe(true);
      expect(result?.isFiltered).toBe(false);
    });

    it("should handle transformations and filtering together", () => {
      const result = processWordWithFiltering("ТЁМНЫЙ", "ru");
      expect(result).not.toBeNull();
      expect(result?.transformedWord).toBe("ТЕМНЫЙ");
      expect(result?.isValid).toBe(true);
    });

    it("should process invalid but unfiltered words", () => {
      const result = processWordWithFiltering("XYZ", "ru");
      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(false);
      expect(result?.isFiltered).toBe(false);
    });
  });

  describe("getFilteredWords", () => {
    it("should return filtered words configuration", () => {
      const ruFiltered = getFilteredWords("ru");
      expect(ruFiltered.commonWords.has("ДА")).toBe(true);
      expect(ruFiltered.excludedShortWords.has("А")).toBe(true);

      const enFiltered = getFilteredWords("en");
      expect(enFiltered.commonWords.has("YES")).toBe(true);
      expect(enFiltered.excludedShortWords.has("A")).toBe(true);
    });
  });
});
