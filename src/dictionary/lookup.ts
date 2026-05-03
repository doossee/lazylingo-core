import type { LookupResult, PosSection, Sense } from "../types.js";
import { fetchFreeDict } from "./free-dict.js";
import { translate } from "./mymemory.js";

export async function lookup(
  word: string,
  sourceLang: string,
  targetLang: string,
  now: string,
): Promise<LookupResult> {
  const dict = await fetchFreeDict(word);
  const sections = await Promise.all(
    dict.posSections.map(async (section) => decorateSection(section, sourceLang, targetLang)),
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
): Promise<PosSection> {
  const senses = await Promise.all(
    section.senses.map(async (sense) => decorateSense(sense, source, target)),
  );
  return { ...section, senses };
}

async function decorateSense(sense: Sense, source: string, target: string): Promise<Sense> {
  const [translation, examples] = await Promise.all([
    translate(sense.definition, source, target),
    Promise.all(
      sense.examples.map(async (ex) => ({
        source: ex.source,
        translated: await translate(ex.source, source, target),
      })),
    ),
  ]);
  return { ...sense, translation, examples };
}
