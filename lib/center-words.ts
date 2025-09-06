export const CENTER_WORDS: string[] = [
  "БАЛДА",
  "КНИГА",
  "СУМКА",
  "ЛАМПА",
  "РОБОТ",
  "ПЛИТА",
  "СТОЛБ",
  "ДВЕРЬ",
  "ОКЕАН",
  "МУЗЕЙ",
  "ПЕСНЯ",
  "ВЕТЕР",
  "МЕДИК",
  "ЗАВОД",
  "ГОРОД",
  "ПАРОМ",
  "ПАЛЕЦ",
  "НОСОК",
  "ПОВАР",
  "САХАР",
  "МОЛОТ",
  "МОРЯК",
  "ВОРОН",
  "АКУЛА",
  "БЕРЕГ",
  "НОЖИК",
  "МЕТРО",
  "ПОЛКА",
  "СЦЕНА",
  "ЛИМОН",
];

export function getRandomCenterWord(): string {
  const idx = Math.floor(Math.random() * CENTER_WORDS.length);
  return CENTER_WORDS[idx];
}
