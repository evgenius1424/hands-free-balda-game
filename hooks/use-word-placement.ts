import {
  applyWordPlacement,
  findWordPlacements,
  type WordPlacement,
} from "@/lib/word-validator";
import { selectOptimalPlacements } from "@/lib/optimal-placement-calculation";
import { type GameGrid } from "@/types/game";

export function useWordPlacement() {
  const processWordForPlacements = (
    word: string,
    gameGrid: GameGrid,
  ): WordPlacement[] => {
    const placementsRaw = findWordPlacements(word, gameGrid);
    return selectOptimalPlacements(placementsRaw, gameGrid);
  };

  const handlePlacementSelect = (
    placement: WordPlacement,
    gameGrid: GameGrid,
    onGridUpdate: (grid: GameGrid) => void,
    onScoreUpdate: (points: number) => boolean,
    onWordUsed: (word: string) => void,
  ) => {
    const newGrid = applyWordPlacement(gameGrid, placement);
    const points = placement.word.length;

    onGridUpdate(newGrid);
    const gameEnded = onScoreUpdate(points);
    onWordUsed(placement.word);

    return gameEnded;
  };

  return {
    processWordForPlacements,
    handlePlacementSelect,
  };
}