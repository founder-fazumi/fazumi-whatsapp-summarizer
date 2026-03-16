/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Manual test: redirect validation
 * Run: node -e "require('./lib/auth/safe-redirect.test.js')"
 */

const { isValidAppRelativePath, sanitizeRedirectPath } = require('./lib/auth/safe-redirect.ts');

// Test cases
const tests = [
  // ALLOWED
  { input: "/dashboard", expected: true, desc: "allowed: /dashboard" },
  { input: "/history?id=123", expected: true, desc: "allowed: /history?id=123" },
  { input: "/billing?tab=plan", expected: true, desc: "allowed: /billing?tab=plan" },
  { input: "/summarize", expected: true, desc: "allowed: /summarize" },
  { input: "/settings", expected: true, desc: "allowed: /settings" },
  { input: "/founder-supporter", expected: true, desc: "allowed: /founder-supporter" },
  { input: "/path/with/slashes", expected: true, desc: "allowed: nested path" },
  { input: "/path?query=value&other=123", expected: true, desc: "allowed: path with multiple query params" },
  
  // REJECTED
  { input: "//attacker.com", expected: false, desc: "rejected: //attacker.com" },
  { input: "///attacker.com", expected: false, desc: "rejected: ///attacker.com" },
  { input: "https://attacker.com", expected: false, desc: "rejected: https://attacker.com" },
  { input: "http://attacker.com", expected: false, desc: "rejected: http://attacker.com" },
  { input: "javascript:alert(1)", expected: false, desc: "rejected: javascript:alert(1)" },
  { input: "data:text/html,hello", expected: false, desc: "rejected: data: URL" },
  { input: "vbscript:msgbox(1)", expected: false, desc: "rejected: vbscript:" },
  { input: "", expected: false, desc: "rejected: empty string" },
  { input: null, expected: false, desc: "rejected: null" },
  { input: undefined, expected: false, desc: "rejected: undefined" },
  { input: "   ", expected: false, desc: "rejected: whitespace only" },
  { input: " /dashboard", expected: false, desc: "rejected: leading space before /" },
  { input: "/dashboard\\", expected: false, desc: "rejected: backslash in path" },
  { input: "/dashboard\\attacker.com", expected: false, desc: "rejected: backslash attack" },
  { input: "JAVASCRIPT:alert(1)", expected: false, desc: "rejected: uppercase javascript:" },
  { input: "/dashboard\n", expected: false, desc: "rejected: newline in path" },
  { input: "/dashboard\r", expected: false, desc: "rejected: CR in path" },
];

let passed = 0;
let failed = 0;

console.log("Testing isValidAppRelativePath():\n");

tests.forEach(({ input, expected, desc }) => {
  const result = isValidAppRelativePath(input);
  const pass = result === expected;
  
  if (pass) {
    passed++;
    console.log(`✓ ${desc}`);
  } else {
    failed++;
    console.log(`✗ ${desc} — got ${result}, expected ${expected}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);

// Test sanitizeRedirectPath fallback behavior
console.log("\n\nTesting sanitizeRedirectPath() fallback:\n");

const fallbackTests = [
  { input: "//attacker.com", expected: "/dashboard", desc: "falls back for //attacker.com" },
  { input: "https://evil.com", expected: "/dashboard", desc: "falls back for https://evil.com" },
  { input: null, expected: "/dashboard", desc: "falls back for null" },
  { input: undefined, expected: "/dashboard", desc: "falls back for undefined" },
  { input: "/history?id=123", expected: "/history?id=123", desc: "keeps valid /history?id=123" },
];

let fallbackPassed = 0;
let fallbackFailed = 0;

fallbackTests.forEach(({ input, expected, desc }) => {
  const result = sanitizeRedirectPath(input);
  const pass = result === expected;
  
  if (pass) {
    fallbackPassed++;
    console.log(`✓ ${desc}`);
  } else {
    fallbackFailed++;
    console.log(`✗ ${desc} — got ${result}, expected ${expected}`);
  }
});

console.log(`\n${fallbackPassed} passed, ${fallbackFailed} failed`);

if (failed === 0 && fallbackFailed === 0) {
  console.log("\n✓ All tests passed!");
  process.exit(0);
} else {
  console.log("\n✗ Some tests failed!");
  process.exit(1);
}
