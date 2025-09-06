"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WordPlacement } from "@/lib/word-validator";

interface GameBoardProps {
  grid: (string | null)[][];
  isActive: boolean;
  placementHints?: WordPlacement[];
  onHintSelect?: (placement: WordPlacement) => void;
  centerWord?: string;
}

export function GameBoard({
  grid,
  isActive,
  placementHints = [],
  onHintSelect,
  centerWord,
}: GameBoardProps) {
  const hintMap: Record<string, { index: number; placement: WordPlacement }> =
    {};
  placementHints.forEach((p, i) => {
    const key = `${p.newLetterPos.r},${p.newLetterPos.c}`;
    if (!(key in hintMap)) {
      hintMap[key] = { index: i + 1, placement: p };
    }
  });

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-2xl font-bold text-primary">Игровое поле</h2>

      <div className="grid grid-cols-5 gap-2 p-4 bg-card rounded-lg border-2 border-primary/20">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex},${colIndex}`;
            const hint = hintMap[key];
            const showHint = !cell && hint;
            const content = cell || (showHint ? hint.placement.newLetter : "");
            return (
              <Button
                key={key}
                variant="outline"
                className={cn(
                  "relative w-16 h-16 text-2xl font-bold transition-all duration-200",
                  "hover:bg-primary/10 hover:border-primary/50",
                  cell ? "bg-primary text-primary-foreground" : "bg-background",
                  !isActive && "cursor-not-allowed opacity-50",
                )}
                disabled={!isActive}
                onClick={
                  showHint && onHintSelect
                    ? () => onHintSelect(hint.placement)
                    : undefined
                }
              >
                <span
                  className={cn(
                    showHint && !cell ? "opacity-60" : "",
                    "select-none",
                  )}
                >
                  {content}
                </span>
                {showHint && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shadow">
                    {hint.index}
                  </span>
                )}
              </Button>
            );
          }),
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Сетка 5×5 • Центральное слово: {centerWord || "—"}
      </div>
    </div>
  );
}
