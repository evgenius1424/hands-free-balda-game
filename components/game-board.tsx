"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WordPlacement } from "@/lib/word-validator";
import { useI18n } from "@/components/i18n";

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

  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-2xl font-bold text-primary">
        {t("common.gameBoard")}
      </h2>

      <div className="grid grid-cols-5 gap-1 p-2 md:gap-2 md:p-4 bg-card rounded-lg border-2 border-primary/20">
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
                  "relative w-12 h-12 text-xl md:w-16 md:h-16 md:text-2xl lg:w-20 lg:h-20 lg:text-3xl xl:w-24 xl:h-24 xl:text-4xl font-bold transition-all duration-200",
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
                    "select-none leading-none",
                  )}
                >
                  {content}
                </span>
                {showHint && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary text-primary-foreground text-[10px] md:text-xs flex items-center justify-center shadow">
                    {hint.index}
                  </span>
                )}
              </Button>
            );
          }),
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {t("common.gridFooter", { word: centerWord || "—" })}
      </div>
    </div>
  );
}
