import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  getFilteredWords,
  getLanguageConfig,
  getSpeechRecognitionLang,
  getVoiceCommandsForLanguage,
  isWordFiltered,
  processWordWithFiltering,
  transformWord,
  validateWordForLanguage,
} from "@/lib/language-config";

/**
 * Hook to access language configuration for the current locale
 */
export function useLanguageConfig() {
  const { locale } = useI18n();

  const config = useMemo(() => getLanguageConfig(locale), [locale]);

  const speechRecognitionLang = useMemo(
    () => getSpeechRecognitionLang(locale),
    [locale],
  );

  const voiceCommands = useMemo(
    () => getVoiceCommandsForLanguage(locale),
    [locale],
  );

  const transformWordForCurrentLanguage = useMemo(
    () => (word: string) => transformWord(word, locale),
    [locale],
  );

  const validateWordForCurrentLanguage = useMemo(
    () => (word: string) => validateWordForLanguage(word, locale),
    [locale],
  );

  return {
    locale,
    config,
    speechRecognitionLang,
    voiceCommands,
    transformWord: transformWordForCurrentLanguage,
    validateWord: validateWordForCurrentLanguage,
  };
}

/**
 * Hook specifically for speech recognition configuration
 */
export function useSpeechRecognitionConfig() {
  const { locale } = useI18n();

  return useMemo(
    () => ({
      lang: getSpeechRecognitionLang(locale),
      locale: locale,
    }),
    [locale],
  );
}

/**
 * Hook for word processing (transformation + validation + filtering)
 */
export function useWordProcessor() {
  const { locale } = useI18n();

  const processWord = useMemo(
    () =>
      (word: string): { transformedWord: string; isValid: boolean } => {
        const transformedWord = transformWord(word, locale);
        const isValid = validateWordForLanguage(word, locale);

        return {
          transformedWord,
          isValid,
        };
      },
    [locale],
  );

  const processWordWithFilter = useMemo(
    () => (word: string) => processWordWithFiltering(word, locale),
    [locale],
  );

  const transformOnly = useMemo(
    () => (word: string) => transformWord(word, locale),
    [locale],
  );

  const validateOnly = useMemo(
    () => (word: string) => validateWordForLanguage(word, locale),
    [locale],
  );

  const isFiltered = useMemo(
    () => (word: string) => isWordFiltered(word, locale),
    [locale],
  );

  const filteredWords = useMemo(() => getFilteredWords(locale), [locale]);

  return {
    processWord,
    processWordWithFilter,
    transformWord: transformOnly,
    validateWord: validateOnly,
    isWordFiltered: isFiltered,
    filteredWords,
    locale: locale,
  };
}

/**
 * Hook for voice commands functionality
 */
export function useVoiceCommands() {
  const { locale } = useI18n();

  const voiceCommands = useMemo(
    () => getVoiceCommandsForLanguage(locale),
    [locale],
  );

  const parseNumber = useMemo(
    () =>
      (word: string): number | null => {
        const upperWord = word.toUpperCase().trim();
        return voiceCommands.numberWords[upperWord] ?? null;
      },
    [voiceCommands],
  );

  const isCancel = useMemo(
    () =>
      (word: string): boolean => {
        const upperWord = word.toUpperCase().trim();
        return voiceCommands.cancelWords.has(upperWord);
      },
    [voiceCommands],
  );

  return {
    voiceCommands,
    parseNumber,
    isCancel,
    locale: locale,
  };
}

/**
 * Hook that combines all language-related functionality
 */
export function useLanguageFeatures() {
  const config = useLanguageConfig();
  const speechConfig = useSpeechRecognitionConfig();
  const wordProcessor = useWordProcessor();
  const voiceCommands = useVoiceCommands();

  return {
    // Locale info
    locale: config.locale,

    // Full configuration
    config: config.config,

    // Speech recognition
    speechRecognitionLang: speechConfig.lang,

    // Word processing
    transformWord: wordProcessor.transformWord,
    validateWord: wordProcessor.validateWord,
    processWord: wordProcessor.processWord,
    processWordWithFilter: wordProcessor.processWordWithFilter,
    isWordFiltered: wordProcessor.isWordFiltered,
    filteredWords: wordProcessor.filteredWords,

    // Voice commands
    voiceCommands: voiceCommands.voiceCommands,
    parseNumber: voiceCommands.parseNumber,
    isCancel: voiceCommands.isCancel,
  };
}
