// Builds every service illustration: node tools/service-art/build.mjs [only-prefix]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../assets/images/service");
const only = process.argv[2];
const sets = ["webdev", "saas", "ai", "mobile", "integrations", "business", "ecommerce", "cloud"];
for (const name of sets) {
  let mod;
  try { mod = (await import(`./${name}.mjs`)).default; } catch (e) { if (e.code === "ERR_MODULE_NOT_FOUND") continue; throw e; }
  for (const [file, make] of Object.entries(mod)) {
    if (only && !file.startsWith(only)) continue;
    const s = make();
    writeFileSync(join(OUT, `${file}.svg`), s);
    console.log(`${file}.svg`, s.length, "bytes");
  }
}
