/*
 * Post-processing script that replaces ugly auto-generated titles
 * in the built OAS output with human-readable ones.
 *
 * Usage: node scripts/add_schema_titles.js output/kibana.yaml
 */

const fs = require('fs');
const path = require('path');
const yaml = require(path.resolve(__dirname, '..', '..', 'node_modules', 'js-yaml'));

// Map from ugly title string (as it appears in the YAML) → clean title
const replacements = {
  // Dashboard panels
  'lens': 'Lens',
  'image': 'Image',
  'markdown': 'Markdown',
  'esql_control': 'ES|QL control',
  'options_list_control': 'Options list control',
  'range_slider_control': 'Range slider control',
  'time_slider_control': 'Time slider control',
  'slo_alerts': 'SLO alerts',
  'slo_burn_rate': 'SLO burn rate',
  'slo_error_budget': 'SLO error budget',
  'slo_overview': 'SLO overview',
  'synthetics_monitors': 'Synthetics monitors',
  'synthetics_stats_overview': 'Synthetics stats',
  // SLO embeddables
  'slo-alerts-embeddable': 'SLO alerts',
  'slo-burn-rate-embeddable': 'SLO burn rate',
  'slo-error-budget-embeddable': 'SLO error budget',
  'slo-group-overview-embeddable': 'SLO group overview',
  'slo-single-overview-embeddable': 'SLO single overview',
  // Shared schemas
  'kbn-as-code-meta': 'Metadata',
  'kbn-content-management-utils-referenceSchema': 'Reference',
  'kbn-data-service-server-refreshIntervalSchema': 'Refresh interval',
  'kbn-es-query-server-querySchema': 'Query',
  'kbn-es-query-server-timeRangeSchema': 'Time range',
  'kbn-as-code-filters-schema_groupFilter': 'Condition or group',
  // Drilldowns
  'dashboard_drilldown': 'Dashboard drilldown',
  'discover_drilldown': 'Discover drilldown',
  'url_drilldown': 'URL drilldown',
  // Section
  'section': 'Section',
};

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/add_schema_titles.js <yaml-file>');
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
let count = 0;

function fix(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) fix(item);
    return;
  }
  if (typeof obj.title === 'string' && replacements[obj.title]) {
    obj.title = replacements[obj.title];
    count++;
  }
  for (const val of Object.values(obj)) fix(val);
}

fix(doc);

fs.writeFileSync(filePath, yaml.dump(doc, { lineWidth: 200, noRefs: true }));
console.log(`Fixed ${count} schema titles in ${path.basename(filePath)}`);
