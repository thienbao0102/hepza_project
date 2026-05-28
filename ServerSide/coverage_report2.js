const fs = require('fs');
const c = JSON.parse(fs.readFileSync('coverage_tmp6/coverage-summary.json', 'utf8'));
const arr = Object.entries(c)
    .filter(([f]) => f.endsWith('.js') && !f.includes('__tests__') && !f.includes('node_modules'))
    .map(([f, v]) => ({
        file: f.replace(process.cwd(), ''),
        statements: v.statements.pct,
        uncovered: v.statements.total - v.statements.covered,
    }))
    .sort((a, b) => b.uncovered - a.uncovered);
console.log(arr.slice(0, 25).map(x => `${x.file} | stmts:${x.statements}% | miss:${x.uncovered}`).join('\n'));
