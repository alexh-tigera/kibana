#!/usr/bin/env node
/**
 * Generates per-chart-type CSV reference tables and .md pages for the
 * Visualizations API schema reference.
 *
 * Output structure:
 *   docs/reference/visualizations-api/
 *     metric.md, xy.md, ...       one page per chart type
 *     _tables/
 *       metric.csv                top-level fields only (depth 0)
 *       metric-styling.csv        sub-schema tables
 *       shared-drilldowns.csv     shared across all chart types
 *       xy.csv, xy-styling.csv, ...
 *
 * Usage:
 *   node scripts/generate_csv_schemas.js [--input <oas.yaml>] [--output <dir>]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const oasDocsDir = path.join(__dirname, '..');
const kibanaRoot = path.join(oasDocsDir, '..');

function getArg(name, defaultVal) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : defaultVal;
}

const inputPath = getArg('--input', path.join(oasDocsDir, 'output/kibana.yaml'));
const outputDir = getArg('--output', path.join(kibanaRoot, 'docs/reference/visualizations-api'));
const tablesDir = path.join(outputDir, '_tables');

// ─── Chart type definitions ───────────────────────────────────────────────────

const CHART_TYPES = [
  { file: 'metric',        label: 'Metric',               noESQL: 'metricNoESQL',        esql: 'metricESQL' },
  { file: 'xy',            label: 'XY (line, area, bar)', noESQL: 'xyChartNoESQL',        esql: 'xyChartESQL' },
  { file: 'gauge',         label: 'Gauge',                noESQL: 'gaugeNoESQL',          esql: 'gaugeESQL' },
  { file: 'heatmap',       label: 'Heatmap',              noESQL: 'heatmapNoESQL',        esql: 'heatmapESQL' },
  { file: 'tagcloud',      label: 'Tag cloud',            noESQL: 'tagcloudNoESQL',       esql: 'tagcloudESQL' },
  { file: 'region-map',    label: 'Region map',           noESQL: 'regionMapNoESQL',      esql: 'regionMapESQL' },
  { file: 'datatable',     label: 'Data table',           noESQL: 'datatableNoESQL',      esql: 'datatableESQL' },
  { file: 'pie',           label: 'Pie / donut',          noESQL: 'pieNoESQL',            esql: 'pieESQL' },
  { file: 'mosaic',        label: 'Mosaic',               noESQL: 'mosaicNoESQL',         esql: 'mosaicESQL' },
  { file: 'treemap',       label: 'Treemap',              noESQL: 'treemapNoESQL',        esql: 'treemapESQL' },
  { file: 'waffle',        label: 'Waffle',               noESQL: 'waffleNoESQL',         esql: 'waffleESQL' },
  { file: 'legacy-metric', label: 'Legacy metric',        noESQL: 'legacyMetricNoESQL',   esql: null },
];

// Extra sub-tables specific to the XY chart (layers + legend).
// Listed here because they come from xyLayersNoESQL anyOf branches, not direct properties.
const XY_EXTRA_SUB_TABLES = [
  {
    label: 'Data layer',
    csvFile: 'xy-layer-data.csv',
    variants: ['xyLayerNoESQL', 'xyLayerESQL'],
  },
  {
    label: 'Reference line layer',
    csvFile: 'xy-layer-reference-line.csv',
    variants: ['xyReferenceLineLayerNoESQL'],
  },
  {
    label: 'Annotation layer',
    csvFile: 'xy-layer-annotation.csv',
    variants: ['xyAnnotationLayerNoESQL'],
  },
  {
    label: 'Legend',
    csvFile: 'xy-legend.csv',
    variants: ['xyLegendOutsideHorizontal', 'xyLegendOutsideVertical', 'xyLegendInside'],
    mergeNotes: { size: 'Outside vertical legend only.', columns: 'Inside legend only.' },
  },
];

// ─── OAS loading ──────────────────────────────────────────────────────────────

console.log(`Reading OAS: ${inputPath}`);
const oas = yaml.load(fs.readFileSync(inputPath, 'utf8'));
const schemas = oas.components.schemas;
const OAS_PREFIX = 'Kibana_HTTP_APIs_';

// ─── Reference resolution ─────────────────────────────────────────────────────

function resolveRef(ref) {
  if (!ref.startsWith('#/')) throw new Error(`External $ref not supported: ${ref}`);
  const parts = ref.slice(2).split('/');
  let node = oas;
  for (const part of parts) {
    node = node[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (node === undefined) throw new Error(`Cannot resolve: ${ref}`);
  }
  return node;
}

function resolve(schema) {
  return schema.$ref ? resolveRef(schema.$ref) : schema;
}

function mergeAllOf(schema) {
  if (!schema.allOf) return schema;
  const merged = { properties: {}, required: [] };
  for (const sub of schema.allOf) {
    const r = resolve(sub);
    const e = mergeAllOf(r);
    Object.assign(merged.properties, e.properties || {});
    merged.required.push(...(e.required || []));
    if (!merged.description && e.description) merged.description = e.description;
  }
  return merged;
}

function effective(schema) {
  return mergeAllOf(resolve(schema));
}

// ─── Type label ───────────────────────────────────────────────────────────────

function shortName(name) {
  return name.replace(OAS_PREFIX, '');
}

function flattenUnion(arr) {
  const result = [];
  for (const s of arr) {
    if (s.anyOf) result.push(...flattenUnion(s.anyOf));
    else if (s.oneOf) result.push(...flattenUnion(s.oneOf));
    else result.push(s);
  }
  return result;
}

/**
 * Merge properties from multiple inline object variants.
 * For enum fields that differ across variants (like a `type` discriminator),
 * combines all enum values rather than overwriting.
 */
