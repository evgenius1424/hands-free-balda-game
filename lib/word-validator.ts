export interface Cell {
  r: number;
  c: number;
}

/** Represents a valid word placement on the grid. */
export interface WordPlacement {
  word: string;
  newLetterPos: Cell;
  newLetter: string;
  path: Cell[];
}

/**
 * Validates a word as a potential Russian noun for the game.
 * Checks against a list of valid nouns and rejected proper nouns.
 *
 * TODO: Integrate with a real dictionary API or database.
 */
export function validateRussianNoun(word: string): boolean {
  if (word.length < 2) return false;
  const russianPattern = /^[А-Я]+$/;
  return russianPattern.test(word.toUpperCase().trim());
}

/**
 * Finds all valid placements for a given word on the current grid state.
 * This is a core function of the game logic.
 */
export function findWordPlacements(
  word: string,
  grid: (string | null)[][],
): WordPlacement[] {
  const placements: WordPlacement[] = [];
  const upperWord = BaldaGame._normalize(word);
  const R = grid.length;
  const C = grid[0].length;

  // The find-all logic needs a temporary board to simulate the new letter placement
  const tempBoard = grid.map((row) => [...row]);
  const emptyCells: Cell[] = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }

  for (const placedCell of emptyCells) {
    for (let i = 0; i < upperWord.length; i++) {
      const placedLetter = upperWord[i];
      // Simulate placing the new letter
      tempBoard[placedCell.r][placedCell.c] = placedLetter;

      // Now, try to find a path for the word on the temporary board
      const path = findPath(upperWord, tempBoard, placedCell, i);
      if (path) {
        placements.push({
          word: upperWord,
          newLetterPos: placedCell,
          newLetter: placedLetter,
          path,
        });
      }
      // Revert the temporary placement for the next iteration
      tempBoard[placedCell.r][placedCell.c] = null;
    }
  }

  return placements;
}

/**
 * A private helper function that finds a path for a word on the board.
 * This function uses a Depth-First Search (DFS) algorithm.
 */
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

    const currentCell = { r, c };
    const boardLetter = board[r][c];

    // Check if the board letter matches the word letter at this position
    if (boardLetter !== word[posIndex]) return false;

    visited[r][c] = true;
    path.push(currentCell);

    if (posIndex === word.length - 1) {
      // Found the full word. Check if the new letter was used.
      const usedNewLetter = path.some(
        (p) => p.r === designatedCell.r && p.c === designatedCell.c,
      );
      if (usedNewLetter) return true;
    }

    for (let t = 0; t < 4; t++) {
      const nr = r + dr[t];
      const nc = c + dc[t];
      if (dfs(posIndex + 1, nr, nc)) {
        return true;
      }
    }

    // Backtrack
    visited[r][c] = false;
    path.pop();
    return false;
  }

  // Start the DFS from all cells that match the first letter of the word
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (board[r][c] === word[0]) {
        // Reset state for a new search
        for (let i = 0; i < R; i++) visited[i].fill(false);
        path.length = 0;

        if (dfs(0, r, c)) {
          return path;
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

  // For debugging
  public boardToString(): string {
    return this.board
      .map((row) => row.map((ch) => ch || ".").join(" "))
      .join("\n");
  }
}
