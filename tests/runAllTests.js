// Runs every test module in sequence. Each module throws (via node:assert) on failure.
console.log('==========================================');
console.log('Running Level Up Adventure test suite');
console.log('==========================================\n');

const suites = [
  './textUtils.test.js',
  './gameUtils.test.js',
  './authUtils.test.js',
  './bugFixes.test.js',
  './adversarialStateLogic.test.js',
  './boundaryStress.test.js',
  './portalUtils.test.js'
];

try {
  for (const suite of suites) {
    await import(suite);
  }

  console.log('\n==========================================');
  console.log(`ALL ${suites.length} TEST SUITES PASSED`);
  console.log('==========================================');
} catch (error) {
  console.error('\nTEST FAILURE:', error);
  process.exit(1);
}
