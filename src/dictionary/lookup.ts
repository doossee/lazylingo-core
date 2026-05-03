import type { LookupResult, PosSection, Sense } from "../types.js";
import { fetchFreeDict } from "./free-dict.js";
import { translate } from "./mymemory.js";

export async function lookup(
  word: string,
  sourceLang: string,
  targetLang: string,
  now: string,
  email?: string,
): Promise<LookupResult> {
  // Branch 1: non-English source — skip Free Dict (English-only API), fall back to MyMemory only.
  if (sourceLang !== "en") {
    const translation = await translate(word, sourceLang, targetLang, email);
    return {
      word,
      sourceLang,
      targetLang,
      fetchedAt: now,
      posSections: [
        {
          pos: "other",
          senses: [{ definition: word, translation, examples: [] }],
        },
      ],
    };
  }

  const dict = await fetchFreeDict(word);

  // Branch 2: English → English — skip MyMemory (no translation needed).
  if (targetLang === "en") {
    return {
      word: dict.word,
      phonetic: dict.phonetic,
      audioUrl: dict.audioUrl,
      sourceLang,
      targetLang,
      posSections: dict.posSections,
      fetchedAt: now,
    };
  }

  // Branch 3: English → other — translate each sense + each example.
  const sections = await Promise.all(
    dict.posSections.map(async (section) => decorateSection(section, sourceLang, targetLang, email)),
  );
  return {
    word: dict.word,
    phonetic: dict.phonetic,
    audioUrl: dict.audioUrl,
    sourceLang,
    targetLang,
    posSections: sections,
    fetchedAt: now,
  };
}

async function decorateSection(
  section: PosSection,
  source: string,
  target: string,
  email?: string,
): Promise<PosSection> {
  const senses = await Promise.all(
    section.senses.map(async (sense) => decorateSense(sense, source, target, email)),
  );
  return { ...section, senses };
}

async function decorateSense(
  sense: Sense,
  source: string,
  target: string,
  email?: string,
): Promise<Sense> {
  const [translation, examples] = await Promise.all([
    translate(sense.definition, source, target, email),
    Promise.all(
      sense.examples.map(async (ex) => ({
        source: ex.source,
        translated: await translate(ex.source, source, target, email),
      })),
    ),
  ]);
  return { ...sense, translation, examples };
}
