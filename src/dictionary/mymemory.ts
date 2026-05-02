// MyMemory anonymous tier: ~5000 chars/day. Task 6 (lookup orchestrator) calls this
// twice per word (definition + each example). Throttling/retry policy is the consumer's
// responsibility. We do NOT add an email/`de` param here — the plan keeps this client
// intentionally minimal. Quota errors surface as `mymemory status 429`.

const ENDPOINT = "https://api.mymemory.translated.net/get";

interface MyMemoryResponse {
  responseData: { translatedText: string };
  responseStatus: number;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m]);
}

export async function translate(text: string, source: string, target: string): Promise<string> {
  const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}%7C${encodeURIComponent(target)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status} (${source}->${target})`);
  const body = (await res.json()) as MyMemoryResponse;
  if (body.responseStatus !== 200) throw new Error(`mymemory status ${body.responseStatus} (${source}->${target})`);
  return decodeEntities(body.responseData.translatedText);
}
