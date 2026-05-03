import { describe, expect, it } from "vitest";
import { fromMarkdown, toMarkdown } from "./markdown.js";
import type { Flashcard } from "./types.js";

const sample: Flashcard = {
  word: "drive",
  sourceLang: "en",
  targetLang: "ru",
  decks: ["default"],
  lookup: {
    word: "drive",
    phonetic: "/draɪv/",
    sourceLang: "en",
    targetLang: "ru",
    fetchedAt: "2026-05-02T10:00:00.000Z",
    posSections: [
      {
        pos: "verb",
        senses: [
          {
            level: "A2",
            definition: "to operate a car",
            translation: "управлять (автомобилем)",
            examples: [{ source: "I drive to work.", translated: "Я еду на работу." }],
          },
        ],
      },
    ],
  },
  srs: { interval: 1, ease: 2.6, repetitions: 1, due: "2026-05-03T00:00:00.000Z" },
  createdAt: "2026-05-02T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
};

describe("markdown", () => {
  it("round-trips a flashcard through serialize/deserialize", () => {
    const md = toMarkdown(sample);
    const parsed = fromMarkdown(md);
    expect(parsed).toEqual(sample);
  });

  it("throws if input lacks frontmatter", () => {
    expect(() => fromMarkdown("# drive\nno frontmatter")).toThrow(/missing frontmatter/);
  });

  it("round-trips when the input uses CRLF line endings (Windows clone)", () => {
    const md = toMarkdown(sample);
    const crlf = md.replace(/\n/g, "\r\n");
    const parsed = fromMarkdown(crlf);
    expect(parsed).toEqual(sample);
  });

  it("round-trips audioUrl when set", () => {
    const withAudio: Flashcard = {
      ...sample,
      lookup: { ...sample.lookup, audioUrl: "https://example.com/audio.mp3" },
    };
    expect(fromMarkdown(toMarkdown(withAudio))).toEqual(withAudio);
  });
});
