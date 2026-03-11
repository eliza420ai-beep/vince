---
title: "Every morning at 9 AM, a script tests our signup and onboarding flow. Fresh signup. Full onboarding...."
source: chat://vince-upload/1770077924902
category: setup-guides
tags:
  - vince-upload
  - user-submitted
  - chat
created: 2026-02-03T00:18:44.902Z
wordCount: 1322
last_reviewed: 2026-02-15
---

# Every morning at 9 AM, a script tests our signup and onboarding flow. Fresh signup. Full onboarding....

Every morning at 9 AM, a script tests our signup and onboarding flow. Fresh signup. Full onboarding. Every agent tool. If something breaks, a bug appears in our tracker before we've finished coffee.
Time to implement: 1 hour (just point your agent at this post to get started)
What you'll get: A complete daily E2E runner that catches regressions you'd otherwise miss for days
TL;DR
Runs daily at 9 AM via macOS launchd (adaptable to CI)
Fresh user every run – deletes from DB, auth provider, and payment provider before signup
Google OAuth fully unattended – uses a pre-signed Chrome debug profile
Auto-files bugs – creates a ticket with errors when tests fail
Why agent-driven e2e is different
This isn't Playwright or Cypress in CI.
Here's why we built something different:
Traditional E2E relies on brittle CSS selectors, hardcoded test sequences, and fails on any UI change. It runs on PR to gate deployments and expects deterministic results.
Agent-Driven E2E uses accessibility tree snapshots and adapts to semantic changes. It runs daily to catch regressions and gives you "real user journey" confidence.
When to use this approach:
Your app has AI/chat flows with adaptive responses
You want to test the _actual_ user journey, not a mocked version
You're okay with "daily safety net" rather than PR gating
You have OAuth flows that are painful to mock
When NOT to use this:
You need deterministic CI gating (use Playwright with mocked auth)
You can't tolerate any flakiness
You don't have a dedicated machine for the Chrome profile
Copy/Paste Starter Kit
If you want to implement this today, here's the file structure:
bash
scripts/e2e/
├── daily-e2e-test.sh # Main test runner
├── delete-test-user.ts # Cleanup script (DB + Clerk + Stripe)
├── com.myapp.e2e-daily.plist # launchd schedule
└── .env.e2e.example # Required environment variables
Required environment variables:
bash

# .env.e2e.example

DATABASE*URL=postgresql://...
AUTH_SECRET_KEY=sk_live*... # Your auth provider (Clerk, Auth0, etc.)
PAYMENT*SECRET_KEY=sk_live*... # Your payment provider (Stripe, etc.)
TRACKER_API_TOKEN=... # Your issue tracker's API token
E2E_TEST_EMAIL=test@yourdomain.com
Run locally:
bash

# Kill any existing Chrome debug instances

pkill -f "remote-debugging-port=9222"

# Run the test

./scripts/e2e/daily-e2e-test.sh https://yourapp.com
Schedule for daily runs:
bash
cp scripts/e2e/com.myapp.e2e-daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.myapp.e2e-daily.plist
The Architecture
The test script (`daily-e2e-test.sh`) runs through four phases:
Setup — Kill Chrome, clear cookies, delete test user from all systems
Signup — Open signup page, click OAuth, handle consent screens
Onboarding — Read the AI's last message, pattern-match, send appropriate response
Feature Tests — Send tool prompts, verify responses, take screenshots
On failure, it generates a report and files a bug in your tracker automatically.
Component Responsibilities
`delete-test-user.ts` — Cleans DB, auth provider, and payment provider. If it fails, the script exits early and logs the error.
Chrome debug profile — Pre-signed Google account. If OAuth fails, a screenshot is captured.
`get_last_ai_message()` — Extracts the AI response from the page. Returns empty string on failure; transcript is saved.
`get_answer_for_question()` — Pattern matches the AI's question to determine the response. Falls back to "yes" with a warning logged.
`file_bug()` — Creates a ticket in your issue tracker on failure. Logs API errors if the tracker is unreachable.
How we made Google OAuth fully unattended
The trick: launch Chrome with a debug profile that's already signed into your test Google account.
bash

# One-time setup: create and sign into the profile

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 --remote-debugging-port=9222 \
 --user-data-dir="$HOME/chrome-debug-profile"

# Sign into your test Gmail account, then close Chrome

# In your test script: reuse the profile

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 --remote-debugging-port=9222 \
 --user-data-dir="$HOME/chrome-debug-profile" \
 --no-first-run \
 --disable-default-apps &

agent-browser connect 9222
agent-browser open "$BASE_URL/sign-up"
agent-browser click "text=Continue with Google"

# OAuth completes automatically!

Handle both OAuth flows (account picker vs. direct consent):
bash
SNAPSHOT=$(agent-browser snapshot 2>/dev/null)

if echo "$SNAPSHOT" | grep -qi "choose an account"; then

# On account picker - click the email

agent-browser click "text=$TEST_EMAIL"
else

# Already on consent page - click Continue

