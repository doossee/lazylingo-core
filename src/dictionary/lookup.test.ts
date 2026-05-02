import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "./lookup.js";

vi.mock("./free-dict.js", () => ({
  fetchFreeDict: vi.fn(async () => ({
    word: "drive",
    phonetic: "/draɪv/",
    posSections: [
      {
        pos: "verb" as const,
        senses: [
          {
            definition: "to operate a vehicle",
            examples: [{ source: "I drive every day." }],
          },
        ],
      },
    ],
  })),
}));

vi.mock("./mymemory.js", () => ({
  translate: vi.fn(async (text: string) => `T(${text})`),
}));

afterEach(() => vi.restoreAllMocks());

describe("lookup", () => {
  it("decorates definitions and examples with translations", async () => {
    const r = await lookup("drive", "en", "ru", "2026-05-02T00:00:00.000Z");
    const sense = r.posSections[0].senses[0];
    expect(sense.translation).toBe("T(to operate a vehicle)");
    expect(sense.examples[0].translated).toBe("T(I drive every day.)");
    expect(r.fetchedAt).toBe("2026-05-02T00:00:00.000Z");
    expect(r.sourceLang).toBe("en");
    expect(r.targetLang).toBe("ru");
  });
});