function mergeInlineObjectProps(variants) {
  const result = {};
  for (const v of variants) {
    for (const [k, propSchema] of Object.entries(effective(v).properties || {})) {
      if (!result[k]) {
        result[k] = propSchema;
      } else {
        // Combine enum values from discriminator fields
        const existing = result[k];
        const incoming = propSchema;
        if (existing.enum && incoming.enum) {
          result[k] = { ...existing, enum: [...new Set([...existing.enum, ...incoming.enum])] };
        }
        // For all other cases keep the first occurrence
      }
    }
  }
  return result;
}

/** Simple type category for column 1 (e.g. string, number, boolean, array, object). */
function typeSimple(schema) {
  if (!schema) return 'any';
  if (schema.$ref) return 'object';
  if (schema.const !== undefined) return typeof schema.const === 'number' ? 'number' : 'string';
  if (schema.enum) return typeof schema.enum[0] === 'number' ? 'number' : 'string';

  if (schema.anyOf || schema.oneOf) {
    const flat = flattenUnion(schema.anyOf || schema.oneOf);
    const types = [...new Set(flat.map(s => {
      if (s.$ref) return 'object';
      if (s.properties || s.type === 'object') return 'object';
      if (s.enum || s.const !== undefined) return typeof (s.enum?.[0] ?? s.const) === 'number' ? 'number' : 'string';
      return s.type || 'any';
    }).filter(t => t !== 'null'))];
    return types.length === 1 ? types[0] : 'any';
  }

  if (schema.type === 'array') return 'array';
  return schema.type || 'object';
}

