// MyMemory anonymous tier: ~5000 chars/day. Task 6 (lookup orchestrator) calls this
// twice per word (definition + each example). Throttling/retry policy is the consumer's
// responsibility. Quota errors surface as `mymemory status 429`.
// Pass `deKey` (any unique string, typically an email) to raise the per-user quota from
// 5 000 to 50 000 chars/day via MyMemory's `de=` query param.

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

export async function translate(
  text: string,
  source: string,
  target: string,
  deKey?: string,
): Promise<string> {
  let url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}%7C${encodeURIComponent(target)}`;
  if (deKey) url += `&de=${encodeURIComponent(deKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status} (${source}->${target})`);
  const body = (await res.json()) as MyMemoryResponse;
  if (body.responseStatus !== 200) throw new Error(`mymemory status ${body.responseStatus} (${source}->${target})`);
  return decodeEntities(body.responseData.translatedText);
}
