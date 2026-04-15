#!/usr/bin/env node
/**
 * Seed script for SIEM Migrations mock data.
 *
 * Creates 3 migrations in different states so the Automatic Migrations UI can be tested:
 *   1. "Splunk Enterprise — SOC core rules"  → FINISHED / needs review (mixed results)
 *   2. "QRadar — Threat detection rules"     → INTERRUPTED (looks like in-progress)
 *   3. "Splunk — Identity & access rules"    → FINISHED / all clean (fully translated)
 *
 * Usage (from Kibana repo root):
 *   node x-pack/solutions/security/plugins/security_solution/scripts/seed_siem_migrations.js
 *   node x-pack/solutions/security/plugins/security_solution/scripts/seed_siem_migrations.js --delete
 *
 * Requirements: Kibana running on localhost:5601 with elastic/changeme credentials.
 */

'use strict';

const http = require('http');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const KIBANA_BASEPATH = process.env.KIBANA_BASEPATH || '';
const KIBANA_USER = 'elastic';
const KIBANA_PASS = 'changeme';
const SPACE_ID = 'sec'; // The Security solution space

// ES indices (space-scoped)
const ES_URL = 'http://localhost:9200';
const ES_MIGRATIONS_INDEX = `.kibana-siem-rule-migrations-migrations-${SPACE_ID}`;
const ES_RULES_INDEX = `.kibana-siem-rule-migrations-rules-${SPACE_ID}`;

const SEED_TAG = 'seed_mock_data'; // stored in rule comments so we can delete seeded data

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function request(method, url, body, auth) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'elastic-api-version': '1',
        'x-elastic-internal-origin': 'kibana',
        ...(auth ? { Authorization: 'Basic ' + Buffer.from(auth).toString('base64') } : {}),
      },
    };
    const bodyStr = body ? JSON.stringify(body) : undefined;
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const kibana = (method, path, body) =>
  request(method, `${KIBANA_URL}${KIBANA_BASEPATH}/s/${SPACE_ID}${path}`, body, `${KIBANA_USER}:${KIBANA_PASS}`);

const es = (method, path, body) =>
  request(method, `${ES_URL}${path}`, body, `${KIBANA_USER}:${KIBANA_PASS}`);

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ---------------------------------------------------------------------------
// Rule data
// ---------------------------------------------------------------------------
const SPLUNK_RULES_SOC = [
  {
    id: 'splunk-soc-001',
    vendor: 'splunk',
    title: 'Brute Force Login Attempts',
    description: 'Detects multiple failed authentication attempts from a single source IP.',
    query: 'index=main sourcetype=WinEventLog EventCode=4625 | stats count by src_ip | where count > 10',
    query_language: 'spl',
    severity: 'high',
  },
  {
    id: 'splunk-soc-002',
    vendor: 'splunk',
    title: 'Lateral Movement — Pass the Hash',
    description: 'Identifies NTLM authentication anomalies indicative of Pass-the-Hash attacks.',
    query: 'index=main sourcetype=WinEventLog EventCode=4624 Logon_Type=3 Authentication_Package=NTLM | stats dc(Account_Name) as unique_accounts by src_ip | where unique_accounts > 3',
    query_language: 'spl',
    severity: 'critical',
  },
  {
    id: 'splunk-soc-003',
    vendor: 'splunk',
    title: 'Suspicious PowerShell Execution',
    description: 'Detects encoded PowerShell commands that may indicate malicious activity.',
    query: 'index=main sourcetype=WinEventLog EventCode=4688 Process_Name=*powershell* CommandLine=*-encodedcommand* | table _time, host, Account_Name, CommandLine',
    query_language: 'spl',
    severity: 'high',
  },
  {
    id: 'splunk-soc-004',
    vendor: 'splunk',
    title: 'AWS CloudTrail — Root Account Usage',
    description: 'Detects use of the AWS root account which should never be used for routine tasks.',
    query: 'index=main sourcetype=aws:cloudtrail userIdentity.type=Root eventName!=ConsoleLogin | stats count by eventName, sourceIPAddress',
    query_language: 'spl',
    severity: 'critical',
    annotations: { mitre_attack: ['T1078.004'] },
  },
  {
    id: 'splunk-soc-005',
    vendor: 'splunk',
    title: 'Data Exfiltration — Large Outbound Transfer',
    description: 'Alerts on unusually large outbound data transfers that may indicate exfiltration.',
    query: 'index=main sourcetype=firewall action=allowed direction=outbound | stats sum(bytes_out) as total_bytes by src_ip, dest_ip | where total_bytes > 104857600',
    query_language: 'spl',
    severity: 'high',
  },
  {
    id: 'splunk-soc-006',
    vendor: 'splunk',
    title: 'Persistence — Scheduled Task Created',
    description: 'Detects creation of new scheduled tasks which are commonly used for persistence.',
    query: 'index=main sourcetype=WinEventLog EventCode=4698 | table _time, host, Account_Name, Task_Name, Task_Content',
    query_language: 'spl',
    severity: 'medium',
    annotations: { mitre_attack: ['T1053.005'] },
  },
];