/** Possible values / item types to surface into column 2. Returns a sentence or null. */
function metaValues(rawProp) {
  const s = resolve(rawProp);

  if (s.const !== undefined) return `Value: \`"${s.const}"\``;
  if (s.enum) return `Possible values: ${s.enum.map(v => typeof v === 'string' ? `\`"${v}"\`` : `\`${v}\``).join(', ')}`;

  if (s.anyOf || s.oneOf) {
    const flat = flattenUnion(s.anyOf || s.oneOf);
    // All string enums/consts → list them
    const enumVals = [];
    let hasRef = false;
    for (const item of flat) {
      if (item.$ref) { hasRef = true; break; }
      if (item.enum) enumVals.push(...item.enum.map(v => typeof v === 'string' ? `\`"${v}"\`` : `\`${v}\``));
      else if (item.const !== undefined) enumVals.push(typeof item.const === 'string' ? `\`"${item.const}"\`` : `\`${item.const}\``);
    }
    if (!hasRef && enumVals.length > 0) return `Possible values: ${[...new Set(enumVals)].join(', ')}`;
    // All $refs → list named types
    const refs = flat.filter(s => s.$ref).map(s => `\`${shortName(s.$ref.split('/').pop())}\``);
    if (refs.length > 0 && refs.length === flat.length) return `One of: ${[...new Set(refs)].join(', ')}`;
    // Inline objects with type discriminator
    const typeEnums = flat.filter(s => !s.$ref && s.properties?.type?.enum)
      .flatMap(s => s.properties.type.enum.map(v => `\`"${v}"\``));
    if (typeEnums.length > 0) return `Types: ${[...new Set(typeEnums)].join(', ')}`;
  }

  // Array items
  if ((s.type === 'array' || rawProp.type === 'array') && s.items) {
    const itemsEff = effective(s.items);
    if (itemsEff.anyOf || itemsEff.oneOf) {
      const flat = flattenUnion(itemsEff.anyOf || itemsEff.oneOf);
      const refs = flat.filter(s => s.$ref).map(s => shortName(s.$ref.split('/').pop()));
      // Skip internal implementation schemas (e.g. kbn-as-code-* generated names)
      const userFacingRefs = refs.filter(r => !r.includes('_asCode') && !r.startsWith('kbn-as-code-'));
      if (userFacingRefs.length > 0) return `Items: ${[...new Set(userFacingRefs.map(r => `\`${r}\``))].join(', ')}`;
      const typeEnums = flat.filter(s => !s.$ref && s.properties?.type?.enum)
        .flatMap(s => s.properties.type.enum.map(v => `\`"${v}"\``));
      if (typeEnums.length > 0) return `Types: ${[...new Set(typeEnums)].join(', ')}`;
    }
    if (s.items.$ref) {
      const refName = shortName(s.items.$ref.split('/').pop());
      if (!refName.includes('_asCode') && !refName.startsWith('kbn-as-code-'))
        return `Items: \`${refName}\``;
    }
  }

  return null;
}

/** "Default: `value`" string or null. */
function defaultMeta(schema) {
  const s = effective(schema);
  if (s.default === undefined) return null;
  const v = s.default;
  return `Default: ${typeof v === 'string' ? `\`"${v}"\`` : `\`${JSON.stringify(v)}\``}`;
}

/** Build column 1: `name`<br>_type_<br>**required** (with optional anchor link on name). */
function col1(fieldPath, rawProp, required, anchor) {
  const type = typeSimple(rawProp);
  const namePart = anchor ? `[\`${fieldPath}\`](${anchor})` : `\`${fieldPath}\``;
  return [namePart, `_${type}_`, ...(required ? ['**required**'] : [])].join('<br>');
}

/** Build column 2: description + possible values + default. */
function col2(rawProp, baseDescription) {
  const parts = [];
  if (baseDescription) {
    // Ensure description ends with punctuation so the next sentence reads cleanly
    parts.push(/[.!?]$/.test(baseDescription) ? baseDescription : `${baseDescription}.`);
  }
  const values = metaValues(rawProp);
  if (values) parts.push(`${values}.`);
  // Skip default annotation if the description already mentions it
  const def = defaultMeta(rawProp);
  if (def && !/default/i.test(baseDescription)) parts.push(`${def}.`);
  return parts.join(' ');
}

// ─── Schema walker ────────────────────────────────────────────────────────────

/**
 * Walk a schema's properties and append rows. Stops at depthLimit.
 * Each row: [col1, col2]  (2-column format)
 * anchorMap: { propName → anchor } for top-level fields that link to sub-sections.
 */
