import { describe, expect, it } from "vitest";
import {
  findWikiLinks,
  insertAt,
  renameWikiLinks,
  uniqueDocumentTitle,
  wikiLinkFor,
} from "./wiki-links";

describe("wiki links", () => {
  it("finds and inserts Obsidian-style links", () => {
    expect(insertAt("Before after", wikiLinkFor("Mara Vale"), 7)).toBe(
      "Before [[Mara Vale]]after",
    );
    expect(findWikiLinks("See [[Mara Vale]] and [[Missing]].")).toEqual([
      { title: "Mara Vale", from: 4, to: 17 },
      { title: "Missing", from: 22, to: 33 },
    ]);
  });

  it("renames only matching wiki links", () => {
    expect(
      renameWikiLinks(
        "[[Mara Vale]] meets [[Ilya Voss]].",
        "mara vale",
        "Mara North",
      ),
    ).toBe("[[Mara North]] meets [[Ilya Voss]].");
  });

  it("generates unique project titles", () => {
    expect(uniqueDocumentTitle("Mara", ["Mara", "Mara 2"])).toBe("Mara 3");
    expect(uniqueDocumentTitle("Mara", ["Mara"], "Mara")).toBe("Mara");
  });
});
