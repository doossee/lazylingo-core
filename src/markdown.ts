import type { Flashcard } from "./types.js";

const FRONTMATTER_DELIM = "---";

export function toMarkdown(card: Flashcard): string {
  const frontmatter = JSON.stringify(card, null, 2);
  const body = renderBody(card);
  return `${FRONTMATTER_DELIM}\n${frontmatter}\n${FRONTMATTER_DELIM}\n\n${body}\n`;
}

export function fromMarkdown(md: string): Flashcard {
  if (!md.startsWith(FRONTMATTER_DELIM)) {
    throw new Error("missing frontmatter");
  }
  const end = md.indexOf(`\n${FRONTMATTER_DELIM}`, FRONTMATTER_DELIM.length);
  if (end === -1) throw new Error("unterminated frontmatter");
  const json = md.slice(FRONTMATTER_DELIM.length, end).trim();
  return JSON.parse(json) as Flashcard;
}

function renderBody(card: Flashcard): string {
  const lines: string[] = [`# ${card.word}`];
  if (card.lookup.phonetic) lines.push(`*${card.lookup.phonetic}*`);
  for (const section of card.lookup.posSections) {
    lines.push("", `## ${section.pos}`);
    section.senses.forEach((sense, i) => {
      const lvl = sense.level ? ` [${sense.level}]` : "";
      lines.push("", `${i + 1}.${lvl} ${sense.definition}`);
      if (sense.translation) lines.push(`   → ${sense.translation}`);
      for (const ex of sense.examples) {
        lines.push(`   - ${ex.source}${ex.translated ? ` — ${ex.translated}` : ""}`);
      }
    });
  }
  return lines.join("\n");
}
