// Tests du manifeste : moindre privilège et portée limitée à Gmail.

import { describe, expect, it } from "vitest";

import { readProjectFile } from "./helpers.js";

const manifest = JSON.parse(readProjectFile("manifest.json"));

describe("manifest.json", () => {
  it("utilise Manifest V3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("ne demande que la permission de stockage", () => {
    expect(manifest.permissions).toEqual(["storage"]);
  });

  it("se limite à Gmail", () => {
    expect(manifest.host_permissions).toEqual(["https://mail.google.com/*"]);
    for (const script of manifest.content_scripts) {
      expect(script.matches).toEqual(["https://mail.google.com/*"]);
    }
  });
});

describe("bibliothèque OpenPGP.js", () => {
  const header = readProjectFile("openpgp.min.js").slice(0, 200);

  it("est une version corrigée pour CVE-2025-47934 (>= 5.11.3)", () => {
    const [, major, minor, patch] = header.match(/v(\d+)\.(\d+)\.(\d+)/).map(Number);
    expect(major).toBe(5);
    expect(minor * 1000 + patch).toBeGreaterThanOrEqual(11 * 1000 + 3);
  });
});
