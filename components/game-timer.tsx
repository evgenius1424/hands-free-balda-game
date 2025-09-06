"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  timeLeft: number;
  isActive: boolean;
  onTimerEnd: () => void;
  onStart: () => void;
}

export function GameTimer({
  timeLeft,
  isActive,
  onTimerEnd,
  onStart,
}: GameTimerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft <= 30;
  const isCriticalTime = timeLeft <= 10;

  return (
    <Card className="inline-block p-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "text-6xl font-bold transition-colors duration-300",
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
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {isActive ? "Пауза" : "Старт"}
        </Button>
      </div>

      <div className="text-center mt-2 text-sm text-muted-foreground">
        {isActive ? "Время хода" : "Нажмите старт для начала игры"}
      </div>
    </Card>
  );
}
