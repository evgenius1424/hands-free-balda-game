import { getRandomCenterWord } from "@/lib/center-words";
import GameClient from "@/components/game-client";

export default function Page() {
  const centerWord = getRandomCenterWord();
  return <GameClient centerWord={centerWord} />;
}
