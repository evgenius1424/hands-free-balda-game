"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GameBoardProps {
  grid: (string | null)[][];
  onCellClick: (row: number, col: number) => void;
  isActive: boolean;
}

export function GameBoard({ grid, onCellClick, isActive }: GameBoardProps) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-2xl font-bold text-primary">Игровое поле</h2>

      <div className="grid grid-cols-5 gap-2 p-4 bg-card rounded-lg border-2 border-primary/20">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              variant="outline"
              className={cn(
                "w-16 h-16 text-2xl font-bold transition-all duration-200",
                "hover:bg-primary/10 hover:border-primary/50",
                cell ? "bg-primary text-primary-foreground" : "bg-background",
                !isActive && "cursor-not-allowed opacity-50",
              )}
              onClick={() => isActive && onCellClick(rowIndex, colIndex)}
              disabled={!isActive}
            >
              {cell || ""}
            </Button>
          )),
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Сетка 5×5 • Центральное слово: БАЛДА
      </div>
    </div>
  );
}
