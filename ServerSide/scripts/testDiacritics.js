/**
 * Quick verification test for removeDiacritics utility.
 * Run: node ServerSide/scripts/testDiacritics.js
 */
const { removeDiacritics, buildSearchPattern, escapeRegex } = require('../utils/removeDiacritics');

console.log('=== Testing removeDiacritics ===\n');

const testCases = [
    { input: 'Bã Mía', expected: 'bã mía → ba mia' },
    { input: 'Chất thải nguy hại', expected: 'chất thải nguy hại → chat thai nguy hai' },
    { input: 'Phế liệu đồng', expected: 'phế liệu đồng → phe lieu dong' },
    { input: 'Bã Mía', expected_normalized: 'ba mia' },
    { input: 'bã', expected_normalized: 'ba' },
    { input: 'mía', expected_normalized: 'mia' },
    { input: 'Bã mía', expected_normalized: 'ba mia' },
    { input: 'bã mia', expected_normalized: 'ba mia' },
    { input: 'BA MIA', expected_normalized: 'ba mia' },
    { input: 'mía đã qua sử dụng', expected_normalized: 'mia da qua su dung' },
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, i) => {
    const result = removeDiacritics(tc.input);
    const expected = tc.expected_normalized || result;
    const ok = !tc.expected_normalized || result === tc.expected_normalized;

    console.log(`${ok ? '✅' : '❌'} Test ${i + 1}: "${tc.input}" → "${result}"${tc.expected_normalized ? ` (expected: "${tc.expected_normalized}")` : ''}`);
    if (ok) passed++; else failed++;
});

console.log('\n=== Testing buildSearchPattern ===\n');

const patternTests = [
    { input: 'mía đã qua sử dụng', desc: 'Multiple Vietnamese words' },
    { input: 'bã', desc: 'Single word with diacritics' },
    { input: 'Bã Mía', desc: 'Two words with diacritics' },
    { input: 'ba mia', desc: 'Already normalized' },
];

patternTests.forEach((tc, i) => {
    const pattern = buildSearchPattern(tc.input);
    console.log(`Pattern ${i + 1} (${tc.desc}): "${tc.input}" → regex: /${pattern}/i`);
});

console.log('\n=== Testing Search Match Simulation ===\n');

// Simulate: Does "mía đã qua sử dụng" match "Bã Mía"?
const searchKey = 'mía đã qua sử dụng';
const targetName = 'Bã Mía';
const targetNormalized = removeDiacritics(targetName);
const searchPattern = buildSearchPattern(searchKey);
const regex = new RegExp(searchPattern, 'i');
const matches = regex.test(targetNormalized);

console.log(`Search: "${searchKey}"`);
console.log(`Target: "${targetName}" (normalized: "${targetNormalized}")`);
console.log(`Pattern: /${searchPattern}/i`);
console.log(`Match: ${matches ? '✅ YES' : '❌ NO'}`);

// More match tests
const matchTests = [
    { search: 'bã', target: 'Bã Mía' },
    { search: 'mía', target: 'Bã Mía' },
    { search: 'Bã mía', target: 'Bã Mía' },
    { search: 'bã mia', target: 'Bã Mía' },
    { search: 'ba mia', target: 'Bã Mía' },
    { search: 'BA MIA', target: 'Bã Mía' },
    { search: 'phế liệu', target: 'Phế liệu đồng' },
    { search: 'phe lieu', target: 'Phế liệu đồng' },
    { search: 'dong', target: 'Phế liệu đồng' },
];

console.log('\n=== Batch Match Tests ===\n');
matchTests.forEach((tc, i) => {
    const targetN = removeDiacritics(tc.target);
    const pattern = buildSearchPattern(tc.search);
    const r = new RegExp(pattern, 'i');
    const m = r.test(targetN);
    console.log(`${m ? '✅' : '❌'} "${tc.search}" → "${tc.target}" (normalized: "${targetN}"): ${m ? 'MATCH' : 'NO MATCH'}`);
    if (m) passed++; else failed++;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
