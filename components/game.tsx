"use client";

import { useEffect } from "react";
import { GameBoard } from "@/components/game-board";
import { SpeechRecognition } from "@/components/speech-recognition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type WordPlacement } from "@/lib/word-validator";
import { GithubIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/language-selector";
import { useIsLandscape } from "@/hooks/use-is-landscape";
import {
  useVoiceCommands,
  useWordProcessor,
} from "@/hooks/use-language-config";
import { useGameState } from "@/hooks/use-game-state";
import { useGameTimer } from "@/hooks/use-game-timer";
import { useWordPlacement } from "@/hooks/use-word-placement";
import { useGameInitialization } from "@/hooks/use-game-initialization";

export default function Game() {
  const { t, locale, onLanguageChange, isHydrated } = useI18n();
  const { parseNumber, isCancel } = useVoiceCommands();
  const { processWordWithFilter } = useWordProcessor();
  const isLandscape = useIsLandscape();

  const { gameState, actions } = useGameState();
  const {
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
  } = gameState;

  const {
    setGameGrid,
    setCurrentTeam,
    setIsGameActive,
    setCurrentWord,
    setIsWordValid,
    setWordPlacements,
    setUsedWords,
    resetGame,
    switchTeam,
    addScore,
    checkGameEnd,
  } = actions;

  const {
    centerWord,
    isClientMounted,
    initializeGameGrid,
    handleLanguageChange,
  } = useGameInitialization(locale, isHydrated, resetGame);

  const { processWordForPlacements, handlePlacementSelect } =
    useWordPlacement();

  const handleTimerEnd = () => {
    setCurrentWord("");
    setWordPlacements([]);
    switchTeam();
  };

  const { timeLeft, resetTimer, formatTime } = useGameTimer(
    isGameActive,
    handleTimerEnd,
  );

  useEffect(
    () => initializeGameGrid(centerWord, setGameGrid, setUsedWords),
    [centerWord],
  );

  useEffect(() => onLanguageChange(handleLanguageChange), [onLanguageChange]);

  const startGame = () => {
    if (isGameActive) {
      setIsGameActive(false);
      return;
    }
    setIsGameActive(true);
    actions.setIsGameOver(false);
    actions.setWinner(null);
  };

  const handleWordDetected = (word: string) => {
    const upperWord = word.toUpperCase().trim();

    if (isCancel(upperWord)) {
      handleWordReject();
      return;
    }

    const numberValue = parseNumber(upperWord);

    if (numberValue !== null && wordPlacements.length > 0 && currentWord) {
      const idx = numberValue - 1; // convert to 0-based (ignoring 0)
      if (idx >= 0 && idx < wordPlacements.length) {
        const placement = wordPlacements[idx];
        if (placement.word === currentWord) {
          handlePlacementSelectWrapper(placement);
        }
        return;
      }
    }

    // Process word with filtering - ignore common words like "ДА"
    const processedWord = processWordWithFilter(upperWord);
    if (!processedWord) {
      // Word was filtered out, ignore it silently
      return;
    }

    const { transformedWord, isValid } = processedWord;

    if (usedWords.has(transformedWord)) {
      return;
    }

    setIsWordValid(isValid);

    // Clear previous placements immediately when processing a new word
    setWordPlacements([]);
    setCurrentWord(transformedWord);

    if (isValid) {
      const placements = processWordForPlacements(transformedWord, gameGrid);
      setWordPlacements(placements);
    }
  };

  const handlePlacementSelectWrapper = (placement: WordPlacement) => {
    const gameEnded = handlePlacementSelect(
      placement,
      gameGrid,
      setGameGrid,
      (points: number) => {
        const newScores = addScore(points);
        return checkGameEnd(gameGrid, newScores);
      },
      (word) => setUsedWords((prev) => new Set([...prev, word])),
    );

    setCurrentWord("");
    setWordPlacements([]);

    if (!gameEnded) {
      switchTeam();
      resetTimer();
    }
  };

  const handleWordReject = () => {
    setCurrentWord("");
    setWordPlacements([]);
  };

  const headerComponent = (
    <div className="relative flex items-center justify-start sm:justify-center mb-4">
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
  );

  if (!isClientMounted || !isHydrated || !centerWord) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {isHydrated && (
            <div className="relative flex items-center justify-start sm:justify-center mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-primary">
                {t("common.title")}
              </h1>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div
        className={`${isLandscape ? "w-fit" : "max-w-[1400px]"} mx-auto space-y-6`}
      >
        {headerComponent}

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
                  onHintSelect={handlePlacementSelectWrapper}
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
                onHintSelect={handlePlacementSelectWrapper}
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
