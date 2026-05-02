import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDeviceCode } from "./github-auth.js";

afterEach(() => vi.unstubAllGlobals());

describe("requestDeviceCode", () => {
  it("returns parsed device code fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            device_code: "DC123",
            user_code: "ABCD-1234",
            verification_uri: "https://github.com/login/device",
            expires_in: 900,
            interval: 5,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )),
    );

    const r = await requestDeviceCode("CLIENT_ID", "repo");
    expect(r.deviceCode).toBe("DC123");
    expect(r.userCode).toBe("ABCD-1234");
    expect(r.verificationUri).toBe("https://github.com/login/device");
    expect(r.interval).toBe(5);
  });
});

import { pollForToken } from "./github-auth.js";

describe("pollForToken", () => {
  it("polls until access_token arrives", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        if (calls === 1) {
          return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200 });
        }
        return new Response(JSON.stringify({ access_token: "GHO_TOKEN" }), { status: 200 });
      }),
    );
    const noSleep = async () => {};
    const token = await pollForToken("CLIENT_ID", "DC123", 1, noSleep);
    expect(token).toBe("GHO_TOKEN");
    expect(calls).toBe(2);
  });

  it("throws on terminal errors like access_denied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "access_denied" }), { status: 200 })),
    );
    await expect(pollForToken("CLIENT_ID", "DC123", 1, async () => {})).rejects.toThrow(
      /access_denied/,
    );
  });

  it("throws on non-2xx HTTP responses without parsing the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream blew up", { status: 502 })),
    );
    await expect(pollForToken("CLIENT_ID", "DC123", 1, async () => {})).rejects.toThrow(
      /github poll 502/,
    );
  });
});