// Using splunk vendor for the "QRadar" migration since full QRadar XML parsing is complex
// The migration name communicates the source; the seed focuses on UI state testing
const QRADAR_STYLE_RULES = [
  {
    id: 'qradar-td-001',
    vendor: 'splunk',
    title: 'SQL Injection Attempt',
    description: 'Detects potential SQL injection attacks targeting web applications.',
    query: 'index=main sourcetype=access_combined uri="*\' OR 1=1*" OR uri="*UNION SELECT*" | stats count by src_ip, uri | where count > 0',
    query_language: 'spl',
    severity: 'critical',
  },
  {
    id: 'qradar-td-002',
    vendor: 'splunk',
    title: 'Network Port Scan Detected',
    description: 'Identifies hosts performing port scanning activity across the network.',
    query: 'index=main sourcetype=firewall direction=outbound protocol=tcp | stats dc(dest_port) as port_count by src_ip | where port_count > 100',
    query_language: 'spl',
    severity: 'high',
  },
  {
    id: 'qradar-td-003',
    vendor: 'splunk',
    title: 'Privilege Escalation — sudo Usage',
    description: 'Monitors for unexpected privilege escalation via sudo on Linux hosts.',
    query: 'index=main sourcetype=linux_secure sudo NOT "session opened" | table _time, host, user, command',
    query_language: 'spl',
    severity: 'medium',
  },
  {
    id: 'qradar-td-004',
    vendor: 'splunk',
    title: 'Malware — Suspicious DNS Queries',
    description: 'Detects DNS queries to known malicious domains or unusual DGA-like patterns.',
    query: 'index=main sourcetype=stream:dns | eval qlen=len(query) | where qlen > 50 | stats count by src_ip, query | where count > 5',
    query_language: 'spl',
    severity: 'high',
  },
];

const SPLUNK_RULES_IAM = [
  {
    id: 'splunk-iam-001',
    vendor: 'splunk',
    title: 'New Admin Account Created',
    description: 'Detects creation of new accounts with administrative privileges.',
    query: 'index=main sourcetype=WinEventLog EventCode=4720 OR EventCode=4728 | table _time, host, Account_Name, Subject_Account_Name, Privilege_List',
    query_language: 'spl',
    severity: 'high',
    annotations: { mitre_attack: ['T1136.001'] },
  },
  {
    id: 'splunk-iam-002',
    vendor: 'splunk',
    title: 'Account Lockout — Possible Credential Stuffing',
    description: 'Identifies multiple account lockouts indicating a credential stuffing campaign.',
    query: 'index=main sourcetype=WinEventLog EventCode=4740 | stats count by _time span=5m | where count > 5',
    query_language: 'spl',
    severity: 'medium',
  },
  {
    id: 'splunk-iam-003',
    vendor: 'splunk',
    title: 'MFA Disabled for User',
    description: 'Alerts when multi-factor authentication is disabled for a user account.',
    query: 'index=main sourcetype=o365:management:activity Operation=Disable_StrongAuthentication | table _time, UserId, ClientIP, ResultStatus',
    query_language: 'spl',
    severity: 'high',
  },
  {
    id: 'splunk-iam-004',
    vendor: 'splunk',
    title: 'Service Account Anomalous Login',
    description: 'Detects service account logins from unexpected source IPs or at unusual hours.',
    query: 'index=main sourcetype=WinEventLog EventCode=4624 Account_Name=*svc* Logon_Type=10 | stats count by Account_Name, src_ip | where count > 0',
    query_language: 'spl',
    severity: 'medium',
  },
];

// ---------------------------------------------------------------------------
// Status update helpers — write translated results directly to ES
// ---------------------------------------------------------------------------
async function updateRuleInES(ruleId, update) {
  const r = await es('POST', `/${ES_RULES_INDEX}/_update/${ruleId}`, { doc: update });
  assert(r.status >= 200 && r.status < 300, `ES update failed for ${ruleId}: ${JSON.stringify(r.body)}`);
}

