import fs from 'node:fs';
import path from 'node:path';

const i18nDir = path.resolve('src/i18n');
const outputFile = path.join(i18nDir, 'language-manifest.generated.ts');
const translationFiles = fs
  .readdirSync(i18nDir)
  .filter((file) => /^[a-z]{2}\.json$/.test(file))
  .sort();

const languages = translationFiles.map((file) => {
  const source = fs.readFileSync(path.join(i18nDir, file), 'utf8');
  const parsed = JSON.parse(source);
  const meta = parsed._meta;
  const code = file.replace(/\.json$/, '');

  if (
    !meta ||
    typeof meta.code !== 'string' ||
    typeof meta.name !== 'string' ||
    typeof meta.nativeName !== 'string' ||
    typeof meta.shortLabel !== 'string' ||
    (meta.dir !== 'ltr' && meta.dir !== 'rtl')
  ) {
    throw new Error(`Invalid or missing _meta in ${file}`);
  }

  if (meta.code !== code) {
    throw new Error(`Expected _meta.code to be "${code}" in ${file}, got "${meta.code}"`);
  }

  return {
    code: meta.code,
    name: meta.name,
    nativeName: meta.nativeName,
    shortLabel: meta.shortLabel,
    dir: meta.dir,
  };
});

const fileBody = `import type { LanguageDef } from './languages';

// This file is generated from src/i18n/*.json by scripts/generate-language-manifest.mjs.
// Add a new language by adding one new translation JSON file with a valid _meta block.
export const GENERATED_LANGUAGE_MANIFEST: LanguageDef[] = ${JSON.stringify(languages, null, 2)};\n`;

fs.writeFileSync(outputFile, fileBody);
console.log(
  `Generated ${path.relative(process.cwd(), outputFile)} from ${translationFiles.length} locale files.`,
);
