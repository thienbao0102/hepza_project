#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function riskLevel(alert) {
  const risk = String(alert.riskdesc || alert.risk || '').toLowerCase();
  if (risk.includes('high')) return 'error';
  if (risk.includes('medium')) return 'warning';
  if (risk.includes('low')) return 'note';
  return 'none';
}

function flattenAlerts(zapReport) {
  const alerts = [];
  for (const site of zapReport.site || []) {
    for (const alert of site.alerts || []) {
      alerts.push({ site, alert });
    }
  }
  return alerts;
}

function toSarif(zapReport) {
  const rules = new Map();
  const results = [];

  for (const { site, alert } of flattenAlerts(zapReport)) {
    const ruleId = String(alert.pluginid || alert.id || alert.alertRef || alert.name || 'zap-alert');
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: alert.alert || alert.name || `ZAP ${ruleId}`,
        shortDescription: { text: alert.alert || alert.name || `ZAP ${ruleId}` },
        fullDescription: { text: alert.desc || alert.description || '' },
        help: {
          text: [alert.desc, alert.solution, alert.reference].filter(Boolean).join('\n\n'),
        },
        properties: {
          precision: 'medium',
          'security-severity': String(alert.riskcode || ''),
          tags: ['security', 'zap', String(alert.riskdesc || alert.risk || 'informational')],
        },
      });
    }

    const instances = Array.isArray(alert.instances) && alert.instances.length > 0 ? alert.instances : [{}];
    for (const instance of instances) {
      const uri = instance.uri || site['@name'] || zapReport['@generated'] || 'unknown';
      const message = [
        alert.alert || alert.name || 'ZAP alert',
        alert.riskdesc ? `Risk: ${alert.riskdesc}` : '',
        instance.method ? `Method: ${instance.method}` : '',
        instance.param ? `Parameter: ${instance.param}` : '',
        instance.evidence ? `Evidence: ${instance.evidence}` : '',
      ].filter(Boolean).join(' | ');

      results.push({
        ruleId,
        level: riskLevel(alert),
        message: { text: message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri },
            },
          },
        ],
        properties: {
          confidence: alert.confidence || alert.confidencedesc || undefined,
          cweid: alert.cweid || undefined,
          wascid: alert.wascid || undefined,
        },
      });
    }
  }

  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'OWASP ZAP',
            informationUri: 'https://www.zaproxy.org/',
            rules: Array.from(rules.values()),
          },
        },
        results,
      },
    ],
  };
}

const args = parseArgs(process.argv);
if (!args.input || !args.output) {
  console.error('Usage: zap-json-to-sarif.js --input zap-report.json --output zap-report.sarif');
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(args.input, 'utf8'));
const sarif = toSarif(input);
fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, `${JSON.stringify(sarif, null, 2)}\n`);
console.log(`Wrote ${sarif.runs[0].results.length} ZAP SARIF result(s) to ${args.output}`);