"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface GamePanelProps {
  team1Score: number;
  team2Score: number;
  currentTeam: 1 | 2;
  timeLeft: number;
  isActive: boolean;
  onTimerEnd: () => void;
  onStart: () => void;
}

export function GamePanel({
  team1Score,
  team2Score,
  currentTeam,
  timeLeft,
  isActive,
  onTimerEnd,
  onStart,
}: GamePanelProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft <= 30;
  const isCriticalTime = timeLeft <= 10;

  return (
    <Card className="w-full p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={currentTeam === 1 ? "default" : "secondary"}
              className="text-sm px-2 py-1"
            >
              1
            </Badge>
            <span className="text-lg font-semibold">Команда 1</span>
          </div>
          <div className="text-3xl md:text-4xl font-bold text-primary">
            {team1Score}
          </div>
          <Badge
            variant={currentTeam === 1 ? "default" : "outline"}
            className={cn(
              "text-xs",
              currentTeam === 1
                ? "bg-accent text-accent-foreground animate-pulse"
                : "",
            )}
          >
            {currentTeam === 1 ? "Ваш ход" : "Ожидание"}
          </Badge>
        </div>

        <div className="flex flex-col items-center space-y-3 order-first md:order-none">
          <div
            className={cn(
              "text-4xl md:text-6xl font-bold transition-colors duration-300 text-center",
              isCriticalTime
                ? "text-destructive animate-pulse"
                : isLowTime
                  ? "text-accent"
                  : "text-primary",
            )}
          >
            {formatTime(timeLeft)}
          </div>

          <Button
            onClick={onStart}
            size="lg"
            variant={isActive ? "secondary" : "default"}
            className="flex items-center gap-2"
          >
            {isActive ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5" />
            )}
            {isActive ? "Пауза" : "Старт"}
          </Button>

          <div className="text-center text-xs md:text-sm text-muted-foreground">
            {isActive ? "Время хода" : "Нажмите старт для начала игры"}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={currentTeam === 2 ? "default" : "secondary"}
              className="text-sm px-2 py-1"
            >
              2
            </Badge>
            <span className="text-lg font-semibold">Команда 2</span>
          </div>
          <div className="text-3xl md:text-4xl font-bold text-primary">
            {team2Score}
          </div>
          <Badge
            variant={currentTeam === 2 ? "default" : "outline"}
            className={cn(
              "text-xs",
              currentTeam === 2
                ? "bg-accent text-accent-foreground animate-pulse"
                : "",
            )}
          >
            {currentTeam === 2 ? "Ваш ход" : "Ожидание"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
