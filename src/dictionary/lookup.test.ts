import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "./lookup.js";
import { fetchFreeDict } from "./free-dict.js";
import { translate } from "./mymemory.js";

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

afterEach(() => vi.clearAllMocks());

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

  it("propagates audioUrl from free-dict", async () => {
    vi.mocked(fetchFreeDict).mockResolvedValueOnce({
      word: "drive",
      phonetic: "/draɪv/",
      audioUrl: "https://example.com/x.mp3",
      posSections: [],
    });
    const r = await lookup("drive", "en", "ru", "2026-05-02T00:00:00.000Z");
    expect(r.audioUrl).toBe("https://example.com/x.mp3");
  });

  it("English → English skips MyMemory and uses Free Dict directly", async () => {
    vi.mocked(fetchFreeDict).mockResolvedValue({
      word: "drive",
      phonetic: "/draɪv/",
      audioUrl: "https://example.com/drive.mp3",
      posSections: [
        {
          pos: "verb",
          senses: [
            {
              definition: "to operate a vehicle",
              examples: [{ source: "I drive every day." }],
              synonyms: ["operate"],
            },
          ],
        },
      ],
    });

    const r = await lookup("drive", "en", "en", "2026-05-03T00:00:00.000Z");
    expect(translate).not.toHaveBeenCalled();
    expect(r.posSections[0].senses[0].definition).toBe("to operate a vehicle");
    expect(r.posSections[0].senses[0].translation).toBeUndefined();
    expect(r.posSections[0].senses[0].synonyms).toEqual(["operate"]);
    expect(r.audioUrl).toBe("https://example.com/drive.mp3");
  });

  it("non-English source skips Free Dict and returns a translation-only LookupResult", async () => {
    vi.mocked(translate).mockResolvedValue("hello");

    const r = await lookup("привет", "ru", "en", "2026-05-03T00:00:00.000Z");
    expect(fetchFreeDict).not.toHaveBeenCalled();
    expect(translate).toHaveBeenCalledWith("привет", "ru", "en");
    expect(r.word).toBe("привет");
    expect(r.sourceLang).toBe("ru");
    expect(r.targetLang).toBe("en");
    expect(r.posSections).toHaveLength(1);
    expect(r.posSections[0].pos).toBe("other");
    expect(r.posSections[0].senses[0].translation).toBe("hello");
  });
});
