import type { Flashcard, Grade, VaultConfig } from "../types.js";
import { fromMarkdown, toMarkdown } from "../markdown.js";
import { schedule } from "../srs.js";
import { ConflictError, getFile, listDir, putFile } from "./github-api.js";

export class Vault {
  constructor(private cfg: VaultConfig) {}

  async saveCard(card: Flashcard): Promise<void> {
    const path = pathFor(card.word);
    const existing = await getFile(this.cfg, path);
    const body = toMarkdown(card);
    const message = existing ? `update ${card.word}` : `add ${card.word}`;
    await putFile(this.cfg, path, body, message, existing?.sha);
  }

  async getCard(word: string): Promise<Flashcard | null> {
    const file = await getFile(this.cfg, pathFor(word));
    return file ? fromMarkdown(file.content) : null;
  }

  async listCards(): Promise<string[]> {
    const names = await listDir(this.cfg, "cards");
    return names.filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3));
  }

  async updateSRS(word: string, grade: Grade, now: string): Promise<Flashcard> {
    const file = await getFile(this.cfg, pathFor(word));
    if (!file) throw new Error(`no card: ${word}`);
    const card = fromMarkdown(file.content);
    const next: Flashcard = {
      ...card,
      srs: schedule(card.srs, grade, now),
      updatedAt: now,
    };
    try {
      await putFile(this.cfg, pathFor(word), toMarkdown(next), `review ${word}`, file.sha);
    } catch (e) {
      if (e instanceof ConflictError) {
        return this.updateSRS(word, grade, now);
      }
      throw e;
    }
    return next;
  }
}

function pathFor(word: string): string {
  return `cards/${word}.md`;
}
