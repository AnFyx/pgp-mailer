// En environnement jsdom, `import.meta.url` n'est pas une URL de fichier :
// les sources sont lues depuis la racine du projet (répertoire de travail
// de vitest).
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readProjectFile(name) {
  return readFileSync(join(process.cwd(), name), "utf8");
}
