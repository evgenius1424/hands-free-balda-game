import { describe, it, expect, beforeEach } from "vitest";
import {
  findWordPlacements,
  validateWord,
  BaldaGame,
  type WordPlacement,
} from "../word-validator";

describe("findWordPlacements", () => {
  let grid: (string | null)[][];

  beforeEach(() => {
    // Create a simple 5x5 grid with "HELLO" in the middle row
    grid = [
      [null, null, null, null, null],
      [null, null, null, null, null],
      ["H", "E", "L", "L", "O"],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ];
  });

  describe("basic functionality", () => {
    it("should return empty array for invalid inputs", () => {
      expect(findWordPlacements("", grid)).toEqual([]);
      expect(findWordPlacements("WORD", [])).toEqual([]);
      expect(findWordPlacements("WORD", [[]])).toEqual([]);
    });

    it("should return empty array for invalid words", () => {
      expect(findWordPlacements("A", grid)).toEqual([]); // too short
      expect(findWordPlacements("123", grid)).toEqual([]); // invalid characters
      expect(findWordPlacements("WORD WITH SPACES", grid)).toEqual([]); // spaces
    });

    it("should find valid word placements", () => {
      // Test placing "HELL" by using existing letters H-E-L-L
      const placements = findWordPlacements("HELL", grid);

      expect(placements.length).toBeGreaterThan(0);

      // Check that each placement has the required properties
      placements.forEach((placement: WordPlacement) => {
        expect(placement).toHaveProperty("word");
        expect(placement).toHaveProperty("newLetterPos");
        expect(placement).toHaveProperty("newLetter");
        expect(placement).toHaveProperty("path");
        expect(placement.word).toBe("HELL");
        expect(placement.path).toHaveLength(4); // 4 letters in "HELL"
      });
    });
  });

  describe("word placement logic", () => {
    it("should find placements for words that can be formed by adding one letter", () => {
      // Create a grid with just "CAT" horizontally
      const catGrid = [
        [null, null, null],
        ["C", "A", "T"],
        [null, null, null],
      ];

      // Try to place "CATS" - should find placement by adding 'S' at the end
      const placements = findWordPlacements("CATS", catGrid);

      expect(placements.length).toBeGreaterThan(0);

      // At least one placement should add 'S'
      const sPlacement = placements.find((p) => p.newLetter === "S");
      expect(sPlacement).toBeDefined();
      expect(sPlacement?.word).toBe("CATS");
    });

    it("should respect grid boundaries", () => {
      // Create a 3x3 grid
      const smallGrid = [
        ["A", "B", "C"],
        ["D", "E", "F"],
        ["G", "H", "I"],
      ];

      const placements = findWordPlacements("TEST", smallGrid);

      // All placements should have valid coordinates
      placements.forEach((placement: WordPlacement) => {
        expect(placement.newLetterPos.r).toBeGreaterThanOrEqual(0);
        expect(placement.newLetterPos.r).toBeLessThan(3);
        expect(placement.newLetterPos.c).toBeGreaterThanOrEqual(0);
        expect(placement.newLetterPos.c).toBeLessThan(3);

        placement.path.forEach((cell) => {
          expect(cell.r).toBeGreaterThanOrEqual(0);
          expect(cell.r).toBeLessThan(3);
          expect(cell.c).toBeGreaterThanOrEqual(0);
          expect(cell.c).toBeLessThan(3);
        });
      });
    });

    it("should only place letters in empty cells", () => {
      const placements = findWordPlacements("HELLO", grid);

      placements.forEach((placement: WordPlacement) => {
        const { r, c } = placement.newLetterPos;
        // The new letter position should be null in the original grid
        expect(grid[r][c]).toBeNull();
      });
    });
  });

  describe("path validation", () => {
    it("should create valid paths between adjacent cells", () => {
      const placements = findWordPlacements("HE", grid);

      placements.forEach((placement: WordPlacement) => {
        const path = placement.path;
        expect(path.length).toBe(2); // "HE" has 2 letters

        // Check that consecutive cells in path are adjacent
        for (let i = 0; i < path.length - 1; i++) {
          const current = path[i];
          const next = path[i + 1];

          const rowDiff = Math.abs(current.r - next.r);
          const colDiff = Math.abs(current.c - next.c);

          // Cells should be adjacent (horizontally or vertically)
          expect(
            (rowDiff === 1 && colDiff === 0) ||
              (rowDiff === 0 && colDiff === 1),
          ).toBe(true);
        }
      });
    });

    it("should include the new letter position in the path", () => {
      const placements = findWordPlacements("HELP", grid);

      placements.forEach((placement: WordPlacement) => {
        const newLetterPos = placement.newLetterPos;
        const pathIncludesNewPos = placement.path.some(
          (cell) => cell.r === newLetterPos.r && cell.c === newLetterPos.c,
        );
        expect(pathIncludesNewPos).toBe(true);
      });
    });
  });

  describe("case insensitivity", () => {
    it("should handle lowercase input", () => {
      const uppercasePlacements = findWordPlacements("HELLO", grid);
      const lowercasePlacements = findWordPlacements("hello", grid);

      expect(lowercasePlacements).toEqual(uppercasePlacements);
    });

    it("should normalize word in placement result", () => {
      const placements = findWordPlacements("hello", grid);

      placements.forEach((placement: WordPlacement) => {
        expect(placement.word).toBe("HELLO");
        expect(placement.newLetter).toMatch(/^[A-Z]$/);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle grids with no empty cells", () => {
      const fullGrid = [
        ["A", "B", "C"],
        ["D", "E", "F"],
        ["G", "H", "I"],
      ];

      const placements = findWordPlacements("TEST", fullGrid);
      expect(placements).toEqual([]);
    });

    it("should handle single-row grids", () => {
      const singleRowGrid = [["A", "B", null, "D"]];

      const placements = findWordPlacements("ABC", singleRowGrid);

      // Should be able to find placements even in a single row
      expect(Array.isArray(placements)).toBe(true);
    });

    it("should handle single-column grids", () => {
      const singleColGrid = [["A"], ["B"], [null], ["D"]];

      const placements = findWordPlacements("ABC", singleColGrid);

      expect(Array.isArray(placements)).toBe(true);
    });
  });
});

describe("validateWord", () => {
  it("should validate correct words", () => {
    expect(validateWord("HELLO")).toBe(true);
    expect(validateWord("TEST")).toBe(true);
    expect(validateWord("AB")).toBe(true); // minimum length
  });

  it("should reject invalid words", () => {
    expect(validateWord("")).toBe(false);
    expect(validateWord("A")).toBe(false); // too short
    expect(validateWord("123")).toBe(false); // numbers
    expect(validateWord("HELLO123")).toBe(false); // mixed
    expect(validateWord("HELLO WORLD")).toBe(false); // spaces
  });

  it("should handle case insensitivity", () => {
    expect(validateWord("hello")).toBe(true);
    expect(validateWord("HeLLo")).toBe(true);
  });

  it("should handle whitespace", () => {
    expect(validateWord("  HELLO  ")).toBe(true);
    expect(validateWord("   ")).toBe(false);
  });
});

describe("BaldaGame integration", () => {
  it("should create a valid game instance", () => {
    const game = new BaldaGame("HELLO");

    expect(game.board).toBeDefined();
    expect(game.board.length).toBe(5); // default size
    expect(game.startWord).toBe("HELLO");
    expect(game.usedWords.has("HELLO")).toBe(true);
  });

  it("should place start word in the middle row", () => {
    const game = new BaldaGame("HELLO", 5);

    const middleRow = game.board[2];
    expect(middleRow[0]).toBe("H");
    expect(middleRow[1]).toBe("E");
    expect(middleRow[2]).toBe("L");
    expect(middleRow[3]).toBe("L");
    expect(middleRow[4]).toBe("O");
  });

  it("should find placements in a real game scenario", () => {
    const game = new BaldaGame("WORD", 5);

    // Try to find placements for a word that extends the existing word
    const placements = findWordPlacements("WORDS", game.board);

    expect(Array.isArray(placements)).toBe(true);
    // Should find at least one placement for adding 'S' to make "WORDS"
    const hasValidPlacement = placements.some(
      (p) => p.word === "WORDS" && p.newLetter === "S",
    );
    expect(hasValidPlacement).toBe(true);
  });
});
