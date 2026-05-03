export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "determiner"
  | "other";

export interface Example {
  source: string;
  translated?: string;
}

export interface Sense {
  level?: CefrLevel;
  definition: string;
  translation?: string;
  examples: Example[];
  synonyms?: string[];
}

export interface PosSection {
  pos: PartOfSpeech;
  senses: Sense[];
}

export interface LookupResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  sourceLang: string;
  targetLang: string;
  posSections: PosSection[];
  fetchedAt: string;
}

export interface SRSState {
  interval: number;
  ease: number;
  repetitions: number;
  due: string;
  lastReviewedAt?: string;
}

export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface Flashcard {
  word: string;
  sourceLang: string;
  targetLang: string;
  decks: string[];
  lookup: LookupResult;
  srs: SRSState;
  createdAt: string;
  updatedAt: string;
}

export interface VaultConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}
