import { WordPlacement } from "@/lib/word-validator";

/**
 * Choose optimal placements when multiple words compete for the same grid cell.
 */
export function selectOptimalPlacements(
  placements: WordPlacement[],
  grid: (string | null)[][],
): WordPlacement[] {
  const letterCounts = countLettersOnBoard(grid);
  const placementsByPosition = groupPlacementsByPosition(placements);
  const optimalPlacements: WordPlacement[] = [];

  for (const [, positionPlacements] of placementsByPosition) {
    if (positionPlacements.length === 1) {
      optimalPlacements.push(positionPlacements[0]);
    } else {
      optimalPlacements.push(
        selectBestPlacement(positionPlacements, letterCounts, grid),
      );
    }
  }

  return optimalPlacements;
}

/** Count frequency of each letter on the board. */
function countLettersOnBoard(grid: (string | null)[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell) counts.set(cell, (counts.get(cell) || 0) + 1);
    }
  }
  return counts;
}

/** Group placements by the grid cell they target. */
function groupPlacementsByPosition(
  placements: WordPlacement[],
): Map<string, WordPlacement[]> {
  const grouped = new Map<string, WordPlacement[]>();
  for (const placement of placements) {
    const key = `${placement.newLetterPos.r},${placement.newLetterPos.c}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(placement);
  }
  return grouped;
}

/** Select the highest scoring placement for a single cell. */
function selectBestPlacement(
  positionPlacements: WordPlacement[],
  letterCounts: Map<string, number>,
  grid: (string | null)[][],
): WordPlacement {
  let best = positionPlacements[0];
  let bestScore = calculatePlacementScore(best, letterCounts, grid);

  for (let i = 1; i < positionPlacements.length; i++) {
    const p = positionPlacements[i];
    const score = calculatePlacementScore(p, letterCounts, grid);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function calculatePlacementScore(
  placement: WordPlacement,
  letterCounts: Map<string, number>,
  grid: (string | null)[][],
): number {
  const letter = placement.newLetter;
  const frequency = letterCounts.get(letter) || 0;

  const localRedundancy = calculateLocalRedundancy(placement, grid);

  const rarityScore = frequency > 0 ? Math.max(0, 5 - frequency) : 3;

  return rarityScore - localRedundancy * 4;
}

/** Penalize placing identical letters too close together. */
function calculateLocalRedundancy(
  placement: WordPlacement,
  grid: (string | null)[][],
): number {
  const { r, c } = placement.newLetterPos;
  const letter = placement.newLetter;
  let redundancy = 0;

  const radius = 3;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
        if (grid[nr][nc] === letter) {
          const dist = Math.abs(dr) + Math.abs(dc);
          if (dist === 1) redundancy += 5;
          else if (dist === 2) redundancy += 2;
          else if (dist === 3) redundancy += 0.8;
        }
      }
    }
  }
  return redundancy;
}
