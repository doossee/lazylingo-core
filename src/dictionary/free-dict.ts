import type { PartOfSpeech, PosSection } from "../types.js";

interface RawDefinition {
  definition: string;
  example?: string;
}
interface RawMeaning {
  partOfSpeech: string;
  definitions: RawDefinition[];
}
interface RawEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: RawMeaning[];
}

export interface FreeDictResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  posSections: PosSection[];
}

const ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const POS_MAP: Record<string, PartOfSpeech> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  preposition: "preposition",
  conjunction: "conjunction",
  interjection: "interjection",
  determiner: "determiner",
};

export async function fetchFreeDict(word: string): Promise<FreeDictResult> {
  const res = await fetch(`${ENDPOINT}${encodeURIComponent(word)}`);
  if (res.status === 404) throw new NotFoundError(word);
  if (!res.ok) throw new Error(`free-dict ${res.status}`);
  const raw = (await res.json()) as RawEntry[];
  if (!Array.isArray(raw) || raw.length === 0) throw new NotFoundError(word);
  const first = raw[0];
  return {
    word: first.word,
    phonetic: first.phonetic,
    posSections: first.meanings.map(normalizeMeaning),
    audioUrl: first.phonetics?.find((p) => p.audio && p.audio.trim().length > 0)?.audio,
  };
}

export class NotFoundError extends Error {
  constructor(word: string) {
    super(`word not found: ${word}`);
    this.name = "NotFoundError";
  }
}

function normalizeMeaning(m: RawMeaning): PosSection {
  return {
    pos: POS_MAP[m.partOfSpeech] ?? "other",
    senses: m.definitions.map((d) => ({
      definition: d.definition,
      examples: d.example ? [{ source: d.example }] : [],
    })),
  };
}
