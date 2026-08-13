import { processTemplate, shuffleArray, loadJson } from './utils.js';

let passed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`[\u274c FAILED] ${message}`);
    passed = false;
  } else {
    console.log(`[\u2705 PASSED] ${message}`);
  }
}

console.log('Running Facebook Commenter Bot Unit Tests...\n');

// 1. Test template processing
const template = "Hello {author}, welcome to the {group} group!";
const result = processTemplate(template, { author: "Alice", group: "Tech Talks" });
assert(result === "Hello Alice, welcome to the Tech Talks group!", "processTemplate correctly replaces placeholders");

const resultEmpty = processTemplate(template, { author: "", group: "" });
assert(resultEmpty === "Hello there, welcome to the this group group!", "processTemplate uses fallbacks for empty strings");

const resultNull = processTemplate(template, {});
assert(resultNull === "Hello there, welcome to the this group group!", "processTemplate uses fallbacks for missing keys");

// 2. Test shuffleArray
const originalArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shuffled = shuffleArray(originalArray);
assert(shuffled.length === originalArray.length, "shuffleArray maintains the correct length");
assert(shuffled.every(val => originalArray.includes(val)), "shuffleArray contains all original elements");
// Check that it's actually shuffled (very high probability that the order changes)
const isDifferent = shuffled.some((val, idx) => val !== originalArray[idx]);
assert(isDifferent, "shuffleArray changes order of elements");

// 3. Test loadJson
const nonExistent = loadJson('non-existent-file.json', { fallback: true });
assert(nonExistent.fallback === true, "loadJson handles non-existent files and returns fallback default value");

const configData = loadJson('config.json', null);
assert(configData !== null && typeof configData === 'object', "loadJson successfully reads and parses config.json");

if (passed) {
  console.log('\n\u2705 All core tests passed successfully!');
  process.exit(0);
} else {
  console.error('\n\u274c Some tests failed!');
  process.exit(1);
}
