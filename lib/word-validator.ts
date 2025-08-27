// Basic Russian dictionary of common nouns (simplified for demo)
const RUSSIAN_NOUNS = new Set([
  "БАЛДА",
  "СЛОВО",
  "ИГРА",
  "ДЕЛО",
  "ВРЕМЯ",
  "МЕСТО",
  "РУКА",
  "НОГА",
  "ГОЛОВА",
  "ГЛАЗ",
  "ДЕНЬ",
  "НОЧЬ",
  "УТРО",
  "ВЕЧЕР",
  "ДОРОГА",
  "ДОМА",
  "СТОЛ",
  "СТУЛ",
  "ОКНО",
  "ДВЕРЬ",
  "ВОДА",
  "ОГОНЬ",
  "ЗЕМЛЯ",
  "НЕБО",
  "СОЛНЦЕ",
  "ЛУНА",
  "ЗВЕЗДА",
  "ДЕРЕВО",
  "ЦВЕТОК",
  "ТРАВА",
  "КОШКА",
  "СОБАКА",
  "ПТИЦА",
  "РЫБА",
  "ЧЕЛОВЕК",
  "ДРУГ",
  "СЕМЬЯ",
  "МАМА",
  "ПАПА",
  "ДЕТИ",
  "КНИГА",
  "ШКОЛА",
  "УЧИТЕЛЬ",
  "УРОК",
  "РАБОТА",
  "ДЕНЬГИ",
  "МАГАЗИН",
  "ЕДА",
  "ХЛЕБ",
  "МОЛОКО",
  "МАШИНА",
  "ПОЕЗД",
  "САМОЛЕТ",
  "КОРАБЛЬ",
  "ГОРОД",
  "СЕЛО",
  "УЛИЦА",
  "ПАРК",
  "ТЕАТР",
  "КИНО",
  "МУЗЫКА",
  "ПЕСНЯ",
  "ТАНЕЦ",
  "СПОРТ",
  "ФУТБОЛ",
  "ХОККЕЙ",
  "ТЕННИС",
  "ПЛАВАНИЕ",
  "БЕГ",
  "ПРЫЖОК",
  "ЗИМА",
  "ВЕСНА",
  "ЛЕТО",
  "ОСЕНЬ",
  "СНЕГ",
  "ДОЖДЬ",
  "ВЕТЕР",
  "ТУМАН",
  "РАДУГА",
  "ГРОЗА",
  "КРАСОТА",
  "ЛЮБОВЬ",
  "СЧАСТЬЕ",
  "РАДОСТЬ",
  "ПЕЧАЛЬ",
  "СТРАХ",
  "НАДЕЖДА",
  "МЕЧТА",
  "ЦЕЛЬ",
  "УСПЕХ",
])

// Names and toponyms that should be rejected
const INVALID_WORDS = new Set([
  "МОСКВА",
  "РОССИЯ",
  "ПЕТР",
  "АННА",
  "ИВАН",
  "МАРИЯ",
  "АЛЕКСАНДР",
  "ЕЛЕНА",
  "СЕРГЕЙ",
  "ОЛЬГА",
])

export interface WordPlacement {
  word: string
  startRow: number
  startCol: number
  direction: "horizontal" | "vertical"
  newLetterPos: { row: number; col: number }
  newLetter: string
}

export function validateRussianNoun(word: string): boolean {
  const upperWord = word.toUpperCase().trim()

  // Check if it's a valid Russian noun and not a name/toponym
  if (INVALID_WORDS.has(upperWord)) {
    return false
  }

  // For demo purposes, accept words from our dictionary or words that look like Russian nouns
  if (RUSSIAN_NOUNS.has(upperWord)) {
    return true
  }

  // Basic check for Russian characters and reasonable length
  const russianPattern = /^[А-Я]+$/
  return russianPattern.test(upperWord) && upperWord.length >= 3 && upperWord.length <= 10
}

export function findWordPlacements(word: string, grid: (string | null)[][]): WordPlacement[] {
  const placements: WordPlacement[] = []
  const upperWord = word.toUpperCase()
  const rows = grid.length
  const cols = grid[0].length

  // Try horizontal placements
  for (let row = 0; row < rows; row++) {
    for (let startCol = 0; startCol <= cols - upperWord.length; startCol++) {
      const placement = checkHorizontalPlacement(upperWord, grid, row, startCol)
      if (placement) {
        placements.push(placement)
      }
    }
  }

  // Try vertical placements
  for (let col = 0; col < cols; col++) {
    for (let startRow = 0; startRow <= rows - upperWord.length; startRow++) {
      const placement = checkVerticalPlacement(upperWord, grid, startRow, col)
      if (placement) {
        placements.push(placement)
      }
    }
  }

  return placements
}

function checkHorizontalPlacement(
  word: string,
  grid: (string | null)[][],
  row: number,
  startCol: number,
): WordPlacement | null {
  let emptyCount = 0
  let newLetterPos: { row: number; col: number } | null = null
  let hasExistingLetter = false

  // Check each position in the word
  for (let i = 0; i < word.length; i++) {
    const col = startCol + i
    const gridCell = grid[row][col]
    const wordLetter = word[i]

    if (gridCell === null) {
      emptyCount++
      if (emptyCount > 1) {
        return null // Can only add one letter
      }
      newLetterPos = { row, col }
    } else if (gridCell === wordLetter) {
      hasExistingLetter = true
    } else {
      return null // Letter mismatch
    }
  }

  // Must add exactly one letter and use at least one existing letter
  if (emptyCount === 1 && hasExistingLetter && newLetterPos) {
    return {
      word,
      startRow: row,
      startCol,
      direction: "horizontal",
      newLetterPos,
      newLetter: word[newLetterPos.col - startCol],
    }
  }

  return null
}

function checkVerticalPlacement(
  word: string,
  grid: (string | null)[][],
  startRow: number,
  col: number,
): WordPlacement | null {
  let emptyCount = 0
  let newLetterPos: { row: number; col: number } | null = null
  let hasExistingLetter = false

  // Check each position in the word
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i
    const gridCell = grid[row][col]
    const wordLetter = word[i]

    if (gridCell === null) {
      emptyCount++
      if (emptyCount > 1) {
        return null // Can only add one letter
      }
      newLetterPos = { row, col }
    } else if (gridCell === wordLetter) {
      hasExistingLetter = true
    } else {
      return null // Letter mismatch
    }
  }

  // Must add exactly one letter and use at least one existing letter
  if (emptyCount === 1 && hasExistingLetter && newLetterPos) {
    return {
      word,
      startRow,
      startCol: col,
      direction: "vertical",
      newLetterPos,
      newLetter: word[newLetterPos.row - startRow],
    }
  }

  return null
}

export function applyWordPlacement(grid: (string | null)[][], placement: WordPlacement): (string | null)[][] {
  const newGrid = grid.map((row) => [...row])

  // Place the new letter
  newGrid[placement.newLetterPos.row][placement.newLetterPos.col] = placement.newLetter

  return newGrid
}
