export interface Cell {
  r: number;
  c: number;
}

export interface WordPlacement {
  word: string;
  newLetterPos: Cell;
  newLetter: string;
  path: Cell[];
}

import type { Locale } from "./language-config";
import { transformWord, validateWordForLanguage } from "./language-config";

/**
 * Legacy validation function - now delegates to language-aware validation
 * @deprecated Use validateWordForLanguage or useWordProcessor hook instead
 */
export function validateWord(word: string): boolean {
  if (!word) return false;
  const trimmed = word.toUpperCase().trim();
  if (trimmed.length < 2) return false;
  // Fallback to basic validation for backward compatibility
  return /^[А-ЯA-Z]+$/.test(trimmed);
}

/**
 * Validate and transform word according to language rules
 */
export function processWordForLanguage(
  word: string,
  locale: Locale,
): {
  originalWord: string;
  transformedWord: string;
  isValid: boolean;
} {
  const transformedWord = transformWord(word, locale);
  const isValid = validateWordForLanguage(word, locale);

  return {
    originalWord: word,
    transformedWord,
    isValid,
  };
}

export function findWordPlacements(
  word: string,
  grid: (string | null)[][],
): WordPlacement[] {
  const placements: WordPlacement[] = [];

  if (!word || grid.length === 0 || grid[0].length === 0) return placements;

  const upperWord = BaldaGame._normalize(word);
  // Note: For language-aware processing, use processWordForLanguage instead
  if (!validateWord(upperWord)) return placements;

  const R = grid.length;
  const C = grid[0].length;

  const tempBoard = grid.map((row) => [...row]);

  const emptyCells: Cell[] = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }

  const seenPlacements = new Set<string>();

  for (const placedCell of emptyCells) {
    for (let index = 0; index < upperWord.length; index++) {
      const placedLetter = upperWord[index];
      const key = `${placedCell.r},${placedCell.c},${index}`;
      if (seenPlacements.has(key)) continue;
      seenPlacements.add(key);

      tempBoard[placedCell.r][placedCell.c] = placedLetter;

      const path = findPath(upperWord, tempBoard, placedCell, index);
      tempBoard[placedCell.r][placedCell.c] = null;

      if (path) {
        placements.push({
          word: upperWord,
          newLetterPos: { r: placedCell.r, c: placedCell.c },
          newLetter: placedLetter,
          path,
        });
      }
    }
  }

  return placements;
}

function findPath(
  word: string,
  board: (string | null)[][],
  designatedCell: Cell,
  designatedIndex: number,
): Cell[] | null {
  const R = board.length;
  const C = board[0].length;
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  const visited: boolean[][] = Array.from({ length: R }, () =>
    Array<boolean>(C).fill(false),
  );

  const path: Cell[] = [];

  const inBounds = (r: number, c: number) => r >= 0 && r < R && c >= 0 && c < C;

  function dfs(posIndex: number, r: number, c: number): boolean {
    if (!inBounds(r, c) || visited[r][c]) return false;

    const boardLetter = board[r][c];
    if (boardLetter !== word[posIndex]) return false;

    if (r === designatedCell.r && c === designatedCell.c) {
      if (posIndex !== designatedIndex) return false;
    } else {
      if (posIndex === designatedIndex) return false;
    }

    visited[r][c] = true;
    path.push({ r, c });

    if (posIndex === word.length - 1) {
      if (path.length === word.length) return true;
    } else {
      for (let t = 0; t < 4; t++) {
        const nr = r + dr[t];
        const nc = c + dc[t];
        if (dfs(posIndex + 1, nr, nc)) return true;
      }
    }

    visited[r][c] = false;
    path.pop();
    return false;
  }

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (board[r][c] === word[0]) {
        for (let i = 0; i < R; i++) visited[i].fill(false);
        path.length = 0;
        if (dfs(0, r, c)) {
          return path.map((p) => ({ r: p.r, c: p.c }));
        }
      }
    }
  }

  return null;
}

export function applyWordPlacement(
  grid: (string | null)[][],
  placement: WordPlacement,
): (string | null)[][] {
  const newGrid = grid.map((row) => [...row]);
  newGrid[placement.newLetterPos.r][placement.newLetterPos.c] =
    placement.newLetter;
  return newGrid;
}

export class BaldaGame {
  public board: (string | null)[][];
  public usedWords: Set<string>;
  public startWord: string;

  constructor(startWord: string, size = 5) {
    if (!startWord) {
      throw new Error("startWord must be a non-empty string");
    }
    const normalizedStartWord = BaldaGame._normalize(startWord);
    if (size < normalizedStartWord.length || size % 2 === 0) {
      throw new Error("size must be odd and >= startWord.length");
    }

    this.board = Array.from({ length: size }, () =>
      Array<string | null>(size).fill(null),
    );
    this.usedWords = new Set<string>();
    this.startWord = normalizedStartWord;

    this._placeStartWordInMiddle();
    this.usedWords.add(normalizedStartWord);
  }

  private _placeStartWordInMiddle(): void {
    const row = Math.floor(this.board.length / 2);
    const startOffset = Math.floor(
      (this.board.length - this.startWord.length) / 2,
    );
    for (let i = 0; i < this.startWord.length; i++) {
      this.board[row][startOffset + i] = this.startWord[i];
    }
  }

  public static _normalize(s: string): string {
    if (!s) return s;
    return s.toUpperCase().trim();
  }

  public boardToString(): string {
    return this.board
      .map((row) => row.map((ch) => ch || ".").join(" "))
      .join("\n");
  }
}
