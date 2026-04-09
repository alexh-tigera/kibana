#!/usr/bin/env node
/**
 * Strip additionalProperties: false from all schemas in an OpenAPI YAML bundle.
 * This flag is used for server-side validation but renders as a confusing
 * "Additional properties are NOT allowed" row in API reference renderers.
 * Usage: node strip_additional_properties.js <input.yaml> [output.yaml]
 * If output is omitted, overwrites input.
 */
const yaml = require('js-yaml');
const fs = require('fs');

const [,, inputFile, outputFile] = process.argv;
if (!inputFile) {
  console.error('Usage: node strip_additional_properties.js <input.yaml> [output.yaml]');
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(inputFile, 'utf8'));
let count = 0;

const strip = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(strip); return; }
  if ('additionalProperties' in obj && obj.additionalProperties === false) {
    delete obj.additionalProperties;
    count++;
  }
  for (const v of Object.values(obj)) strip(v);
};

strip(doc);

const out = outputFile || inputFile;
fs.writeFileSync(out, yaml.dump(doc, { lineWidth: -1, noRefs: true }));
console.log(`Stripped additionalProperties:false from ${count} locations → ${out}`);
