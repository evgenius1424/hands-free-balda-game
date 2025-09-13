"use client";

import { useEffect, useState } from "react";
import { GameBoard } from "@/components/game-board";
import { GamePanel } from "@/components/game-panel";
import { SpeechRecognition } from "@/components/speech-recognition";
import { Card } from "@/components/ui/card";
import {
  validateRussianNoun,
  findWordPlacements,
  applyWordPlacement,
  type WordPlacement,
} from "@/lib/word-validator";
import { getRandomCenterWord } from "@/lib/center-words";

export default function BaldaGame() {
  const [centerWord, setCenterWord] = useState<string>("");
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
    setCenterWord(getRandomCenterWord());
  }, []);

  const [gameGrid, setGameGrid] = useState<(string | null)[][]>(() =>
    Array(5)
      .fill(null)
      .map(() => Array(5).fill(null)),
  );

  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1);
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 });
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | "draw" | null>(null);

  const [currentWord, setCurrentWord] = useState("");
  const [isWordValid, setIsWordValid] = useState(false);
  const [wordPlacements, setWordPlacements] = useState<WordPlacement[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (centerWord) {
      const grid = Array(5)
        .fill(null)
        .map(() => Array(5).fill(null));
      const letters = centerWord.split("");
      letters.forEach((letter, index) => (grid[2][index] = letter));
      setGameGrid(grid);
      setUsedWords(new Set([centerWord]));
    }
  }, [centerWord]);

  const handleTimerEnd = () => {
    console.log(`Timer ended for team ${currentTeam}`);
    setCurrentWord("");
    setWordPlacements([]);
    setCurrentTeam(currentTeam === 1 ? 2 : 1);
  };

  const startGame = () => {
    setIsGameActive(true);
    setIsGameOver(false);
    setWinner(null);
    setTimeLeft(120);
  };

  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimerEnd();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameActive, currentTeam]);

  const handleWordDetected = (word: string, fullText: string) => {
    console.log(`Word detected: ${word}, Full text: ${fullText}`);

    const upperWord = word.toUpperCase().trim();

    // Voice commands for selection/cancel
    const numberWords: Record<string, number> = {
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
    const cancelWords = new Set(["ОТМЕНА", "СТОП", "НЕТ", "СБРОС"]);

    if (cancelWords.has(upperWord)) {
      handleWordReject();
      return;
    }

    if (upperWord in numberWords && wordPlacements.length > 0) {
      const idx = numberWords[upperWord] - 1; // convert to 0-based (ignoring 0)
      if (idx >= 0 && idx < wordPlacements.length) {
        handlePlacementSelect(wordPlacements[idx]);
        return;
      }
    }

    if (usedWords.has(upperWord)) {
      console.log(`Word already used: ${upperWord}`);
      return;
    }

    const isValid = validateRussianNoun(upperWord);
    setIsWordValid(isValid);
    setCurrentWord(upperWord);

    if (isValid) {
      const placementsRaw = findWordPlacements(upperWord, gameGrid);
      const seen = new Set<string>();
      const placements = placementsRaw.filter((p) => {
        const key = `${p.newLetterPos.r},${p.newLetterPos.c},${p.newLetter}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setWordPlacements(placements);
      console.log(
        `Found ${placements.length} possible placements for ${upperWord}`,
      );
    } else {
      setWordPlacements([]);
    }
  };

  const handlePlacementSelect = (placement: WordPlacement) => {
    console.log(`Placing word: ${placement.word}`);

    const newGrid = applyWordPlacement(gameGrid, placement);

    const points = placement.word.length;
    const newScores =
      currentTeam === 1
        ? { ...teamScores, team1: teamScores.team1 + points }
        : { ...teamScores, team2: teamScores.team2 + points };

    setGameGrid(newGrid);
    setTeamScores(newScores);
    setUsedWords((prev) => new Set([...prev, placement.word]));

    setCurrentWord("");
    setWordPlacements([]);

    const isFull = newGrid.every((row) => row.every((cell) => cell !== null));
    if (isFull) {
      setIsGameActive(false);
      setIsGameOver(true);
      if (newScores.team1 > newScores.team2) setWinner(1);
      else if (newScores.team2 > newScores.team1) setWinner(2);
      else setWinner("draw");
      console.log(
        `Game over. Final score Team1 ${newScores.team1} - Team2 ${newScores.team2}`,
      );
      return;
    }

    // Otherwise continue to next team
    setCurrentTeam(currentTeam === 1 ? 2 : 1);
    setTimeLeft(120);

    console.log(`Word placed successfully. Score: ${points} points`);
  };

  const handleWordReject = () => {
    console.log(`Word rejected: ${currentWord}`);
    setCurrentWord("");
    setWordPlacements([]);
  };

  if (!isClientMounted || !centerWord) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Балда без рук
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            Балда без рук
          </h1>
        </div>

        <GamePanel
          team1Score={teamScores.team1}
          team2Score={teamScores.team2}
          currentTeam={currentTeam}
          timeLeft={timeLeft}
          isActive={isGameActive}
          isGameOver={isGameOver}
          winner={winner}
          onTimerEnd={handleTimerEnd}
          onStart={startGame}
        />

        <div className="flex justify-center">
          <Card className="p-4 md:p-6 shadow-lg">
            <GameBoard
              grid={gameGrid}
              isActive={isGameActive}
              placementHints={wordPlacements}
              onHintSelect={handlePlacementSelect}
              centerWord={centerWord}
            />
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <SpeechRecognition
            onWordDetected={handleWordDetected}
            isActive={isGameActive && currentTeam !== null}
            currentTeam={currentTeam}
          />
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-4 bg-muted">
            <p className="text-sm md:text-base text-muted-foreground text-center">
              Добавьте одну букву к существующим словам, чтобы создать новое
              слово. Используйте речевое управление для ввода слов. Очки
              начисляются по длине слова.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
