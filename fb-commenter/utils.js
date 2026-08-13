import fs from 'fs';
import path from 'path';

/**
 * Safely loads and parses a JSON file.
 * @param {string} filePath 
 * @param {*} defaultValue 
 * @returns {*}
 */
export function loadJson(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[\u274c Error] Failed to read or parse JSON file at ${filePath}:`, error.message);
    return defaultValue;
  }
}

/**
 * Standard log function with timestamp.
 * @param {string} prefix 
 * @param {string} message 
 * @param {string} colorCode 
 */
export function log(prefix, message, colorCode = '\x1b[36m') { // default cyan
  const timestamp = new Date().toLocaleString();
  const resetColor = '\x1b[0m';
  console.log(`[${timestamp}] ${colorCode}[${prefix}]${resetColor} ${message}`);
}

/**
 * Wait for a random delay between minSec and maxSec.
 * Logs progress.
 * @param {number} minSec 
 * @param {number} maxSec 
 * @returns {Promise<void>}
 */
export function randomDelay(minSec, maxSec) {
  const min = Math.min(minSec, maxSec);
  const max = Math.max(minSec, maxSec);
  const delaySec = Math.floor(Math.random() * (max - min + 1)) + min;
  
  log('Delay', `Waiting for ${delaySec} seconds...`, '\x1b[33m'); // yellow prefix
  return new Promise(resolve => setTimeout(resolve, delaySec * 1000));
}

/**
 * Renders comment template by replacing placeholders.
 * @param {string} template 
 * @param {object} placeholders 
 * @returns {string}
 */
export function processTemplate(template, placeholders = {}) {
  let text = template;
  
  const authorName = placeholders.author ? placeholders.author.trim() : '';
  const groupName = placeholders.group ? placeholders.group.trim() : '';

  // Fallbacks if names are empty or not extractable
  const finalAuthor = authorName || 'there';
  const finalGroup = groupName || 'this group';

  text = text.replace(/{author}/gi, finalAuthor);
  text = text.replace(/{group}/gi, finalGroup);

  return text;
}

/**
 * Fisher-Yates shuffle algorithm to randomize comment arrays.
 * @param {Array} array 
 * @returns {Array}
 */
export function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Nice terminal countdown display.
 * @param {number} totalSeconds 
 * @returns {Promise<void>}
 */
export function runCountdown(totalSeconds) {
  return new Promise((resolve) => {
    let remaining = totalSeconds;
    const interval = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(interval);
        process.stdout.write('\r\x1b[K'); // clear line
        resolve();
        return;
      }
      
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      
      const timeString = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');

      process.stdout.write(`\r\x1b[32m[Countdown]\x1b[0m Next run in: ${timeString} (Press Ctrl+C to stop)`);
      remaining--;
    }, 1000);
  });
}
