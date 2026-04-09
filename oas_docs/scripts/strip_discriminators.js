#!/usr/bin/env node
/**
 * Strip discriminator objects from all schemas in an OpenAPI YAML bundle.
 * Discriminators are used for server-side validation routing but cause
 * API renderers (bump.sh) to display component key names instead of
 * schema titles in oneOf/anyOf tab labels.
 * Usage: node strip_discriminators.js <input.yaml> [output.yaml]
 */
const yaml = require('js-yaml');
const fs = require('fs');

const [,, inputFile, outputFile] = process.argv;
if (!inputFile) {
  console.error('Usage: node strip_discriminators.js <input.yaml> [output.yaml]');
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(inputFile, 'utf8'));
let count = 0;

const strip = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(strip); return; }
  if ('discriminator' in obj) {
    delete obj.discriminator;
    count++;
  }
  for (const v of Object.values(obj)) strip(v);
};

strip(doc);

const out = outputFile || inputFile;
fs.writeFileSync(out, yaml.dump(doc, { lineWidth: -1, noRefs: true }));
console.log(`Stripped discriminator from ${count} locations → ${out}`);
