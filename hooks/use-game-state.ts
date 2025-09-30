import { useState } from "react";
import { type WordPlacement } from "@/lib/word-validator";
import { type GameGrid } from "@/types/game";

export interface GameState {
  gameGrid: GameGrid;
  currentTeam: 1 | 2;
  teamScores: { team1: number; team2: number };
  isGameActive: boolean;
  isGameOver: boolean;
  winner: 1 | 2 | "draw" | null;
  currentWord: string;
  isWordValid: boolean;
  wordPlacements: WordPlacement[];
  usedWords: Set<string>;
}

export function useGameState() {
  const [gameGrid, setGameGrid] = useState<GameGrid>(() =>
    Array(5)
      .fill(null)
      .map(() => Array(5).fill(null)),
  );

  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1);
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 });
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | "draw" | null>(null);
  const [currentWord, setCurrentWord] = useState("");
  const [isWordValid, setIsWordValid] = useState(false);
  const [wordPlacements, setWordPlacements] = useState<WordPlacement[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const resetGame = () => {
    setGameGrid(
      Array(5)
        .fill(null)
        .map(() => Array(5).fill(null)),
    );
    setCurrentTeam(1);
    setTeamScores({ team1: 0, team2: 0 });
    setIsGameActive(false);
    setIsGameOver(false);
    setWinner(null);
    setCurrentWord("");
    setIsWordValid(false);
    setWordPlacements([]);
    setUsedWords(new Set());
  };

  const switchTeam = () => {
    setCurrentTeam(currentTeam === 1 ? 2 : 1);
  };

  const addScore = (points: number) => {
    const newScores =
      currentTeam === 1
        ? { ...teamScores, team1: teamScores.team1 + points }
        : { ...teamScores, team2: teamScores.team2 + points };
    setTeamScores(newScores);
    return newScores;
  };

  const checkGameEnd = (grid: GameGrid, scores: { team1: number; team2: number }) => {
    const isFull = grid.every((row) => row.every((cell) => cell !== null));
    if (isFull) {
      setIsGameActive(false);
      setIsGameOver(true);
      if (scores.team1 > scores.team2) setWinner(1);
      else if (scores.team2 > scores.team1) setWinner(2);
      else setWinner("draw");
      return true;
    }
    return false;
  };

  return {
    gameState: {
      gameGrid,
      currentTeam,
      teamScores,
      isGameActive,
      isGameOver,
      winner,
      currentWord,
      isWordValid,
      wordPlacements,
      usedWords,
    },
    actions: {
      setGameGrid,
      setCurrentTeam,
      setTeamScores,
      setIsGameActive,
      setIsGameOver,
      setWinner,
      setCurrentWord,
      setIsWordValid,
      setWordPlacements,
      setUsedWords,
      resetGame,
      switchTeam,
      addScore,
      checkGameEnd,
    },
  };
}