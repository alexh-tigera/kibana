#!/usr/bin/env node
/**
 * Replace the full Lens config schema in the dashboard Panel_Visualization
 * with a lightweight description, and remove all schemas that were only
 * referenced through lensApiState.
 *
 * The full visualization schema is documented in the Visualizations API.
 * Embedding it in the Dashboards bundle makes it too large to render.
 *
 * Usage: node simplify_panel_vis.js <input.yaml> [output.yaml]
 */
const yaml = require('js-yaml');
const fs = require('fs');

const [,, inputFile, outputFile] = process.argv;
if (!inputFile) {
  console.error('Usage: node simplify_panel_vis.js <input.yaml> [output.yaml]');
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(inputFile, 'utf8'));
const s = doc.components?.schemas || {};

// Collect all schemas reachable from lensApiState
const lensRefs = new Set();
const collect = (name, visited = new Set()) => {
  if (visited.has(name) || !s[name]) return;
  visited.add(name);
  lensRefs.add(name);
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.$ref) collect(obj.$ref.replace('#/components/schemas/', ''), visited);
    for (const v of Object.values(obj)) walk(v);
  };
  walk(s[name]);
};
// Use the renamed key if it exists, fall back to original
const lensStateKey = s['lensApiState'] ? 'lensApiState' : Object.keys(s).find(k => k.includes('lensApiState'));
if (lensStateKey) collect(lensStateKey);

// Replace $ref to lensApiState in Panel_Visualization.config.anyOf[0].properties.attributes
const pvKey = Object.keys(s).find(k => k === 'Panel_Visualization' || k.includes('kbn-dashboard-panel-lens'));
if (pvKey) {
  const pv = s[pvKey];
  const config = pv?.properties?.config;
  if (config?.anyOf?.[0]?.properties?.attributes) {
    config.anyOf[0].properties.attributes = {
      type: 'object',
      description:
        'Visualization configuration. The shape depends on the `type` field ' +
        '(`metric`, `xy`, `pie`, `gauge`, `data_table`, and so on). ' +
        'For the full schema and examples, see the ' +
        '[Visualizations API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-createvisualization).',
      additionalProperties: true,
    };
  }
  // Also clean up any remaining $ref to lensApiState in this schema
  const cleanRefs = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$ref' && typeof v === 'string' && lensRefs.has(v.replace('#/components/schemas/', ''))) {
        delete obj[k];
        obj.type = 'object';
        obj.description = 'Visualization configuration. See the Visualizations API for the full schema.';
        obj.additionalProperties = true;
      } else {
        cleanRefs(v);
      }
    }
  };
  cleanRefs(pv);
}

// Remove all lensApiState-only schemas
let removed = 0;
for (const key of lensRefs) {
  if (s[key]) {
    delete s[key];
    removed++;
  }
}

const out = outputFile || inputFile;
fs.writeFileSync(out, yaml.dump(doc, { lineWidth: -1, noRefs: true }));
console.log(`Simplified Panel_Visualization: removed ${removed} Lens config schemas → ${out}`);
console.log(`New file size: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