async function setRuleTranslated(ruleDoc, { translationResult = 'full', esQuery, comment } = {}) {
  const ruleId = ruleDoc.id;
  const title = ruleDoc.original_rule?.title ?? 'Translated rule';
  const now = new Date().toISOString();
  const update = {
    status: 'completed',
    translation_result: translationResult,
    updated_at: now,
    updated_by: 'seed_script',
    elastic_rule: {
      title,
      description: ruleDoc.original_rule?.description ?? '',
      severity: 'medium',
      risk_score: 47,
      query: esQuery || 'FROM logs-* | WHERE event.action IS NOT NULL | LIMIT 100',
      query_language: 'esql',
    },
  };
  if (comment) {
    update.comments = [{ message: comment, created_at: now, created_by: 'assistant' }];
  }
  if (translationResult === 'untranslatable') {
    delete update.elastic_rule;
    update.comments = [
      {
        message: comment || 'This rule uses proprietary syntax that cannot be automatically translated to ES|QL.',
        created_at: now,
        created_by: 'assistant',
      },
    ];
  }
  await updateRuleInES(ruleId, update);
}

async function setRuleFailed(ruleDoc, errorMsg) {
  const ruleId = ruleDoc.id;
  await updateRuleInES(ruleId, {
    status: 'failed',
    updated_at: new Date().toISOString(),
    updated_by: 'seed_script',
    comments: [
      {
        message: errorMsg,
        created_at: new Date().toISOString(),
        created_by: 'assistant',
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Search seeded rules by tag
// ---------------------------------------------------------------------------
async function findSeededMigrationIds() {
  const r = await es('POST', `/${ES_MIGRATIONS_INDEX}/_search`, {
    size: 100,
    query: { match: { name: 'SEED:' } }, // match prefix we add to names
  });
  if (r.status === 404) return [];
  return (r.body?.hits?.hits || []).map((h) => h._id);
}

async function findSeededRuleIds() {
  const r = await es('POST', `/${ES_RULES_INDEX}/_search`, {
    size: 1000,
    query: { term: { 'comments.created_by': SEED_TAG } },
  });
  if (r.status === 404) return [];
  return (r.body?.hits?.hits || []).map((h) => h._id);
}

// ---------------------------------------------------------------------------
// Wait for ES refresh
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------------------------------------------------------------------------
// Create migration + upload rules
// ---------------------------------------------------------------------------
async function createMigration(name) {
  const r = await kibana('PUT', '/internal/siem_migrations/rules', { name: `SEED: ${name}` });
  assert(r.status === 200, `Create migration failed (${r.status}): ${JSON.stringify(r.body)}`);
  const migrationId = r.body.migration_id;
  console.log(`  ✓ Created migration "${name}" → ${migrationId}`);
  return migrationId;
}

async function uploadRules(migrationId, rules) {
  const r = await kibana('POST', `/internal/siem_migrations/rules/${migrationId}/rules`, rules);
  assert(r.status === 200 || r.status === 204, `Upload rules failed (${r.status}): ${JSON.stringify(r.body)}`);
  console.log(`  ✓ Uploaded ${rules.length} rules`);
  // Wait for ES to index
  await sleep(1500);
}

async function getRulesForMigration(migrationId) {
  const r = await es('POST', `/${ES_RULES_INDEX}/_search`, {
    size: 100,
    query: { term: { migration_id: migrationId } },
    sort: [{ '@timestamp': 'asc' }],
  });
  assert(r.status === 200, `ES rules search failed: ${JSON.stringify(r.body)}`);
  return (r.body?.hits?.hits || []).map((h) => ({ id: h._id, ...h._source }));
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function seed() {
  console.log('\n🌱 Seeding SIEM Migrations mock data...\n');

  // ── Migration 1: Splunk SOC (FINISHED, needs review) ──────────────────────
  console.log('📋 Migration 1: Splunk Enterprise — SOC core rules (needs review)');
  const m1id = await createMigration('Splunk Enterprise — SOC core rules');
  await uploadRules(m1id, SPLUNK_RULES_SOC);

  const m1rules = await getRulesForMigration(m1id);
  assert(m1rules.length === 6, `Expected 6 rules, got ${m1rules.length}`);

  // Rule 0: fully translated
  await setRuleTranslated(m1rules[0], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.security-* | WHERE event.code == "4625" | STATS count = COUNT(*) BY source.ip | WHERE count > 10 | SORT count DESC`,
  });
  // Rule 1: fully translated
  await setRuleTranslated(m1rules[1], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.security-* | WHERE event.code == "4624" AND winlog.event_data.LogonType == "3" AND winlog.event_data.AuthenticationPackageName == "NTLM" | STATS unique_accounts = COUNT_DISTINCT(winlog.event_data.TargetUserName) BY source.ip | WHERE unique_accounts > 3`,
  });
  // Rule 2: fully translated
  await setRuleTranslated(m1rules[2], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.process-* | WHERE process.name LIKE "*powershell*" AND process.command_line LIKE "*-encodedcommand*" | KEEP @timestamp, host.name, user.name, process.command_line`,
  });
  // Rule 3: partially translated (needs AWS CloudTrail integration)
  await setRuleTranslated(m1rules[3], {
    translationResult: 'partial',
    esQuery: `FROM logs-aws.cloudtrail-* | WHERE cloud.account.id IS NOT NULL AND user.name == "root" AND event.action != "ConsoleLogin" | STATS count = COUNT(*) BY event.action, source.ip`,
    comment: 'AWS CloudTrail integration required. Install the AWS integration and enable CloudTrail data stream to ensure full data coverage.',
  });
  // Rule 4: partially translated (custom index pattern)
  await setRuleTranslated(m1rules[4], {
    translationResult: 'partial',
    esQuery: `FROM [logs-network.traffic-*] | WHERE network.direction == "outbound" AND event.outcome == "success" | STATS total_bytes = SUM(network.bytes) BY source.ip, destination.ip | WHERE total_bytes > 104857600`,
    comment: 'The translated query uses a placeholder index pattern [logs-network.traffic-*]. Update this with the actual index pattern for your firewall data.',
  });
  // Rule 5: failed (untranslatable)
  await setRuleTranslated(m1rules[5], {
    translationResult: 'untranslatable',
    comment: 'This rule uses a Splunk-specific macro `schtasks_filter` that has no direct equivalent in Elasticsearch. Manual translation required.',
  });

  // Update migration created_at to ~8 days ago
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await es('POST', `/${ES_MIGRATIONS_INDEX}/_update/${m1id}`, {
    doc: {
      created_at: eightDaysAgo,
      last_execution: {
        started_at: eightDaysAgo,
        finished_at: twoHoursAgo,
        total_execution_time_ms: 43200000,
        connector_id: 'mock-connector',
      },
    },
  });
  console.log('  ✓ Set timestamps and execution metadata\n');

  // ── Migration 2: QRadar (INTERRUPTED — simulates in-progress) ─────────────
  console.log('📋 Migration 2: QRadar — Threat detection rules (in progress)');
  const m2id = await createMigration('QRadar — Threat detection rules');
  await uploadRules(m2id, QRADAR_STYLE_RULES);

  const m2rules = await getRulesForMigration(m2id);
  assert(m2rules.length === 4, `Expected 4 rules, got ${m2rules.length}`);

  // Only process 3 rules, leave 1 pending → status = INTERRUPTED
  await setRuleTranslated(m2rules[0], {
    translationResult: 'full',
    esQuery: `FROM logs-*.access-* | WHERE url.query LIKE "*' OR 1=1*" OR url.query LIKE "*UNION SELECT*" | STATS count = COUNT(*) BY user.name, source.ip | WHERE count > 0`,
  });
  await setRuleTranslated(m2rules[1], {
    translationResult: 'full',
    esQuery: `FROM logs-network.traffic-* | WHERE network.direction == "outbound" AND network.transport == "tcp" | STATS port_count = COUNT_DISTINCT(destination.port) BY source.ip | WHERE port_count > 100`,
  });
  await setRuleTranslated(m2rules[2], {
    translationResult: 'partial',
    esQuery: `FROM logs-system.auth-* | WHERE process.name == "sudo" AND message NOT LIKE "*session opened*" | KEEP @timestamp, host.name, user.name, message`,
    comment: 'Rule partially translated. The original AQL query used QRadar-specific category identifiers that have been approximated using Elastic ECS fields.',
  });
  // m2rules[3] stays as 'pending' — this makes status = INTERRUPTED

  // Update timestamps
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await es('POST', `/${ES_MIGRATIONS_INDEX}/_update/${m2id}`, {
    doc: {
      created_at: twoDaysAgo,
      last_execution: {
        started_at: twoDaysAgo,
        finished_at: null,
        connector_id: 'mock-connector',
        is_stopped: false,
      },
    },
  });
  console.log('  ✓ Set timestamps (1 rule left pending = INTERRUPTED state)\n');

  // ── Migration 3: Splunk IAM (FINISHED, all clean) ─────────────────────────
  console.log('📋 Migration 3: Splunk — Identity & access rules (completed)');
  const m3id = await createMigration('Splunk — Identity & access rules');
  await uploadRules(m3id, SPLUNK_RULES_IAM);

  const m3rules = await getRulesForMigration(m3id);
  assert(m3rules.length === 4, `Expected 4 rules, got ${m3rules.length}`);

  await setRuleTranslated(m3rules[0], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.security-* | WHERE event.code IN ("4720", "4728") | KEEP @timestamp, host.name, winlog.event_data.TargetUserName, winlog.event_data.SubjectUserName`,
  });
  await setRuleTranslated(m3rules[1], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.security-* | WHERE event.code == "4740" | STATS lockout_count = COUNT(*) BY @timestamp = DATE_TRUNC(5 minutes, @timestamp) | WHERE lockout_count > 5`,
  });
  await setRuleTranslated(m3rules[2], {
    translationResult: 'full',
    esQuery: `FROM logs-o365.audit-* | WHERE event.action == "Disable StrongAuthentication" | KEEP @timestamp, user.name, source.ip, event.outcome`,
  });
  await setRuleTranslated(m3rules[3], {
    translationResult: 'full',
    esQuery: `FROM logs-endpoint.events.security-* | WHERE event.code == "4624" AND user.name LIKE "*svc*" AND winlog.event_data.LogonType == "10" | STATS count = COUNT(*) BY user.name, source.ip`,
  });

  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
  const sixWeeksAgoEnd = new Date(Date.now() - 41 * 24 * 60 * 60 * 1000).toISOString();
  await es('POST', `/${ES_MIGRATIONS_INDEX}/_update/${m3id}`, {
    doc: {
      created_at: sixWeeksAgo,
      last_execution: {
        started_at: sixWeeksAgo,
        finished_at: sixWeeksAgoEnd,
        total_execution_time_ms: 7200000,
        connector_id: 'mock-connector',
      },
    },
  });
  console.log('  ✓ Set timestamps\n');

  // Final refresh
  await es('POST', `/${ES_MIGRATIONS_INDEX}/_refresh`);
  await es('POST', `/${ES_RULES_INDEX}/_refresh`);

  console.log('✅ Done! Open http://localhost:5601/app/security/siem_migrations/rules to see the data.');
  console.log('   To delete: run with --delete flag');
}

// ---------------------------------------------------------------------------
// Delete seeded data
// ---------------------------------------------------------------------------
async function deleteSeedData() {
  console.log('\n🗑️  Deleting seeded SIEM Migrations data...\n');

  // Find all migrations with "SEED:" prefix
  const r = await es('POST', `/${ES_MIGRATIONS_INDEX}/_search`, {
    size: 100,
    query: { prefix: { name: 'SEED:' } },
  });

  if (r.status === 404 || !r.body?.hits?.hits?.length) {
    console.log('  No seeded migrations found.');
    return;
  }

  const migrations = r.body.hits.hits;
  console.log(`  Found ${migrations.length} seeded migration(s)`);

  for (const migration of migrations) {
    const migrationId = migration._id;
    const name = migration._source.name;

    // Delete rules for this migration
    const delRules = await es('POST', `/${ES_RULES_INDEX}/_delete_by_query`, {
      query: { term: { migration_id: migrationId } },
    });
    console.log(`  ✓ Deleted ${delRules.body?.deleted ?? 0} rules for "${name}"`);

    // Delete the migration document
    const delMigration = await es('DELETE', `/${ES_MIGRATIONS_INDEX}/_doc/${migrationId}`);
    assert(
      delMigration.status === 200,
      `Failed to delete migration ${migrationId}: ${JSON.stringify(delMigration.body)}`
    );
    console.log(`  ✓ Deleted migration "${name}"`);
  }

  await es('POST', `/${ES_MIGRATIONS_INDEX}/_refresh`);
  await es('POST', `/${ES_RULES_INDEX}/_refresh`);
  console.log('\n✅ Seeded data deleted.');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(async () => {
  const isDelete = process.argv.includes('--delete');
  try {
    if (isDelete) {
      await deleteSeedData();
    } else {
      await seed();
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
})();
