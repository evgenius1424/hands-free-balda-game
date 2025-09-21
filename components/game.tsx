"use client";

import { useEffect, useState } from "react";
import { GameBoard } from "@/components/game-board";
import { SpeechRecognition } from "@/components/speech-recognition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  applyWordPlacement,
  findWordPlacements,
  validateWord,
  type WordPlacement,
} from "@/lib/word-validator";
import { getRandomCenterWord } from "@/lib/center-words";
import { GithubIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/language-selector";
import { useIsLandscape } from "@/hooks/use-is-landscape";

export default function Game() {
  const { t, locale, onLanguageChange, isHydrated } = useI18n();
  const [centerWord, setCenterWord] = useState<string>("");
  const [isClientMounted, setIsClientMounted] = useState(false);
  const isLandscape = useIsLandscape();

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Initialize center word based on the current locale after hydration
  useEffect(() => {
    if (!centerWord && isHydrated) {
      setCenterWord(getRandomCenterWord(locale));
    }
  }, [locale, centerWord, isHydrated]);

  useEffect(() => {
    const unsubscribe = onLanguageChange((newLocale) => {
      const newCenterWord = getRandomCenterWord(newLocale);
      setCenterWord(newCenterWord);
      setGameGrid(
        Array(5)
          .fill(null)
          .map(() => Array(5).fill(null)),
      );
      setCurrentTeam(1);
      setTeamScores({ team1: 0, team2: 0 });
      setTimeLeft(120);
      setIsGameActive(false);
      setIsGameOver(false);
      setWinner(null);
      setCurrentWord("");
      setIsWordValid(false);
      setWordPlacements([]);
      setUsedWords(new Set());
    });

    return unsubscribe;
  }, [onLanguageChange]);

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
    if (isGameActive) {
      setIsGameActive(false);
      return;
    }
    setIsGameActive(true);
    setIsGameOver(false);
    setWinner(null);
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
    const numberWords: Record<string, number> =
      locale === "ru"
        ? {
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
          }
        : {
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
    const cancelWords = new Set(
      locale === "ru"
        ? ["ОТМЕНА", "СТОП", "НЕТ", "СБРОС"]
        : ["CANCEL", "STOP", "NO", "RESET"],
    );

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

    const isValid = validateWord(upperWord);
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

  if (!isClientMounted || !isHydrated || !centerWord) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              {t("common.title")}
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div
        className={`${isLandscape ? "w-fit" : "max-w-[1400px]"} mx-auto space-y-6`}
      >
        <div className="relative flex items-center justify-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">
            {t("common.title")}
          </h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <a
              href="https://github.com/evgenius1424/hands-free-balda-game"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("common.openGithub")}
              title={t("common.openGithub")}
            >
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <GithubIcon className="h-5 w-5" />
              </Button>
            </a>
            <LanguageSelector />
          </div>
        </div>

        {!isLandscape && (
          <>
            <Card className="px-3 py-2">
              <div className="flex items-center justify-between gap-3 h-12">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground w-6 h-6 text-xs">
                    1
                  </span>
                  <span className="text-xl font-bold text-primary tabular-nums leading-none">
                    {teamScores.team1}
                  </span>
                  <span
                    className={`${currentTeam === 1 ? "bg-accent animate-pulse" : "bg-muted-foreground/40"} inline-block w-2.5 h-2.5 rounded-full`}
                    aria-label={
                      currentTeam === 1
                        ? t("common.teamTurn", { num: 1 })
                        : t("common.waiting")
                    }
                    title={
                      currentTeam === 1
                        ? t("common.teamTurn", { num: 1 })
                        : t("common.waiting")
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-primary tabular-nums leading-none min-w-[5ch] text-center">
                    {formatTime(timeLeft)}
                  </div>
                  <Button
                    onClick={startGame}
                    size="sm"
                    variant={isGameActive ? "secondary" : "default"}
                    className="h-8 px-3 shrink-0"
                  >
                    {isGameActive ? "II" : "▶"}
                  </Button>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`${currentTeam === 2 ? "bg-accent animate-pulse" : "bg-muted-foreground/40"} inline-block w-2.5 h-2.5 rounded-full`}
                    aria-label={
                      currentTeam === 2
                        ? t("common.teamTurn", { num: 2 })
                        : t("common.waiting")
                    }
                    title={
                      currentTeam === 2
                        ? t("common.teamTurn", { num: 2 })
                        : t("common.waiting")
                    }
                  />
                  <span className="text-xl font-bold text-primary tabular-nums leading-none">
                    {teamScores.team2}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground w-6 h-6 text-xs">
                    2
                  </span>
                </div>
              </div>
            </Card>

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
              />
            </div>
          </>
        )}

        {isLandscape && (
          <div className="flex justify-center items-start gap-6 md:gap-10">
            {/* Left panel: Team 1 + Timer */}
            <div className="flex flex-col gap-4 w-48 md:w-56 lg:w-64">
              <Card className="p-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground w-6 h-6 text-sm">
                      1
                    </span>
                    <span className="text-lg font-semibold">
                      {t("common.teamLabel", { num: 1 })}
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-primary">
                    {teamScores.team1}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      currentTeam === 1
                        ? "bg-accent text-accent-foreground animate-pulse"
                        : "text-muted-foreground"
                    }`}
                  >
                    {currentTeam === 1
                      ? t("common.yourTurn")
                      : t("common.waiting")}
                  </span>
                </div>
              </Card>

              <Card className="px-4 py-2">
                <div className="flex w-full items-center justify-between gap-4 h-12 md:h-14">
                  <div className="text-3xl md:text-4xl font-bold text-primary tabular-nums leading-none">
                    {formatTime(timeLeft)}
                  </div>
                  <Button
                    onClick={startGame}
                    size="default"
                    variant={isGameActive ? "secondary" : "default"}
                    className="flex items-center gap-2 shrink-0 h-10 md:h-11 px-4 md:px-5"
                  >
                    {isGameActive ? t("common.pause") : t("common.start")}
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="p-3 md:p-4 lg:p-6 shadow-lg">
              <GameBoard
                grid={gameGrid}
                isActive={isGameActive}
                placementHints={wordPlacements}
                onHintSelect={handlePlacementSelect}
                centerWord={centerWord}
              />
            </Card>

            <div className="flex flex-col gap-4 w-48 md:w-56 lg:w-64">
              <Card className="p-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground w-6 h-6 text-sm">
                      2
                    </span>
                    <span className="text-lg font-semibold">
                      {t("common.teamLabel", { num: 2 })}
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-primary">
                    {teamScores.team2}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      currentTeam === 2
                        ? "bg-accent text-accent-foreground animate-pulse"
                        : "text-muted-foreground"
                    }`}
                  >
                    {currentTeam === 2
                      ? t("common.yourTurn")
                      : t("common.waiting")}
                  </span>
                </div>
              </Card>

              <SpeechRecognition
                onWordDetected={handleWordDetected}
                isActive={isGameActive && currentTeam !== null}
              />
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <Card className="p-4 bg-muted">
            <p className="text-sm md:text-base text-muted-foreground text-center">
              {t("common.instructions")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
