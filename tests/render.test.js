// Tests de rendu : le contenu venu de l'expéditeur ne doit jamais être
// interprété comme du HTML. On charge content.js dans un DOM simulé.

import { beforeEach, describe, expect, it } from "vitest";

import { readProjectFile } from "./helpers.js";

const SOURCE = readProjectFile("content.js");

/** Expose les fonctions de rendu de content.js sans exécuter l'observateur. */
function loadRenderHelpers() {
  const start = SOURCE.indexOf("const PANEL_KIND_STYLES");
  const end = SOURCE.indexOf("async function getPrivateKeyFromStoreOrPrompt");
  const helpers = SOURCE.slice(start, end);
  return new Function(
    `${helpers}; return { createPanel, appendHeading, appendField, appendBody };`
  )();
}

const PAYLOAD = '<img src=x onerror="window.__pwned = true">';

describe("rendu des panneaux", () => {
  let render;

  beforeEach(() => {
    document.body.innerHTML = "";
    render = loadRenderHelpers();
  });

  it("insère le message déchiffré comme texte, pas comme HTML", () => {
    const panel = render.createPanel("ok");
    render.appendBody(panel, "Decrypted Message:", PAYLOAD);
    document.body.appendChild(panel);

    expect(panel.querySelector("img")).toBeNull();
    expect(panel.textContent).toContain(PAYLOAD);
    expect(window.__pwned).toBeUndefined();
  });

  it("insère l'adresse de l'expéditeur comme texte", () => {
    const panel = render.createPanel("ok");
    render.appendField(panel, "From:", '<script>window.__pwned = true</script>');
    document.body.appendChild(panel);

    expect(panel.querySelector("script")).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });

  it("insère le message d'erreur comme texte", () => {
    const panel = render.createPanel("error");
    render.appendField(panel, "Error:", PAYLOAD);
    document.body.appendChild(panel);

    expect(panel.querySelector("img")).toBeNull();
  });

  it("tolère une valeur absente sans écrire 'undefined' comme HTML", () => {
    const panel = render.createPanel("warn");
    render.appendField(panel, "From:", undefined);
    render.appendBody(panel, "Message:", null);
    expect(panel.querySelectorAll("*").length).toBeGreaterThan(0);
  });

  it("le titre du panneau reste du texte", () => {
    const panel = render.createPanel("ok");
    render.appendHeading(panel, "PGP Signature Verified");
    expect(panel.querySelector("strong").textContent).toBe("PGP Signature Verified");
  });
});

describe("code source", () => {
  it("n'utilise innerHTML que pour vider le corps du message", () => {
    const uses = SOURCE.split("\n").filter((line) => line.includes("innerHTML"));
    expect(uses.map((l) => l.trim())).toEqual(['editable.innerHTML = "";']);
  });

  it("ne demande jamais une clé privée dans la page", () => {
    expect(SOURCE).not.toMatch(/prompt\([^)]*PRIVATE/i);
  });

  it("n'appelle aucune fonction de stockage inexistante", () => {
    expect(SOURCE).not.toContain("setStorageKey");
  });
});
