"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { SpeechRecognition } from "@/components/speech-recognition";
import { useI18n } from "@/lib/i18n";
import { useVoiceCommands, useWordProcessor } from "@/hooks/use-language-config";
import { useGameState } from "@/hooks/use-game-state";
import { useGameTimer } from "@/hooks/use-game-timer";
import { useWordPlacement } from "@/hooks/use-word-placement";
import { useGameInitialization } from "@/hooks/use-game-initialization";
import { type WordPlacement } from "@/lib/word-validator";

export default function Game() {
  const { locale, setLocale, isHydrated, onLanguageChange } = useI18n();
  const ru = locale === "ru";
  const { parseNumber, isCancel } = useVoiceCommands();
  const { processWord, processWordWithFilter } = useWordProcessor();
  const { gameState: s, actions: a } = useGameState();
  const { centerWord, isClientMounted, initializeGameGrid, handleLanguageChange, setCenterWord } = useGameInitialization(locale, isHydrated, a.resetGame);
  const { processWordForPlacements, handlePlacementSelect } = useWordPlacement();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [showRules, setShowRules] = useState(false);
  const { timeLeft, resetTimer, formatTime } = useGameTimer(s.isGameActive, () => { a.setCurrentWord(""); a.setWordPlacements([]); a.switchTeam(); setNotice(ru ? "Время вышло. Ход другой команды." : "Time’s up. Next team’s turn."); });
  useEffect(() => initializeGameGrid(centerWord, a.setGameGrid, a.setUsedWords), [centerWord]);
  useEffect(() => onLanguageChange((l) => { handleLanguageChange(l); resetTimer(); setInput(""); setNotice(""); }), [onLanguageChange]);

  function choose(placement: WordPlacement) {
    if (!s.isGameActive) return;
    const ended = handlePlacementSelect(placement, s.gameGrid, a.setGameGrid, (points) => a.checkGameEnd(s.gameGrid.map((row, r) => row.map((cell, c) => r === placement.newLetterPos.r && c === placement.newLetterPos.c ? placement.newLetter : cell)), a.addScore(points)), word => a.setUsedWords(prev => new Set([...prev, word])));
    a.setCurrentWord(""); a.setWordPlacements([]); setInput(""); setNotice(ru ? `«${placement.word}» · +${placement.word.length} очков` : `${placement.word} · +${placement.word.length} points`);
    if (!ended) { a.switchTeam(); resetTimer(); }
  }
  function submitWord(word: string, voice = false) {
    if (!s.isGameActive) return;
    const upper = word.toUpperCase().trim();
    if (isCancel(upper)) { a.setCurrentWord(""); a.setWordPlacements([]); setNotice(""); return; }
    const num = parseNumber(upper);
    if (num !== null && s.wordPlacements.length) { const p = s.wordPlacements[num - 1]; if (p) choose(p); return; }
    const processed = voice ? processWordWithFilter(upper) : processWord(upper);
    if (!processed) return;
    const { transformedWord, isValid } = processed;
    a.setCurrentWord(transformedWord); a.setWordPlacements([]);
    if (s.usedWords.has(transformedWord)) { setNotice(ru ? "Это слово уже было." : "That word has already been used."); return; }
    if (!isValid) { setNotice(ru ? "Введите слово из двух или более букв." : "Enter a word with at least two letters."); return; }
    const placements = processWordForPlacements(transformedWord, s.gameGrid);
    a.setWordPlacements(placements);
    setNotice(placements.length ? (ru ? "Выберите клетку или скажите её номер." : "Choose a tile or say its number.") : (ru ? "Не удалось составить это слово на поле." : "That word can’t be formed on this board."));
  }
  async function newGame() {
    const { getRandomCenterWord } = await import("@/lib/center-words");
    const word = await getRandomCenterWord(locale);
    a.resetGame(); resetTimer(); setInput(""); setNotice("");
    if (word === centerWord) initializeGameGrid(word, a.setGameGrid, a.setUsedWords); else setCenterWord(word);
  }
  if (!isClientMounted || !isHydrated || !centerWord) return <main className="loading">LONGER<span>·</span></main>;
  const hints = new Map<string, { p: WordPlacement; index: number }>();
  s.wordPlacements.forEach((p, index) => { const key = `${p.newLetterPos.r},${p.newLetterPos.c}`; if (!hints.has(key)) hints.set(key, { p, index: index + 1 }); });
  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark">L<span>·</span></div><div><div className="brand-name">{ru ? "БАЛДА" : "LONGER"}</div><div className="brand-sub">{ru ? "ИГРА В СЛОВА" : "THE WORD GAME"}</div></div></div><div className="top-actions"><button className="text-button rules-toggle" onClick={() => setShowRules(!showRules)}>{ru ? "Как играть" : "How to play"}</button><button className="language-button" onClick={() => setLocale(ru ? "en" : "ru")} aria-label={ru ? "Switch to English" : "Переключить на русский"}>{ru ? "RU" : "EN"}<span>⌄</span></button></div></header>
  <section className="intro"><div><div className="eyebrow"><span/> {ru ? "ИГРАЙТЕ ВМЕСТЕ" : "A LITTLE GAME FOR TWO"}</div><h1>{ru ? "Слова становятся длиннее." : <>Good words.<br/><em>Better together.</em></>}</h1><p>{ru ? "Добавьте букву. Найдите слово. Передайте ход." : "Add a letter. Find a word. Pass it on."}</p></div><div className="intro-note"><Sparkles size={16}/><span>{ru ? "Немного времени для игры" : "A little time well spent"}</span></div></section>
  {showRules && <div className="rules"><strong>{ru ? "Как играть" : "How to play"}</strong><p>{ru ? "По очереди называйте слова, добавляя ровно одну букву. Буквы должны соединяться по горизонтали или вертикали, без повторного использования клетки. Выберите вариант на поле или назовите его номер. За каждую букву — очко. Игроки сами решают, существует ли слово." : "Take turns making words by adding exactly one letter. Letters must connect horizontally or vertically, without reusing a tile. Choose a numbered tile or say its number. Score one point per letter. Players decide together whether a word is valid."}</p></div>}
  <div className="game-layout"><section className="board-section"><div className="section-top"><div><div className="section-kicker">{ru ? "ИГРОВОЕ ПОЛЕ" : "THE BOARD"}</div><h2>{ru ? "Найдите следующее слово" : "Find your next word"}</h2></div><button className="icon-button" onClick={newGame} title={ru ? "Новая игра" : "New game"} aria-label={ru ? "Новая игра" : "New game"}><RotateCcw size={18}/></button></div><div className="board-wrap"><div className="board" aria-label={ru ? "Игровое поле" : "Game board"}>{s.gameGrid.map((row,r) => row.map((cell,c) => { const hint = hints.get(`${r},${c}`); return <button key={`${r},${c}`} className={`tile ${cell ? "filled" : ""} ${hint ? "hint" : ""}`} disabled={!s.isGameActive || !hint} onClick={() => hint && choose(hint.p)} aria-label={hint ? `${hint.p.newLetter}, ${hint.index}` : cell || (ru ? "Пустая клетка" : "Empty tile")}>{cell || hint?.p.newLetter || ""}{hint && <span className="hint-number">{hint.index}</span>}</button>; }))}</div></div><div className="board-footer"><span>{ru ? "НАЧАЛЬНОЕ СЛОВО" : "STARTING WORD"} <strong>{centerWord}</strong></span><span>5 × 5</span></div></section>
  <aside className="side-panel"><div className="score-card"><div className="side-heading"><span>{ru ? "СЧЁТ" : "THE SCORE"}</span><span className="round-tag">{ru ? "ИГРА НА ДВОИХ" : "TWO TEAMS"}</span></div><div className="scores"><div className={`team ${s.currentTeam === 1 ? "current" : ""}`}><div className="team-label"><i/>{ru ? "Команда 1" : "Team one"}</div><strong>{s.teamScores.team1}</strong><small>{s.currentTeam === 1 ? (ru ? "ВАШ ХОД" : "YOUR TURN") : "\u00a0"}</small></div><div className="score-divider">:</div><div className={`team ${s.currentTeam === 2 ? "current" : ""}`}><div className="team-label"><i/>{ru ? "Команда 2" : "Team two"}</div><strong>{s.teamScores.team2}</strong><small>{s.currentTeam === 2 ? (ru ? "ВАШ ХОД" : "YOUR TURN") : "\u00a0"}</small></div></div><div className="timer-row"><div><div className="timer-caption">{ru ? "ВРЕМЯ ХОДА" : "TIME REMAINING"}</div><div className="timer">{formatTime(timeLeft)}</div></div><button className="play-button" onClick={() => { if (!s.isGameOver) a.setIsGameActive(!s.isGameActive); }} disabled={s.isGameOver}>{s.isGameActive ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}{s.isGameActive ? (ru ? "Пауза" : "Pause") : (ru ? "Начать" : "Start game")}</button></div></div>
  <div className="input-card"><div className="side-heading"><span>{ru ? "ВАШЕ СЛОВО" : "YOUR NEXT WORD"}</span><span className="number-label">01 / 02</span></div><SpeechRecognition isActive={s.isGameActive} onWordDetected={(word) => submitWord(word, true)}/><div className="input-divider"><span>{ru ? "ИЛИ ВВЕДИТЕ" : "OR TYPE IT IN"}</span></div><form className="word-form" onSubmit={e => {e.preventDefault(); submitWord(input);}}><input value={input} onChange={e => setInput(e.target.value)} placeholder={ru ? "Введите слово..." : "Type a word..."} aria-label={ru ? "Введите слово" : "Enter a word"} disabled={!s.isGameActive}/><button disabled={!s.isGameActive || !input.trim()} aria-label={ru ? "Найти слово" : "Find word"}><ArrowRight size={19}/></button></form><div className="feedback" aria-live="polite">{s.isGameOver ? (s.winner === "draw" ? (ru ? "Ничья!" : "It’s a draw!") : (ru ? `Победила команда ${s.winner}!` : `Team ${s.winner} wins!`)) : notice || (ru ? "Сначала начните игру." : "Start the game when you’re ready.")}</div></div><div className="side-note">✳ <span>{ru ? "Хорошая игра начинается с одного слова." : "A good game starts with a single word."}</span></div></aside></div><footer><span>LONGER <span className="footer-dot">·</span> {ru ? "ИГРАЙТЕ ВМЕСТЕ" : "MADE FOR PLAYING TOGETHER"}</span><button onClick={() => setShowRules(!showRules)}>{ru ? "Правила игры" : "The rules"} ↗</button></footer></main>;
}
