"use client"

import { useState } from "react"
import { GameBoard } from "@/components/game-board"
import { TeamPanel } from "@/components/team-panel"
import { GameTimer } from "@/components/game-timer"
import { SpeechRecognition } from "@/components/speech-recognition"
import { WordPlacementDisplay } from "@/components/word-placement-display"
import { Card } from "@/components/ui/card"
import { validateRussianNoun, findWordPlacements, applyWordPlacement, type WordPlacement } from "@/lib/word-validator"

export default function BaldaGame() {
  const [gameGrid, setGameGrid] = useState<(string | null)[][]>(() => {
    // Initialize 5x5 grid with center word "БАЛДА"
    const grid = Array(5)
      .fill(null)
      .map(() => Array(5).fill(null))
    const centerWord = ["Б", "А", "Л", "Д", "А"]
    centerWord.forEach((letter, index) => {
      grid[2][index] = letter // Place in middle row
    })
    return grid
  })

  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1)
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 })
  const [teamNames, setTeamNames] = useState({ team1: "Команда 1", team2: "Команда 2" })
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes in seconds
  const [isGameActive, setIsGameActive] = useState(false)

  const [currentWord, setCurrentWord] = useState("")
  const [isWordValid, setIsWordValid] = useState(false)
  const [wordPlacements, setWordPlacements] = useState<WordPlacement[]>([])
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set(["БАЛДА"]))

  const handleCellClick = (row: number, col: number) => {
    console.log(`[v0] Cell clicked: ${row}, ${col}`)
    // TODO: Handle cell selection for word placement
  }

  const handleTimerEnd = () => {
    console.log(`[v0] Timer ended for team ${currentTeam}`)
    // Clear current word attempt
    setCurrentWord("")
    setWordPlacements([])
    // Switch to other team
    setCurrentTeam(currentTeam === 1 ? 2 : 1)
    setTimeLeft(120) // Reset timer
  }

  const startGame = () => {
    setIsGameActive(true)
    setTimeLeft(120)
  }

  const handleWordDetected = (word: string, fullText: string) => {
    console.log(`[v0] Word detected: ${word}, Full text: ${fullText}`)

    const upperWord = word.toUpperCase().trim()

    // Check if word was already used
    if (usedWords.has(upperWord)) {
      console.log(`[v0] Word already used: ${upperWord}`)
      return
    }

    // Validate the word
    const isValid = validateRussianNoun(upperWord)
    setIsWordValid(isValid)
    setCurrentWord(upperWord)

    if (isValid) {
      // Find possible placements
      const placements = findWordPlacements(upperWord, gameGrid)
      setWordPlacements(placements)
      console.log(`[v0] Found ${placements.length} possible placements for ${upperWord}`)
    } else {
      setWordPlacements([])
    }
  }

  const handlePlacementSelect = (placement: WordPlacement) => {
    console.log(`[v0] Placing word: ${placement.word}`)

    // Apply the placement to the grid
    const newGrid = applyWordPlacement(gameGrid, placement)
    setGameGrid(newGrid)

    // Update score
    const points = placement.word.length
    if (currentTeam === 1) {
      setTeamScores((prev) => ({ ...prev, team1: prev.team1 + points }))
    } else {
      setTeamScores((prev) => ({ ...prev, team2: prev.team2 + points }))
    }

    // Add word to used words
    setUsedWords((prev) => new Set([...prev, placement.word]))

    // Clear current word and switch turns
    setCurrentWord("")
    setWordPlacements([])
    setCurrentTeam(currentTeam === 1 ? 2 : 1)
    setTimeLeft(120) // Reset timer for next team

    console.log(`[v0] Word placed successfully. Score: ${points} points`)
  }

  const handleWordReject = () => {
    console.log(`[v0] Word rejected: ${currentWord}`)
    setCurrentWord("")
    setWordPlacements([])
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Балда без рук</h1>
          <GameTimer timeLeft={timeLeft} isActive={isGameActive} onTimerEnd={handleTimerEnd} onStart={startGame} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Team 1 Panel */}
          <div className="order-2 lg:order-1">
            <TeamPanel
              teamNumber={1}
              teamName={teamNames.team1}
              score={teamScores.team1}
              isActive={currentTeam === 1}
              onNameChange={(name) => setTeamNames((prev) => ({ ...prev, team1: name }))}
            />
          </div>

          {/* Game Board */}
          <div className="order-1 lg:order-2">
            <Card className="p-6 shadow-lg">
              <GameBoard grid={gameGrid} onCellClick={handleCellClick} isActive={isGameActive} />
            </Card>
          </div>

          {/* Team 2 Panel */}
          <div className="order-3">
            <TeamPanel
              teamNumber={2}
              teamName={teamNames.team2}
              score={teamScores.team2}
              isActive={currentTeam === 2}
              onNameChange={(name) => setTeamNames((prev) => ({ ...prev, team2: name }))}
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <SpeechRecognition
            onWordDetected={handleWordDetected}
            isActive={isGameActive && currentTeam !== null}
            currentTeam={currentTeam}
          />

          {currentWord && (
            <WordPlacementDisplay
              word={currentWord}
              isValid={isWordValid}
              placements={wordPlacements}
              onPlacementSelect={handlePlacementSelect}
              onReject={handleWordReject}
            />
          )}
        </div>

        <div className="mt-8 text-center">
          <Card className="p-4 bg-muted">
            <p className="text-muted-foreground">
              Добавьте одну букву к существующим словам, чтобы создать новое слово. Используйте речевое управление для
              ввода слов. Очки начисляются по длине слова.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
