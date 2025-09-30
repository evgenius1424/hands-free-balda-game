import { useState, useEffect } from "react";
import { getRandomCenterWord } from "@/lib/center-words";
import { type GameGrid } from "@/types/game";

export function useGameInitialization(
  locale: string,
  isHydrated: boolean,
  onReset: () => void,
) {
  const [centerWord, setCenterWord] = useState<string>("");
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    if (!centerWord && isHydrated) {
      getRandomCenterWord(locale).then(setCenterWord);
    }
  }, [locale, centerWord, isHydrated]);

  const initializeGameGrid = (
    centerWord: string,
    setGameGrid: (grid: GameGrid) => void,
    setUsedWords: (words: Set<string>) => void,
  ) => {
    if (centerWord) {
      const grid: GameGrid = Array(5)
        .fill(null)
        .map(() => Array(5).fill(null));
      const letters = centerWord.split("");
      letters.forEach((letter, index) => (grid[2][index] = letter));
      setGameGrid(grid);
      setUsedWords(new Set([centerWord]));
    }
  };

  const handleLanguageChange = async (newLocale: string) => {
    const newCenterWord = await getRandomCenterWord(newLocale);
    setCenterWord(newCenterWord);
    onReset();
  };

  return {
    centerWord,
    isClientMounted,
    setCenterWord,
    initializeGameGrid,
    handleLanguageChange,
  };
}