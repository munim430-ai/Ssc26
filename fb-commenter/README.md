# Facebook Automated Commenter Bot

A lightweight, local Node.js automation bot built with Playwright to comment on the top posts of public Facebook groups using session cookies.

---

## Features

- **Session Injection**: Login is handled via exported browser cookies. No passwords or 2FA needed programmatically, reducing block risks.
- **Dynamic Personalization**: Automatically replaces placeholders like `{author}` (post creator's name) and `{group}` (group name) inside comments.
- **Anti-Bot Throttling**: Random delays between comments, shuffled comment selection to avoid duplicate sequences, and human-like typing simulation.
- **Hybrid Run Modes**: Can run as a persistent background process in terminal, or run once and exit (for scheduling via Windows Task Scheduler).
- **Dry Run Mode**: Safe dry-run command (`npm run dry-run`) to check target paths and mock comments without submitting them.

---

## Project Structure

- `index.js`: Core automation engine and runner.
- `utils.js`: Helpers for delays, template rendering, and terminal logging.
- `config.json`: General parameters (delays, headless mode, execution mode, post limit).
- `groups.json`: List of Facebook Group URLs to comment on.
- `comments.json`: Pool of comment templates.
- `cookies.json`: Active Facebook cookies (copy from `cookies.json.example` and replace).

---

## Setup Instructions

### 1. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).
Open a terminal in the `fb-commenter` directory and run:
```bash
npm install
npx playwright install chromium
```

### 2. Configure Files

1. **`groups.json`**: Add your target public Facebook group URLs. Example:
   ```json
   [
     "https://www.facebook.com/groups/marketing-tips-global",
     "https://www.facebook.com/groups/local-business-exchange"
   ]
   ```
2. **`comments.json`**: List your comments. Use `{author}` and `{group}` placeholders for organic-looking comments:
   ```json
   [
     "Great share, {author}! Thanks for posting this in the {group} group.",
     "This is very helpful, {author}. Appreciate your insights!"
   ]
   ```
3. **`config.json`**: Adjust settings to fit your needs:
   - `headless`: `false` (shows browser window) or `true` (runs in background). Set to `false` first to monitor.
   - `runOnce`: `true` (run once and exit) or `false` (run in continuous loop every N hours).
   - `intervalHours`: Hours to wait between loops (e.g. `2`).
   - `postsPerGroup`: Number of top posts per group to comment on (e.g. `3` to `10`).
   - `minDelaySeconds` / `maxDelaySeconds`: Delay interval between comments (e.g. `60` and `180`).

---

## 3. Extract Facebook Session Cookies

Facebook blocks standard automated login methods. You must extract session cookies from your active Chrome session. We provide an automated script to do this:

### Option A: Automatic Extraction (Recommended)
1. Close all open Chrome browser windows completely.
2. Launch Chrome with remote debugging enabled from your terminal or Run (Win + R) dialog:
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```
3. Go to [Facebook](https://www.facebook.com) in this new browser window, log in, and **switch to your Page profile** (the profile you want to comment from).
4. Keep that Chrome window open, go back to your command prompt in the `fb-commenter` folder, and run:
   ```bash
   npm run get-cookies
   ```
This automatically captures the cookies from your active window and saves them to `cookies.json`!

### Option B: Manual Extraction (Fallback)
1. In your regular browser, log in to Facebook and switch to your Page profile.
2. Install a cookie exporter extension (like **EditThisCookie** or **Get cookies.txt LOCALLY**).
3. Export cookies in **JSON** format.
4. Save the copied contents into a new file named `cookies.json` inside the `fb-commenter` directory.

---

## How to Run

### 1. Test Safely with Dry Run
Run this command to simulate the bot. It will launch the browser, navigate to the groups, identify posts/authors, and print the draft comments, but **will not write or submit any comments**:
```bash
npm run dry-run
```

### 2. Live Run
To start the commenter live (which will post comments):
```bash
npm start
```

---

## Continuous Running Options

### Option A: Persistent Console Process (Default)
In `config.json`, set:
```json
"runOnce": false,
"intervalHours": 2
```
Leave the terminal window open. The script will execute, comment, and show a countdown ticker until the next run triggers in 2 hours.

### Option B: Windows Task Scheduler
In `config.json`, set:
```json
"runOnce": true
```
Then create a task in Windows Task Scheduler:
1. Trigger: **One time** (repeat task every **2 hours** indefinitely).
2. Action: **Start a program**.
3. Program/script: `node`
4. Add arguments: `index.js`
5. Start in (optional): Specify the absolute path to your `fb-commenter` directory.
