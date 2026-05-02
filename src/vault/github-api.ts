import type { VaultConfig } from "../types.js";

const API = "https://api.github.com";

export interface FileContent {
  content: string;
  sha: string;
}

export class ConflictError extends Error {
  constructor() {
    super("github sha mismatch");
    this.name = "ConflictError";
  }
}

export async function getFile(cfg: VaultConfig, path: string): Promise<FileContent | null> {
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(path)}?ref=${branchOf(cfg)}`;
  const res = await fetch(url, { headers: ghHeaders(cfg) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github get ${res.status}`);
  const body = await res.json();
  return { content: decodeBase64Utf8(body.content), sha: body.sha };
}

export async function putFile(
  cfg: VaultConfig,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<{ sha: string }> {
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: encodeBase64Utf8(content),
      branch: branchOf(cfg),
      sha,
    }),
  });
  if (res.status === 409 || res.status === 422) throw new ConflictError();
  if (!res.ok) throw new Error(`github put ${res.status}`);
  const body = await res.json();
  return { sha: body.content.sha };
}

export async function listDir(cfg: VaultConfig, path: string): Promise<string[]> {
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(path)}?ref=${branchOf(cfg)}`;
  const res = await fetch(url, { headers: ghHeaders(cfg) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`github list ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body)) return [];
  return (body as { name: string; type: string }[])
    .filter((e) => e.type === "file")
    .map((e) => e.name);
}

function ghHeaders(cfg: VaultConfig) {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function branchOf(cfg: VaultConfig): string {
  return cfg.branch ?? "main";
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
