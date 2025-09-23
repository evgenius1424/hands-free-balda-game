import { WordPlacement } from "@/lib/word-validator";

export function selectOptimalPlacements(
  placements: WordPlacement[],
  grid: (string | null)[][],
): WordPlacement[] {
  const letterCounts = countLettersOnBoard(grid);
  const placementsByPosition = groupPlacementsByPosition(placements);
  const optimalPlacements: WordPlacement[] = [];

  for (const [posKey, positionPlacements] of placementsByPosition) {
    if (positionPlacements.length === 1) {
      optimalPlacements.push(positionPlacements[0]);
    } else {
      const bestPlacement = selectBestPlacement(
        positionPlacements,
        letterCounts,
        grid,
      );
      optimalPlacements.push(bestPlacement);
    }
  }

  return optimalPlacements;
}

function countLettersOnBoard(grid: (string | null)[][]): Map<string, number> {
  const letterCounts = new Map<string, number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        letterCounts.set(cell, (letterCounts.get(cell) || 0) + 1);
      }
    }
  }
  return letterCounts;
}

function groupPlacementsByPosition(
  placements: WordPlacement[],
): Map<string, WordPlacement[]> {
  const placementsByPosition = new Map<string, WordPlacement[]>();
  for (const placement of placements) {
    const posKey = `${placement.newLetterPos.r},${placement.newLetterPos.c}`;
    if (!placementsByPosition.has(posKey)) {
      placementsByPosition.set(posKey, []);
    }
    placementsByPosition.get(posKey)!.push(placement);
  }
  return placementsByPosition;
}

function selectBestPlacement(
  positionPlacements: WordPlacement[],
  letterCounts: Map<string, number>,
  grid: (string | null)[][],
): WordPlacement {
  let bestPlacement = positionPlacements[0];
  let bestScore = calculatePlacementScore(bestPlacement, letterCounts, grid);

  for (let i = 1; i < positionPlacements.length; i++) {
    const placement = positionPlacements[i];
    const score = calculatePlacementScore(placement, letterCounts, grid);
    if (score > bestScore) {
      bestScore = score;
      bestPlacement = placement;
    }
  }

  return bestPlacement;
}

function calculatePlacementScore(
  placement: WordPlacement,
  letterCounts: Map<string, number>,
  grid: (string | null)[][],
): number {
  const letter = placement.newLetter;
  const frequency = letterCounts.get(letter) || 0;
  const futureWordPotential = estimateFutureWordPotential(placement, grid);
  const localRedundancy = calculateLocalRedundancy(placement, grid);

  const frequencyScore = frequency > 0 ? Math.max(0, 5 - frequency) : 3;
  const connectivityBonus = frequency > 0 ? frequency * 1.5 : 0;

  return (
    frequencyScore +
    connectivityBonus -
    localRedundancy * 4 +
    futureWordPotential
  );
}

function estimateFutureWordPotential(
  placement: WordPlacement,
  grid: (string | null)[][],
): number {
  const { r, c } = placement.newLetterPos;
  let adjacentLetters = 0;

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      if (grid[nr][nc]) adjacentLetters++;
    }
  }

  return adjacentLetters;
}

function calculateLocalRedundancy(
  placement: WordPlacement,
  grid: (string | null)[][],
): number {
  const { r, c } = placement.newLetterPos;
  const letter = placement.newLetter;
  let redundancy = 0;

  const checkRadius = 3;
  for (let dr = -checkRadius; dr <= checkRadius; dr++) {
    for (let dc = -checkRadius; dc <= checkRadius; dc++) {
      if (dr === 0 && dc === 0) continue;

      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
        if (grid[nr][nc] === letter) {
          const distance = Math.abs(dr) + Math.abs(dc);

          if (distance === 1) {
            redundancy += 5;
          } else if (distance === 2) {
            redundancy += 2;
          } else if (distance === 3) {
            redundancy += 0.8;
          } else {
            redundancy += 0.3;
          }
        }
      }
    }
  }

  return redundancy;
}
