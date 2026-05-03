import { afterEach, describe, expect, it, vi } from "vitest";
import { Vault } from "./sync.js";
import { toMarkdown } from "../markdown.js";
import type { Flashcard } from "../types.js";

vi.mock("./github-api.js", () => ({
  getFile: vi.fn(),
  putFile: vi.fn(),
  listDir: vi.fn(),
  deleteFile: vi.fn(),
  ConflictError: class ConflictError extends Error {},
}));

import * as gh from "./github-api.js";

const cfg = { owner: "doossee", repo: "vault", token: "T" };
const card: Flashcard = {
  word: "drive",
  sourceLang: "en",
  targetLang: "ru",
  decks: [],
  lookup: {
    word: "drive",
    sourceLang: "en",
    targetLang: "ru",
    fetchedAt: "2026-05-02T00:00:00.000Z",
    posSections: [],
  },
  srs: { interval: 0, ease: 2.5, repetitions: 0, due: "2026-05-02T00:00:00.000Z" },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("Vault.saveCard", () => {
  it("creates a new card when none exists", async () => {
    vi.mocked(gh.getFile).mockResolvedValue(null);
    vi.mocked(gh.putFile).mockResolvedValue({ sha: "NEWSHA" });

    const v = new Vault(cfg);
    await v.saveCard(card);

    expect(gh.putFile).toHaveBeenCalledOnce();
    const call = vi.mocked(gh.putFile).mock.calls[0];
    expect(call[1]).toBe("cards/drive.md");
    expect(call[2]).toContain("\"word\": \"drive\"");
    expect(call[4]).toBeUndefined();
  });

  it("updates an existing card with its sha", async () => {
    vi.mocked(gh.getFile).mockResolvedValue({ content: "irrelevant", sha: "OLDSHA" });
    vi.mocked(gh.putFile).mockResolvedValue({ sha: "NEWSHA" });

    const v = new Vault(cfg);
    await v.saveCard(card);

    expect(vi.mocked(gh.putFile).mock.calls[0][4]).toBe("OLDSHA");
  });

  it("does not double-encode unicode words in the path", async () => {
    vi.mocked(gh.getFile).mockResolvedValue(null);
    vi.mocked(gh.putFile).mockResolvedValue({ sha: "S" });

    const utf8Card: Flashcard = { ...card, word: "café" };
    const v = new Vault(cfg);
    await v.saveCard(utf8Card);

    expect(vi.mocked(gh.putFile).mock.calls[0][1]).toBe("cards/café.md");
  });
});

describe("Vault.updateSRS", () => {
  it("retries once on ConflictError", async () => {
    let getCalls = 0;
    vi.mocked(gh.getFile).mockImplementation(async () => {
      getCalls++;
      return { content: toMarkdown(card), sha: getCalls === 1 ? "STALE" : "FRESH" };
    });

    let putCalls = 0;
    vi.mocked(gh.putFile).mockImplementation(async () => {
      putCalls++;
      if (putCalls === 1) throw new gh.ConflictError();
      return { sha: "WRITTEN" };
    });

    const v = new Vault(cfg);
    const result = await v.updateSRS("drive", 5, "2026-05-02T00:00:00.000Z");

    expect(getCalls).toBe(2);
    expect(putCalls).toBe(2);
    expect(result.srs.repetitions).toBe(1);
  });
});

describe("Vault.deleteCard", () => {
  it("deletes an existing card with its sha", async () => {
    vi.mocked(gh.getFile).mockResolvedValue({ content: toMarkdown(card), sha: "EXISTING" });
    vi.mocked(gh.deleteFile).mockResolvedValue(undefined);

    const v = new Vault(cfg);
    await v.deleteCard("drive");

    expect(gh.deleteFile).toHaveBeenCalledOnce();
    const call = vi.mocked(gh.deleteFile).mock.calls[0];
    expect(call[1]).toBe("cards/drive.md");
    expect(call[3]).toBe("EXISTING");
  });

  it("returns silently when the card does not exist", async () => {
    vi.mocked(gh.getFile).mockResolvedValue(null);
    const v = new Vault(cfg);
    await expect(v.deleteCard("nope")).resolves.toBeUndefined();
    expect(gh.deleteFile).not.toHaveBeenCalled();
  });

  it("retries on ConflictError with a fresh sha", async () => {
    let getCalls = 0;
    vi.mocked(gh.getFile).mockImplementation(async () => {
      getCalls++;
      return { content: toMarkdown(card), sha: getCalls === 1 ? "STALE" : "FRESH" };
    });
    let delCalls = 0;
    vi.mocked(gh.deleteFile).mockImplementation(async () => {
      delCalls++;
      if (delCalls === 1) throw new gh.ConflictError();
    });

    const v = new Vault(cfg);
    await v.deleteCard("drive");
    expect(getCalls).toBe(2);
    expect(delCalls).toBe(2);
  });
});

describe("Vault.listCards", () => {
  it("listCards strips .md", async () => {
    vi.mocked(gh.listDir).mockResolvedValue(["drive.md", "run.md", "README.txt"]);
    const v = new Vault(cfg);
    expect(await v.listCards()).toEqual(["drive", "run"]);
  });
});
