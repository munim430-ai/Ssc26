import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { loadJson, log, randomDelay, processTemplate, shuffleArray, runCountdown } from './utils.js';

// Setup file paths
const configPath = path.resolve('config.json');
const groupsPath = path.resolve('groups.json');
const commentsPath = path.resolve('comments.json');
const cookiesPath = path.resolve('cookies.json');

// Check if dry-run mode is enabled via command line args
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

/**
 * Main automation execution logic
 */
async function runBot() {
  log('System', 'Starting Facebook Automated Commenter Bot...', '\x1b[32m');
  if (isDryRun) {
    log('System', '=== RUNNING IN DRY-RUN MODE (No comments will actually be submitted) ===', '\x1b[35m');
  }

  // Load configs
  const config = loadJson(configPath, {
    headless: false,
    runOnce: false,
    intervalHours: 2,
    postsPerGroup: 3,
    minDelaySeconds: 60,
    maxDelaySeconds: 180
  });

  const groups = loadJson(groupsPath, []);
  const commentsList = loadJson(commentsPath, []);

  if (groups.length === 0) {
    log('Error', 'No group URLs found in groups.json. Please add groups first.', '\x1b[31m');
    return;
  }

  if (commentsList.length === 0) {
    log('Error', 'No comments found in comments.json. Please add comments first.', '\x1b[31m');
    return;
  }

  if (!fs.existsSync(cookiesPath)) {
    log('Error', 'cookies.json file not found! Please export your Facebook cookies.json first. Reference cookies.json.example.', '\x1b[31m');
    return;
  }

  const cookies = loadJson(cookiesPath, []);
  if (cookies.length === 0) {
    log('Error', 'cookies.json is empty or invalid!', '\x1b[31m');
    return;
  }

  log('System', `Configuration Loaded:
  - Groups count: ${groups.length}
  - Comments pool size: ${commentsList.length}
  - Posts per group: ${config.postsPerGroup}
  - Delay range: ${config.minDelaySeconds}s - ${config.maxDelaySeconds}s
  - Headless: ${config.headless}
  - Mode: ${config.runOnce ? 'Run-Once' : 'Persistent Loop'}`, '\x1b[36m');

  log('Auth', 'Launching browser and setting up Facebook session...', '\x1b[34m');

  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  // Setup browser context with standard desktop User-Agent and viewport
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US'
  });

  // Inject Facebook session cookies
  try {
    await context.addCookies(cookies);
    log('Auth', 'Session cookies injected successfully.', '\x1b[32m');
  } catch (err) {
    log('Error', `Failed to inject cookies: ${err.message}`, '\x1b[31m');
    await browser.close();
    return;
  }

  const page = await context.newPage();

  // Process each group
  for (let gIndex = 0; gIndex < groups.length; gIndex++) {
    const groupUrl = groups[gIndex];
    log('Scrape', `----------------------------------------`, '\x1b[35m');
    log('Scrape', `Processing Group (${gIndex + 1}/${groups.length}): ${groupUrl}`, '\x1b[35m');

    try {
      // Navigate to the group page
      await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait for a few seconds to let elements load
      await page.waitForTimeout(5000);

      // Extract group name
      let groupName = 'Facebook Group';
      try {
        const title = await page.title();
        if (title) {
          groupName = title.replace(/\s*\|\s*Facebook/gi, '')
                           .replace(/\s*\|\s*Groups/gi, '')
                           .trim();
        }
        
        // Alternative: selector for group name heading
        const headingLocator = page.locator('h1').first();
        if (await headingLocator.isVisible()) {
          const headingText = await headingLocator.textContent();
          if (headingText) groupName = headingText.trim();
        }
      } catch (err) {
        log('Warning', `Could not extract group name: ${err.message}`, '\x1b[33m');
      }

      log('Scrape', `Connected to: "${groupName}"`, '\x1b[32m');

      // Scroll down slightly to trigger loading of posts
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(3000);

      // Locate posts. We search for divs representing Facebook posts.
      // div[role="article"] is the standard container for Facebook posts/feeds.
      const postSelector = 'div[role="article"]';
      await page.waitForSelector(postSelector, { timeout: 15000 }).catch(() => {});
      
      const allPosts = page.locator(postSelector);
      const postCount = await allPosts.count();
      log('Scrape', `Found ${postCount} potential post containers on screen.`, '\x1b[36m');

      if (postCount === 0) {
        log('Warning', `No posts detected. Check if your cookies are valid or if the group URL is correct.`, '\x1b[33m');
        continue;
      }

      // Limit to configured number of posts
      const targetCount = Math.min(postCount, config.postsPerGroup);
      log('Scrape', `Will process top ${targetCount} posts.`, '\x1b[36m');

      // Prepare a shuffled comment list for this group run to prevent consecutive duplicates
      let commentPool = shuffleArray(commentsList);
      let commentsUsed = 0;

      for (let pIndex = 0; pIndex < targetCount; pIndex++) {
        log('Post', `Analyzing post ${pIndex + 1} of ${targetCount}...`, '\x1b[36m');
        const post = allPosts.nth(pIndex);

        // Scroll the post into view
        try {
          await post.scrollIntoViewIfNeeded({ timeout: 5000 });
          await page.waitForTimeout(1000);
        } catch (err) {
          log('Warning', `Failed to scroll post ${pIndex + 1} into view. Skipping.`, '\x1b[33m');
          continue;
        }

        // 1. Extract Post Author
        let authorName = 'there';
        try {
          // Look for links that represent the author profile (usually the first links in the post header)
          // Often nested in h2, h3, strong, or spans.
          const headerLinks = post.locator('h2 a, h3 a, strong a, a[role="link"]');
          const linksCount = await headerLinks.count();
          
          for (let l = 0; l < Math.min(linksCount, 5); l++) {
            const text = await headerLinks.nth(l).textContent();
            const href = await headerLinks.nth(l).getAttribute('href');
            // Filter out common metadata links like timestamps, hashtags, group name links
            if (text && text.trim().length > 1 && href && !href.includes('/groups/') && !href.includes('/posts/') && !text.includes('Join')) {
              authorName = text.trim();
              break;
            }
          }
        } catch (err) {
          log('Warning', `Could not extract author name: ${err.message}`, '\x1b[33m');
        }

        log('Post', `Post Author detected: "${authorName}"`, '\x1b[36m');

        // 2. Locate Comment Box
        // Often, we need to click the "Comment" button under the post first to reveal the input box.
        // It has text like "Comment" or role="button" with comment text/icon.
        const commentButton = post.locator('div[role="button"]:has-text("Comment"), div[aria-label="Comment"], text="Comment"').first();
        let commentBoxOpened = false;

        if (await commentButton.isVisible()) {
          try {
            await commentButton.click();
            await page.waitForTimeout(2000);
            commentBoxOpened = true;
            log('Post', 'Clicked "Comment" button to open input field.', '\x1b[34m');
          } catch (err) {
            log('Warning', `Failed to click Comment button: ${err.message}`, '\x1b[33m');
          }
        }

        // Locate the active commenting textbox
        // Selectors: role="textbox", contenteditable="true", or aria-label containing "comment"
        const textboxSelectors = [
          'div[role="textbox"]',
          'div[contenteditable="true"]',
          'div[aria-label*="comment" i]',
          'div[aria-label*="Comment" i]'
        ];

        let textbox = null;
        for (const selector of textboxSelectors) {
          const tbLocator = post.locator(selector).first();
          if (await tbLocator.isVisible()) {
            textbox = tbLocator;
            break;
          }
        }

        if (!textbox) {
          log('Warning', 'Could not locate comment input textbox. Skipping this post.', '\x1b[33m');
          continue;
        }

        // 3. Prepare Comment Text
        if (commentPool.length === 0) {
          // Recycle comments if pool is exhausted
          commentPool = shuffleArray(commentsList);
        }
        const commentTemplate = commentPool.pop();
        const commentText = processTemplate(commentTemplate, { author: authorName, group: groupName });

        log('Post', `Drafting comment: "${commentText}"`, '\x1b[36m');

        if (isDryRun) {
          log('Post', `[Dry Run] SKIPPED typing and submitting comment.`, '\x1b[35m');
        } else {
          try {
            // Focus the textbox
            await textbox.focus();
            await page.waitForTimeout(500);

            // Type the comment mimicking human speed (50-150ms per key)
            await textbox.pressSequentially(commentText, { delay: 100 });
            await page.waitForTimeout(1000);

            // Submit comment by pressing Enter
            await textbox.press('Enter');
            log('Post', 'Comment submitted successfully.', '\x1b[32m');
            
            // Wait for 5 seconds to let Facebook process the comment
            await page.waitForTimeout(5000);
            commentsUsed++;
          } catch (err) {
            log('Error', `Failed to post comment: ${err.message}`, '\x1b[31m');
          }
        }

        // Delay between posts in the same group (except after the last post)
        if (pIndex < targetCount - 1) {
          await randomDelay(config.minDelaySeconds, config.maxDelaySeconds);
        }
      }

      log('Scrape', `Completed commenting on ${isDryRun ? 'N/A (Dry-Run)' : commentsUsed} posts in "${groupName}".`, '\x1b[32m');

    } catch (err) {
      log('Error', `Failed processing group ${groupUrl}: ${err.message}`, '\x1b[31m');
    }

    // Delay between groups
    if (gIndex < groups.length - 1) {
      log('System', 'Delaying before moving to the next group...', '\x1b[33m');
      await randomDelay(config.minDelaySeconds, config.maxDelaySeconds);
    }
  }

  log('System', 'Run complete. Closing browser.', '\x1b[32m');
  await browser.close();
}

/**
 * Orchestrator loop
 */
async function main() {
  const config = loadJson(configPath, { runOnce: false, intervalHours: 2 });
  
  if (config.runOnce) {
    await runBot();
    log('System', 'Run-Once mode active. Exiting.', '\x1b[32m');
    process.exit(0);
  } else {
    while (true) {
      await runBot();
      
      const waitSeconds = config.intervalHours * 3600;
      log('Scheduler', `Waiting ${config.intervalHours} hours until next run...`, '\x1b[32m');
      await runCountdown(waitSeconds);
      console.log('\n'); // Carriage return after countdown finishes
    }
  }
}

main().catch(err => {
  log('Fatal', `Unhandled error in main execution: ${err.message}`, '\x1b[31m');
  process.exit(1);
});
