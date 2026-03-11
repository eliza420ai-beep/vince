---
title: "unencrypted backups to cloud storage. Don't email yourself backups. Don't store on same device."
source: chat://vince-upload/1770204481572
category: internal-docs
ingestedWith: vince-upload
tags:
  - vince-upload
  - user-submitted
  - chat
created: 2026-02-04T11:28:01.572Z
wordCount: 232
last_reviewed: 2026-02-15
---

# unencrypted backups to cloud storage. Don't email yourself backups. Don't store on same device.

> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use actions/APIs.

## Content

unencrypted backups to cloud storage. Don't email yourself backups. Don't store on same device.
8 - If compromised
Stop immediately: sudo systemctl stop openclaw
Rotate all credentials: Venice key, Pi password, consider SSH keys
Review logs: less ~/.openclaw/logs/ and sudo journalctl -u openclaw
Check for unauthorized changes:
find ~/.openclaw -mtime -1 -ls
crontab -l
cat ~/.ssh/authorized_keys
9 - When in doubt, re-flash the SD card.
Only way to be sure.
Limitations
Prompt injection: ~91% success rate. Unsolved. We raise the bar with ACIP, PromptGuard, and content hygiene, but a determined attacker who gets malicious content in front of your bot will likely succeed.
Venice trust: They see prompts. They claim no logging. You can't verify. If Venice is compromised, lying, or served with a legal order, your conversations could be exposed.
Physical access: Running device = accessible data. Encryption helps only when powered off.
You: All hardening is pointless if you paste passwords, read malicious documents, ignore warnings, never rotate credentials.
Security is a practice, not a product.
Conclusion
You now have an AI assistant that:
Runs on hardware you physically control
Uses a provider claiming no logging
Has no public attack surface
Uses E2E messaging encryption
Has prompt injection hardening installed
Only responds to your Matrix account
Not perfectly secure. Nothing is. But better than pasting your life into ChatGPT.
Use your bot. Enjoy the convenience. Do it with eyes open.
