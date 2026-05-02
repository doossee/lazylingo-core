const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

export interface DeviceCodeRequest {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export async function requestDeviceCode(
  clientId: string,
  scope: string,
): Promise<DeviceCodeRequest> {
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope }),
  });
  if (!res.ok) throw new Error(`github device code ${res.status}`);
  const body = await res.json();
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    interval: body.interval,
    expiresIn: body.expires_in,
  };
}

export type SleepFn = (ms: number) => Promise<void>;

/**
 * Poll GitHub's access-token endpoint until the user completes the device
 * authorization or the request fails terminally. The loop relies on GitHub
 * returning `expired_token` after the original `expires_in` window; it has
 * no internal time-bound. Callers that want a hard cap can wrap the call
 * with `Promise.race` or pass an aborting `sleep`.
 *
 * `sleep` is injected so tests can run without real waits.
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  intervalSec: number,
  sleep: SleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<string> {
  let interval = intervalSec;
  for (;;) {
    const res = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    if (!res.ok) throw new Error(`github poll ${res.status}`);
    const body = await res.json();
    if (body.access_token) return body.access_token;
    if (body.error === "authorization_pending") {
      await sleep(interval * 1000);
      continue;
    }
    if (body.error === "slow_down") {
      interval += 5;
      await sleep(interval * 1000);
      continue;
    }
    throw new Error(`device flow error: ${body.error ?? "unknown"}`);
  }
}