function collectRows(schema, parentPath, depth, rows, depthLimit, anchorMap = {}) {
  if (depth > depthLimit) return;

  const s = effective(schema);
  const properties = s.properties || {};
  const requiredSet = new Set(s.required || []);

  for (const [name, rawProp] of Object.entries(properties)) {
    const fieldPath = parentPath ? `${parentPath}.${name}` : name;
    const propEff = effective(rawProp);

    const required = requiredSet.has(name);
    const description = (propEff.description || rawProp.description || '').replace(/\n/g, ' ').trim();
    const anchor = anchorMap[name] || null;

    rows.push([col1(fieldPath, rawProp, required, anchor), col2(rawProp, description)]);

    // Recurse into plain objects (not unions)
    if (propEff.properties && !propEff.anyOf && !propEff.oneOf) {
      collectRows(propEff, fieldPath, depth + 1, rows, depthLimit);
    }

    // Recurse into array items
    if ((propEff.type === 'array' || rawProp.type === 'array') && propEff.items) {
      const itemsEff = effective(propEff.items);
      if (itemsEff.properties && !itemsEff.anyOf && !itemsEff.oneOf) {
        collectRows(itemsEff, `${fieldPath}[]`, depth + 1, rows, depthLimit);
      } else if (itemsEff.anyOf || itemsEff.oneOf) {
        const variants = flattenUnion(itemsEff.anyOf || itemsEff.oneOf);
        const inlineObjects = variants.filter(v => !v.$ref && v.properties);
        if (inlineObjects.length > 0 && inlineObjects.length === variants.length) {
          const merged = { properties: mergeInlineObjectProps(inlineObjects) };
          if (Object.keys(merged.properties).length > 0) {
            collectRows(merged, `${fieldPath}[]`, depth + 1, rows, depthLimit);
          }
        }
      }
    }
  }
}

// ─── Section anchors ─────────────────────────────────────────────────────────

