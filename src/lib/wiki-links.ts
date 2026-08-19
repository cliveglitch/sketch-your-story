export const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
export const STORY_DOCUMENT_DRAG_TYPE = "application/x-sketchstory-document";

export function wikiLinkFor(title: string): string {
  return `[[${title.trim()}]]`;
}

export function findWikiLinks(body: string) {
  return [...body.matchAll(WIKI_LINK_PATTERN)].map((match) => ({
    title: match[1]!.trim(),
    from: match.index,
    to: match.index + match[0].length,
  }));
}

export function renameWikiLinks(
  body: string,
  oldTitle: string,
  nextTitle: string,
): string {
  const normalized = oldTitle.trim().toLocaleLowerCase();
  return body.replace(WIKI_LINK_PATTERN, (match, title: string) =>
    title.trim().toLocaleLowerCase() === normalized
      ? wikiLinkFor(nextTitle)
      : match,
  );
}

export function uniqueDocumentTitle(
  requested: string,
  existing: Iterable<string>,
  currentTitle?: string,
): string {
  const base = requested.trim() || "Untitled note";
  const current = currentTitle?.trim().toLocaleLowerCase();
  const used = new Set(
    [...existing]
      .map((title) => title.trim().toLocaleLowerCase())
      .filter((title) => title !== current),
  );
  if (!used.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (used.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

export function insertAt(
  body: string,
  insertion: string,
  position: number,
): string {
  const safePosition = Math.max(0, Math.min(position, body.length));
  return `${body.slice(0, safePosition)}${insertion}${body.slice(safePosition)}`;
}
