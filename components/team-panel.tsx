"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamPanelProps {
  teamNumber: 1 | 2;
  teamName: string;
  score: number;
  isActive: boolean;
  onNameChange: (name: string) => void;
}

export function TeamPanel({
  teamNumber,
  teamName,
  score,
  isActive,
  onNameChange,
}: TeamPanelProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isActive ? "ring-2 ring-accent shadow-lg scale-105" : "opacity-75",
      )}
    >
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="text-lg px-3 py-1"
          >
            {teamNumber}
          </Badge>
          <span className="text-primary">Команда</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Название команды
          </label>
          <Input
            value={teamName}
            onChange={(e) => onNameChange(e.target.value)}
            className="mt-1"
            placeholder={`Команда ${teamNumber}`}
          />
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">Счёт</div>
          <div className="text-4xl font-bold text-accent">{score}</div>
        </div>

        <div className="text-center">
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn(
              "text-sm",
              isActive ? "bg-accent text-accent-foreground animate-pulse" : "",
            )}
          >
            {isActive ? "Ваш ход" : "Ожидание"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