/** Convert a section label to a URL anchor. */
function toAnchor(label) {
  return '#' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ─── Top-level rows (depth 0, links to sub-table sections) ───────────────────

function mergedTopLevelRows(noESQLSchema, esqlSchema, anchorMap = {}) {
  const s = effective(noESQLSchema);
  const requiredSet = new Set(s.required || []);
  const esqlDS = esqlSchema?.properties?.data_source;

  return Object.entries(s.properties || {}).map(([name, rawProp]) => {
    const propEff = effective(rawProp);
    const required = requiredSet.has(name);
    const description = (propEff.description || rawProp.description || '').replace(/\n/g, ' ').trim();

    // For data_source, combine NoESQL + ES|QL variants into one anyOf for metaValues
    let displayProp = rawProp;
    if (name === 'data_source' && esqlDS) {
      const noEsqlFlat = (rawProp.anyOf || rawProp.oneOf) ? flattenUnion(rawProp.anyOf || rawProp.oneOf) : (rawProp.$ref ? [rawProp] : []);
      const esqlFlat = (esqlDS.anyOf || esqlDS.oneOf) ? flattenUnion(esqlDS.anyOf || esqlDS.oneOf) : (esqlDS.$ref ? [esqlDS] : []);
      displayProp = { anyOf: [...noEsqlFlat, ...esqlFlat] };
    }

    const anchor = anchorMap[name] || null;
    const c1 = col1(name, displayProp, required, anchor);

    let c2 = col2(displayProp, description);
    if (name === 'query') {
      c2 = c2 ? `${c2} Not used with ES|QL data sources.` : 'Not used with ES|QL data sources.';
    }

    return [c1, c2];
  });
}

// ─── Sub-table detection ──────────────────────────────────────────────────────

/**
 * Returns true if a schema has at least one nested level of properties,
 * i.e. at least one direct property is itself a $ref or has sub-properties.
 */
function hasNestedProps(schema) {
  return Object.values(schema.properties || {}).some(p => {
    const e = effective(p);
    return (e.properties && Object.keys(e.properties).length > 0) || e.anyOf || e.oneOf || e.allOf;
  });
}

/**
 * Scan a chart schema's direct properties for candidates worth a sub-table.
 * A property qualifies if the resolved type:
 *   - has >= 4 direct properties, OR
 *   - has >= 1 direct property AND at least one nested level
 * Returns [{ propName, label, csvFile, schema, depthLimit }]
 */
function detectSubTables(chartFile, noESQLSchemaName, sharedCsvFiles) {
  const chartSchema = schemas[OAS_PREFIX + noESQLSchemaName];
  const s = effective(chartSchema);
  const subTables = [];

  for (const [propName, rawProp] of Object.entries(s.properties || {})) {
    // Case 1: direct $ref to a named type
    if (rawProp.$ref) {
      const refSchemaName = rawProp.$ref.split('/').pop();
      const refSchema = schemas[refSchemaName];
      if (!refSchema) continue;

      const refEff = effective(refSchema);
      const topCount = Object.keys(refEff.properties || {}).length;
      if (refEff.anyOf || refEff.oneOf) continue; // union types shown inline

      const worthy = topCount >= 4 || (topCount >= 1 && hasNestedProps(refEff));
      if (!worthy) continue;

      subTables.push({
        propName,
        label: propName.replace(/_/g, ' ').replace(/^(.)/, c => c.toUpperCase()),
        csvFile: `${chartFile}-${propName}.csv`,
        schema: refEff,
        depthLimit: 2,
      });
    }

    // Case 2: array with inline-object items (like drilldowns)
    const propEff = effective(rawProp);
    if ((propEff.type === 'array' || rawProp.type === 'array') && propEff.items) {
      const itemsEff = effective(propEff.items);
      const unionArr = itemsEff.anyOf || itemsEff.oneOf;
      if (!unionArr) continue;

      const variants = flattenUnion(unionArr);
      const inlineObjects = variants.filter(v => !v.$ref && v.properties);
      if (inlineObjects.length === 0 || inlineObjects.length !== variants.length) continue;

      const merged = { properties: mergeInlineObjectProps(inlineObjects) };
      if (Object.keys(merged.properties).length < 3) continue;

      // Use a shared CSV for types that appear identically across all charts (drilldowns)
      const csvFile = propName === 'drilldowns'
        ? 'shared-drilldowns.csv'
        : `${chartFile}-${propName}.csv`;

      const isNew = !subTables.some(t => t.csvFile === csvFile);
      if (isNew) {
        subTables.push({
          propName,
          label: propName.replace(/_/g, ' ').replace(/^(.)/, c => c.toUpperCase()),
          csvFile,
          schema: merged,
          depthLimit: 1,
          shared: csvFile.startsWith('shared-'),
        });
      }
    }
  }

  return subTables;
}

// ─── Multi-variant merge (legend variants, etc.) ──────────────────────────────

function mergedVariantRows(variantSchemas, mergeNotes = {}, depthLimit = 2) {
  const allRows = [];
  const seenKeys = new Set();

  for (const schema of variantSchemas) {
    const rows = [];
    collectRows(schema, '', 0, rows, depthLimit);
    for (const row of rows) {
      const fieldName = row[0].match(/`([^`]+)`/)?.[1] ?? row[0];
      if (!seenKeys.has(fieldName)) {
        seenKeys.add(fieldName);
        allRows.push(row);
      }
    }
  }

  return allRows.map(([c1, c2]) => {
    const fieldName = c1.match(/`([^`]+)`/)?.[1] ?? '';
    if (mergeNotes[fieldName]) {
      return [c1, c2 ? `${c2} ${mergeNotes[fieldName]}` : mergeNotes[fieldName]];
    }
    return [c1, c2];
  });
}

// ─── CSV serialization ────────────────────────────────────────────────────────

function toCsv(rows) {
  const HEADER = ['Parameter', 'Description'];
  return [HEADER, ...rows]
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    )
    .join('\n');
}

function writeTable(csvFile, rows) {
  const filePath = path.join(tablesDir, csvFile);
  fs.writeFileSync(filePath, toCsv(rows));
  console.log(`  ${csvFile}: ${rows.length} fields`);
}

// ─── Markdown page generation ─────────────────────────────────────────────────

