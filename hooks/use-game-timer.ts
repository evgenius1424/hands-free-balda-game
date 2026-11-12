import { useState, useEffect, useRef } from "react";

export function useGameTimer(
  isGameActive: boolean,
  onTimerEnd: () => void,
  initialTime = 120,
) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const onTimerEndRef = useRef(onTimerEnd);
  onTimerEndRef.current = onTimerEnd;

  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimerEndRef.current();
          return initialTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameActive, initialTime]);

  const resetTimer = () => {
    setTimeLeft(initialTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    timeLeft,
    resetTimer,
    formatTime,
    setTimeLeft,
  };
}