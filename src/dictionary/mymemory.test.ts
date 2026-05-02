import { afterEach, describe, expect, it, vi } from "vitest";
import { translate } from "./mymemory.js";

afterEach(() => vi.unstubAllGlobals());

describe("translate", () => {
  it("returns the translated text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("langpair=en%7Cru");
        expect(url).toContain("q=hello");
        return new Response(
          JSON.stringify({ responseData: { translatedText: "привет" }, responseStatus: 200 }),
          { status: 200 },
        );
      }),
    );
    expect(await translate("hello", "en", "ru")).toBe("привет");
  });

  it("decodes HTML entities in the translated text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            responseData: { translatedText: "it&#39;s &quot;great&quot; &amp; fun" },
            responseStatus: 200,
          }),
          { status: 200 },
        ),
      ),
    );
    expect(await translate("foo", "en", "es")).toBe(`it's "great" & fun`);
  });

  it("throws on transport-level (HTTP) failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream", { status: 503 })),
    );
    await expect(translate("hello", "en", "ru")).rejects.toThrow(/mymemory 503 \(en->ru\)/);
  });

  it("throws on application-level error (responseStatus !== 200)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ responseData: { translatedText: "" }, responseStatus: 429 }),
          { status: 200 },
        ),
      ),
    );
    await expect(translate("hello", "en", "ru")).rejects.toThrow(/mymemory status 429 \(en->ru\)/);
  });
});