function mdPage(chartType, subTables) {
  const { file, label } = chartType;
  const lines = [
    `---`,
    `applies_to:`,
    `  stack: preview 9.4+`,
    `  serverless: preview`,
    `navigation_title: ${label}`,
    `---`,
    ``,
    `# ${label} chart`,
    ``,
    `Top-level configuration fields.`,
    ``,
    `:::{csv-include} _tables/${file}.csv`,
    `:::`,
  ];

  const regularSubs = subTables.filter(t => !t.isExtraSection);
  const extraSections = subTables.filter(t => t.isExtraSection);

  for (const sub of regularSubs) {
    lines.push('', `## ${sub.label}`, '');
    lines.push(`:::{csv-include} _tables/${sub.csvFile}`, `:::`);
  }

  for (const section of extraSections) {
    lines.push('', `## ${section.label}`, '');
    if (section.intro) lines.push('', section.intro, '');
    for (const item of section.items) {
      lines.push('', `### ${item.label}`, '');
      lines.push(`:::{csv-include} _tables/${item.csvFile}`, `:::`);
    }
  }

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(tablesDir, { recursive: true });

const sharedCsvFiles = new Set();

for (const chartType of CHART_TYPES) {
  const { file, label, noESQL, esql } = chartType;
  console.log(`\n${label}:`);

  const noESQLSchema = schemas[OAS_PREFIX + noESQL];
  const esqlSchema = esql ? schemas[OAS_PREFIX + esql] : null;
  if (!noESQLSchema) { console.warn(`  Skipping: schema not found for ${noESQL}`); continue; }

  // 2. Auto-detected sub-tables (needed before top-level CSV for anchor map)
  const subTables = detectSubTables(file, noESQL, sharedCsvFiles);
  for (const sub of subTables) {
    if (sub.shared && sharedCsvFiles.has(sub.csvFile)) continue; // write CSV once
    const rows = [];
    collectRows(sub.schema, '', 0, rows, sub.depthLimit);
    writeTable(sub.csvFile, rows);
    if (sub.shared) sharedCsvFiles.add(sub.csvFile);
  }

  // Build anchor map: propName → section anchor on this page
  const anchorMap = {};
  for (const sub of subTables) {
    if (sub.propName) anchorMap[sub.propName] = toAnchor(sub.label);
  }
  // XY: layers and legend come from extra sub-tables, not detectSubTables
  if (file === 'xy') {
    anchorMap['layers'] = '#layers';
    anchorMap['legend'] = '#legend';
  }

  // 1. Top-level table (with links to sub-table sections)
  writeTable(`${file}.csv`, mergedTopLevelRows(noESQLSchema, esqlSchema, anchorMap));

  // 3. XY-specific extra sub-tables
  let extraSections = [];
  if (file === 'xy') {
    const layerItems = [];
    for (const extra of XY_EXTRA_SUB_TABLES) {
      const variantSchemas = extra.variants
        .map(n => schemas[OAS_PREFIX + n])
        .filter(Boolean);
      if (variantSchemas.length === 0) continue;
      const rows = mergedVariantRows(variantSchemas, extra.mergeNotes || {}, 2);
      writeTable(extra.csvFile, rows);
      layerItems.push({ label: extra.label, csvFile: extra.csvFile });
    }
    // Split: layers go in one section, legend in another
    const layerSection = {
      label: 'Layers',
      intro: 'Each entry in the `layers` array must match one of the following types.',
      items: layerItems.filter(i => i.csvFile.includes('layer')),
      isExtraSection: true,
    };
    const legendSection = {
      label: 'Legend',
      items: layerItems.filter(i => i.csvFile.includes('legend')),
      isExtraSection: true,
    };
    extraSections = [layerSection, legendSection].filter(s => s.items.length > 0);
  }

  // 4. Generate .md page
  const allSubs = [...subTables, ...extraSections];
  const mdContent = mdPage(chartType, allSubs);
  const mdPath = path.join(outputDir, `${file}.md`);
  fs.writeFileSync(mdPath, mdContent);
  console.log(`  → ${file}.md`);
}

console.log('\nDone. Files written to:', outputDir);
