import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFreeDict, NotFoundError } from "./free-dict.js";

const fixture = [
  {
    word: "drive",
    phonetic: "/draɪv/",
    meanings: [
      {
        partOfSpeech: "verb",
        definitions: [
          { definition: "to operate a vehicle", example: "I drive every day." },
          { definition: "to compel someone to act" },
        ],
      },
      {
        partOfSpeech: "noun",
        definitions: [{ definition: "a journey by car" }],
      },
    ],
  },
];

afterEach(() => vi.unstubAllGlobals());

describe("fetchFreeDict", () => {
  it("normalizes a multi-pos response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }))
    );

    const result = await fetchFreeDict("drive");

    expect(result.word).toBe("drive");
    expect(result.phonetic).toBe("/draɪv/");
    expect(result.posSections).toHaveLength(2);
    expect(result.posSections[0].pos).toBe("verb");
    expect(result.posSections[0].senses).toHaveLength(2);
    expect(result.posSections[0].senses[0].definition).toBe("to operate a vehicle");
    expect(result.posSections[0].senses[0].examples[0].source).toBe("I drive every day.");
    expect(result.posSections[0].senses[1].examples).toEqual([]);
    expect(result.posSections[1].pos).toBe("noun");
  });

  it("throws NotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 }))
    );
    await expect(fetchFreeDict("xyzqq")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws a generic Error on non-404 HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream issue", { status: 503 }))
    );
    const promise = fetchFreeDict("drive");
    await expect(promise).rejects.toThrow(/free-dict 503/);
    await expect(promise).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("propagates network-layer failures (fetch rejects)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      })
    );
    await expect(fetchFreeDict("drive")).rejects.toThrow(/network down/);
  });

  it("picks the first non-empty audio URL from the phonetics array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              word: "drive",
              phonetic: "/draɪv/",
              phonetics: [
                { text: "/drʌɪv/", audio: "" },
                { text: "/draɪv/", audio: "https://example.com/drive-us.mp3" },
              ],
              meanings: [],
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchFreeDict("drive");
    expect(result.audioUrl).toBe("https://example.com/drive-us.mp3");
  });

  it("audioUrl is undefined when no phonetics entry has audio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              word: "drive",
              phonetic: "/draɪv/",
              phonetics: [{ text: "/drʌɪv/", audio: "" }],
              meanings: [],
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchFreeDict("drive");
    expect(result.audioUrl).toBeUndefined();
  });
});
