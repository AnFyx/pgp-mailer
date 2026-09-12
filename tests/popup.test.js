// Tests du popup : construction des lignes de clés et refus des clés nues.

import { describe, expect, it } from "vitest";

import { readProjectFile } from "./helpers.js";

const SOURCE = readProjectFile("popup.js");

function loadCreateKeyRow() {
  const start = SOURCE.indexOf("function createKeyRow");
  const end = SOURCE.indexOf("async function listAndRenderKeys");
  return new Function(`${SOURCE.slice(start, end)}; return createKeyRow;`)();
}

describe("createKeyRow", () => {
  it("insère l'adresse comme texte et non comme HTML", () => {
    const createKeyRow = loadCreateKeyRow();
    const row = createKeyRow('<img src=x onerror="window.__pwned = true">', "private");
    document.body.appendChild(row);

    expect(row.querySelector("img")).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });

  it("porte le type et l'identifiant sur le bouton de suppression", () => {
    const createKeyRow = loadCreateKeyRow();
    const row = createKeyRow("user@example.org", "public");
    const button = row.querySelector("button");

    expect(button.dataset.type).toBe("public");
    expect(button.dataset.id).toBe("user@example.org");
  });
});

describe("import de clé", () => {
  it("refuse une clé privée non protégée par une phrase de passe", () => {
    expect(SOURCE).toContain("privKey.isDecrypted()");
    const guard = SOURCE.slice(SOURCE.indexOf("privKey.isDecrypted()"));
    expect(guard.indexOf("return;")).toBeLessThan(guard.indexOf("savePrivateKey("));
  });

  it("n'utilise plus innerHTML", () => {
    expect(SOURCE).not.toContain("innerHTML");
  });
});
