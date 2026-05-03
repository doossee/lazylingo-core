import { afterEach, describe, expect, it, vi } from "vitest";
import { getFile } from "./github-api.js";

const config = { owner: "doossee", repo: "vault", token: "T", branch: "main" };

afterEach(() => vi.unstubAllGlobals());

describe("getFile", () => {
  it("returns decoded content and sha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toBe(
          "https://api.github.com/repos/doossee/vault/contents/cards/drive.md?ref=main",
        );
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer T");
        return new Response(
          JSON.stringify({ content: btoa("hello"), encoding: "base64", sha: "SHA1" }),
          { status: 200 },
        );
      }),
    );
    expect(await getFile(config, "cards/drive.md")).toEqual({ content: "hello", sha: "SHA1" });
  });

  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    expect(await getFile(config, "cards/missing.md")).toBeNull();
  });

  it("decodes UTF-8 content correctly (non-ASCII round-trip)", async () => {
    const utf8 = "café — 你好 🎉";
    const bytes = new TextEncoder().encode(utf8);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const b64 = btoa(bin);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ content: b64, encoding: "base64", sha: "SHA1" }), {
          status: 200,
        }),
      ),
    );
    const result = await getFile(config, "cards/café.md");
    expect(result?.content).toBe(utf8);
  });

  it("URL-encodes the path (handles unicode and spaces)", async () => {
    let observed = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        observed = url;
        return new Response(JSON.stringify({ content: btoa("x"), encoding: "base64", sha: "S" }), {
          status: 200,
        });
      }),
    );
    await getFile(config, "cards/café file.md");
    expect(observed).toBe(
      "https://api.github.com/repos/doossee/vault/contents/cards/caf%C3%A9%20file.md?ref=main",
    );
  });
});

import { ConflictError, putFile } from "./github-api.js";

describe("putFile", () => {
  it("putFile throws ConflictError on 409", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 409 })));
    await expect(putFile(config, "cards/x.md", "hi", "msg", "OLD_SHA")).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("encodes UTF-8 content as base64 in the request body", async () => {
    const utf8 = "café — 你好";
    let observedBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        observedBody = init?.body as string;
        return new Response(JSON.stringify({ content: { sha: "NEWSHA" } }), { status: 200 });
      }),
    );
    await putFile(config, "cards/x.md", utf8, "msg");

    const parsed = JSON.parse(observedBody);
    const bytes = new TextEncoder().encode(utf8);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    expect(parsed.content).toBe(btoa(bin));
  });
});

import { deleteFile, listDir } from "./github-api.js";

describe("deleteFile", () => {
  it("DELETEs the file with the right body and returns void", async () => {
    let body: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(init?.method).toBe("DELETE");
        body = init?.body as string;
        return new Response("{}", { status: 200 });
      }),
    );
    await deleteFile(config, "cards/drive.md", "remove drive", "OLDSHA");
    const parsed = JSON.parse(body!);
    expect(parsed.message).toBe("remove drive");
    expect(parsed.sha).toBe("OLDSHA");
    expect(parsed.branch).toBe("main");
  });

  it("treats 404 as already-deleted (returns void without throwing)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    await expect(deleteFile(config, "cards/missing.md", "msg", "SHA")).resolves.toBeUndefined();
  });

  it("throws ConflictError on 409", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 409 })));
    await expect(deleteFile(config, "cards/x.md", "m", "S")).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("listDir", () => {
  it("listDir filters out non-file entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { name: "drive.md", type: "file" },
            { name: "subdir", type: "dir" },
            { name: "run.md", type: "file" },
          ]),
          { status: 200 },
        )),
    );
    expect(await listDir(config, "cards")).toEqual(["drive.md", "run.md"]);
  });
});