agent-browser click "button:has-text('Continue')"
fi
How we guarantee a clean slate
Before each run, we delete the test user from three systems:
typescript
// delete-test-user.ts
async function deleteTestUser() {
// 1. Delete from database (cascades to related records)
const { paymentCustomerId } = await db
.delete(users)
.where(eq(users.email, TEST_EMAIL))
.returning({ paymentCustomerId: users.paymentCustomerId });

// 2. Cancel subscriptions and delete payment customer
if (paymentCustomerId) {
const subs = await paymentProvider.subscriptions.list({
customer: paymentCustomerId,
});
for (const sub of subs.data) {
await paymentProvider.subscriptions.cancel(sub.id);
}
await paymentProvider.customers.del(paymentCustomerId);
}

// 3. Delete from auth provider
const [user] = await authProvider.users.list({ email: TEST_EMAIL });
if (user) {
await authProvider.users.delete(user.id);
}
}
Critical: Use `-o` flag with dotenv to override `.env.local`:
bash

# Wrong - .env.local takes precedence (uses dev Clerk!)

npx dotenv -e .env.production -- npx tsx delete-test-user.ts

# Correct - production env wins

npx dotenv -e .env.production -o -- npx tsx delete-test-user.ts
Automatic bug filing
When tests fail, we create a ticket automatically:
bash
file_bug() {
[["$TEST_STATUS" == "SUCCESS"]] && return

local title="[E2E] Daily test failed - $(date '+%Y-%m-%d %H:%M')"
  local body="**Errors:**\n"
  for err in "${ERRORS[@]}"; do
body+="- $err\n"
done
body+="\n**Log:** $LOG_FILE\n**Screenshots:** $SCREENSHOT_DIR"

curl -X POST \
 -H "Authorization: Bearer $TRACKER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"$title\", \"body\": \"$body\"}" \
    "$TRACKER_API_URL"
}
Adapt for your tracker:
GitHub Issues: `POST /repos/{owner}/{repo}/issues`
Linear: `POST /graphql` with `issueCreate` mutation
Jira: `POST /rest/api/3/issue`
Reliability and Flake Control
Running daily and auto-filing bugs can create noise. Here's how we keep it sane:

1.  Retry on transient failures:
    bash
    run_with_retry() {
    local max_attempts=2
    for ((i=1; i<=max_attempts; i++)); do
    if "$@"; then return 0; fi
    log "Attempt $i failed, retrying..."
    sleep 5
    done
    return 1
    }
2.  Bug deduplication: Before filing, check if a similar bug exists in the last 24 hours. Comment on it instead of creating a duplicate.
3.  Artifact retention: Keep the last 7 days of logs and screenshots. Auto-delete older runs.
4.  Alert threshold: Only page on-call for 2+ consecutive failures. Single failures get a ticket but no alert.
    Security considerations
    The Single Point of Failure: Profile Security
    While the pre-signed Chrome debug profile is the "secret sauce" for unattended testing, it is also your greatest security liability. This folder contains live session cookies and OAuth tokens that bypass MFA; if this directory is ever compromised or accidentally committed to a public repository, an attacker has full, persistent access to your test account. Because of this, it is critical to treat the ...
    bash
    $HOME/chrome-debug-profile
    ... directory with the same level of protection as your production SSH keys. Never run this on a shared machine, and ensure your cleanup scripts don't just delete the user from your database, but also periodically invalidate the Google session itself to limit the blast radius of a potential leak.
    ✅ Use a dedicated Google account for testing (not personal)
    ✅ Run on a locked-down machine (Mac mini, dedicated runner)
    ✅ Store tokens in keychain or secret manager, not plain `.env` files
    ✅ Ensure test user data contains no real PII
    ✅ Sanitize screenshots before attaching to tickets (blur sensitive areas)
    ❌ Don't reuse your personal Chrome profile
    ❌ Don't run on shared developer laptops
    Scheduling with launchd
    xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
      "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.yourcompany.e2e-daily</string>

        <key>ProgramArguments</key>
        <array>
            <string>/bin/bash</string>
            <string>/path/to/scripts/e2e/daily-e2e-test.sh</string>
        </array>

        <key>StartCalendarInterval</key>
        <dict>
            <key>Hour</key>
            <integer>9</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>

        <key>EnvironmentVariables</key>
        <dict>
            <key>PATH</key>
            <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        </dict>

        <key>WorkingDirectory</key>
        <string>/path/to/your/project</string>

        <key>StandardOutPath</key>
        <string>/path/to/logs/e2e/launchd-stdout.log</string>
        <key>StandardErrorPath</key>
        <string>/path/to/logs/e2e/launchd-stderr.log</string>

    </dict>
    </plist>
    Note for CI users: We run on a dedicated Mac mini because OAuth + persistent profile is easiest. For CI (GitHub Actions, CircleCI), you'd need to:
    Use Playwright's `storageState` to persist auth
    Or use service accounts with API-based auth instead of OAuth
    What's next
    This approach scales to other flows:
    Payment testing with Stripe test cards
    Email verification with a real inbox you control (Resend + webhook)
    Multi-user scenarios (spawn multiple browser sessions)
    API integrations (trigger webhooks, verify database state)
    The core insight: your AI agent already knows how to interact with your app. Give it a script, a schedule, and an issue tracker API—and you've got autonomous QA.
