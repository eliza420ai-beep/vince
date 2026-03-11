# Clawdbot Security Guide: Lock Down Your Gateway

> **For OpenClaw**, see [openclaw-security.md](openclaw-security.md). This guide (Clawdbot) uses `~/.clawdbot`; OpenClaw uses `~/.openclaw`.

Clawdbot is a powerful personal AI assistant—self-hosted, always-on, connected to your messages, files, and tools. **But the gateway was designed for local use only.** Exposing it to the internet without the right settings is like leaving your digital front door unlocked with a sign saying "API keys inside."

This guide walks you through a **5-minute security check**, a **15-minute lockdown**, and optional **hardening for servers**.

---

## Why This Matters (The Real Risk)

When researchers scanned for vulnerable Clawdbot instances, they found:

- **Complete conversation histories** across Telegram, WhatsApp, Signal, and iMessage
- **API keys** for Claude, OpenAI, and other AI providers
- **OAuth tokens and bot credentials**
- **Full shell access** to the host machine

One researcher extracted a private key from a compromised system in under five minutes using a simple prompt injection attack.

### The Email That Leaked Everything

A security researcher sent a single email to someone running Clawdbot with email integration. The email contained hidden instructions that tricked the AI into:

1. Reading the victim's 5 most recent emails
2. Creating a summary of their contents
3. Forwarding that summary to the attacker's email address

Client meetings, invoices, personal messages—all exposed through one email. No hacking required.

This isn't a Clawdbot bug. It's how AI agents work when they can both read external content and take actions. The same language that gives instructions to the AI is the same language sitting in your inbox.

---

## The 5-Minute Security Check

Before changing anything, verify whether you're exposed.

### Check 1: What Address Is Your Gateway Listening On?

Open your terminal (on Mac: Spotlight → "Terminal"; on Windows: "Command Prompt" or "PowerShell") and run:

```bash
clawdbot gateway status
```

Look for the **bind** setting:

| Setting                      | Meaning                                           |
| ---------------------------- | ------------------------------------------------- |
| `bind=loopback` (127.0.0.1)  | Bound to localhost only. **Good.**                |
| `bind=lan` or `bind=0.0.0.0` | Listening on all interfaces. **Fix immediately.** |

**In plain English:**

- **127.0.0.1 (loopback)** — Only your computer can connect. Like a conversation in a soundproof room.
- **0.0.0.0 (all interfaces)** — Anyone on your network (or the internet, if ports are open) can connect. Like a megaphone.

### Check 2: Can You Access It From Outside?

If Clawdbot runs on a server, try from your phone **off WiFi** (e.g. cellular):

- `http://YOUR-SERVER-IP:18789`
- `https://YOUR-SERVER-IP:18789`

**Pro tip:** Use netcat to check if the port is reachable:

```bash
nc -zv YOUR-SERVER-IP 18789
```

If you see the Clawdbot interface **without** entering a password, you're exposed.

---

## The 15-Minute Lockdown (Step by Step)

Do these in order. Each step explains what it does before you run anything.

### Step 1: Bind to Localhost Only (~2 minutes)

**What it does:** Restricts the gateway to connections from the same machine. This is the single most important setting.

1. Open your config file:
   - **Mac/Linux:** `~/.clawdbot/clawdbot.json`
   - **Windows:** `%USERPROFILE%\.clawdbot\clawdbot.json`

   Example (Mac/Linux):

   ```bash
   nano ~/.clawdbot/clawdbot.json
   ```

2. Ensure the gateway section includes:

   ```json
   {
     "gateway": {
       "bind": "loopback",
       "port": 18789
     }
   }
   ```

3. Save (in nano: Ctrl+X, then Y, then Enter).

4. Restart the gateway:

   ```bash
   clawdbot gateway restart
   ```

5. Confirm:

   ```bash
   clawdbot gateway status
   ```

   You should see `bind=loopback (127.0.0.1)`.

### Step 2: Lock Down File Permissions (~2 minutes)

**What it does:** Ensures only you can read Clawdbot config files (API keys, message history, etc.).

**Mac/Linux:**

```bash
chmod 700 ~/.clawdbot
chmod 600 ~/.clawdbot/clawdbot.json
chmod 700 ~/.clawdbot/credentials
```

**What the numbers mean:**

- **700** — Only you can access the directory.
- **600** — Only you can read/write the file.

**Or let Clawdbot fix it:**

```bash
clawdbot security audit --fix
```

### Step 3: Disable Network Broadcasting (~1 minute)

**What it does:** Stops Clawdbot from announcing itself via mDNS/Bonjour, which can leak information to other devices on the network.

**Mac/Linux:** Add to `~/.bashrc` or `~/.zshrc`:

```bash
export CLAWDBOT_DISABLE_BONJOUR=1
```

Then reload:

```bash
source ~/.bashrc   # or source ~/.zshrc
```

**Windows:**

1. Search for "Environment Variables" in the Start menu.
2. Under "User variables," click "New."
3. Variable name: `CLAWDBOT_DISABLE_BONJOUR`
4. Variable value: `1`
5. OK.

### Step 4: Run the Security Audit (~2 minutes)

**What it does:** Scans your installation for common issues (file permissions, network exposure, config problems).

```bash
clawdbot security audit --deep
```

To auto-fix what it can:

```bash
clawdbot security audit --deep --fix
```

Review the output to see what was found and what was changed.

### Step 5: Update Node.js (~3 minutes)

**What it does:** Reduces risk from known Node.js vulnerabilities.

Check your version:

```bash
node --version
```

You need **v22.12.0 or higher**. If yours is older:

- **Mac (Homebrew):** `brew update && brew upgrade node`  
  (Alternatively, install from [nodejs.org](https://nodejs.org).)
- **Ubuntu/Debian:**

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **Windows:** Download the latest installer from [nodejs.org](https://nodejs.org) and run it.

### Step 6: Set Up Authentication (~3 minutes)

**What it does:** Requires a token or password to use the gateway, so that even if someone finds it, they can’t use it.

**Option A: Token**

Generate a token:

```bash
openssl rand -hex 32
```

Set it (and keep it secret):

```bash
export CLAWDBOT_GATEWAY_TOKEN="your-secure-random-token-here"
```

**Option B: Password**

Add to `clawdbot.json`:

```json
{
  "gateway": {
    "auth": {
      "mode": "password"
    }
  }
}
```

Set the password:

```bash
export CLAWDBOT_GATEWAY_PASSWORD="your-secure-password-here"
```

Restart the gateway after any auth changes.

---

## Going Further: Server & Remote Access

If Clawdbot runs on a cloud server (AWS, DigitalOcean, Hetzner, etc.), add these layers.

### Tailscale (Secure Remote Access)

**What it does:** Gives you a private, encrypted network between your devices. You can reach Clawdbot from anywhere without exposing it to the public internet.

**On the server:**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

On your laptop/phone, install Tailscale from [tailscale.com](https://tailscale.com) and log in with the same account.

**In `clawdbot.json`:**

```json
{
  "gateway": {
    "bind": "loopback",
    "tailscale": {
      "mode": "serve"
    }
  }
}
```

You can then access Clawdbot only from devices on your Tailscale network.

### SSH Hardening

If you use SSH to manage the server:

1. Edit SSH config:

   ```bash
   sudo nano /etc/ssh/sshd_config
   ```

2. Set (or add):

   ```
   PasswordAuthentication no
   PermitRootLogin no
   ```

3. Restart SSH:

   ```bash
   sudo systemctl restart sshd
   ```

Use SSH keys only; do not rely on password logins.

### Firewall (UFW on Linux)

**What it does:** Blocks all incoming traffic except what you explicitly allow (e.g. SSH, Tailscale). Even if Clawdbot is misconfigured to listen on 0.0.0.0, the firewall can block public access to port 18789.

1. **Check UFW:**

   ```bash
   sudo ufw status
   ```

   If needed: `sudo apt update && sudo apt install ufw -y`

2. **Defaults:** Deny incoming, allow outgoing:

   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   ```

3. **Allow SSH (do this before enabling UFW, or you can lock yourself out):**

   ```bash
   sudo ufw allow ssh
   ```

   Or for a custom port (e.g. 2222):

   ```bash
   sudo ufw allow 2222/tcp
   ```

4. **If using Tailscale:**

   ```bash
   sudo ufw allow in on tailscale0
   ```

5. **Enable:**

   ```bash
   sudo ufw enable
   ```

   Confirm with `y` when prompted.

6. **Verify:**

   ```bash
   sudo ufw status verbose
   ```

   You should see SSH (and optionally Tailscale) allowed; **do not** allow 18789 from the public internet.

### What NOT to Do

**Do not open the Clawdbot gateway port to the world:**

```bash
# DON'T DO THIS — it exposes your Clawdbot gateway to the internet
sudo ufw allow 18789
```

Keep the gateway bound to loopback (and/or Tailscale). Use a VPN or Tailscale for remote access instead of exposing port 18789.

---

## Quick Reference

| Goal                   | Action                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| Bind to localhost only | `"gateway": { "bind": "loopback" }` in `clawdbot.json`            |
| Restrict config files  | `chmod 700 ~/.clawdbot` and `chmod 600 ~/.clawdbot/clawdbot.json` |
| Disable Bonjour        | `export CLAWDBOT_DISABLE_BONJOUR=1`                               |
| Run audit              | `clawdbot security audit --deep` (add `--fix` to auto-fix)        |
| Node.js                | Use v22.12.0+                                                     |
| Auth                   | Set `CLAWDBOT_GATEWAY_TOKEN` or password in config                |
| Remote access          | Use Tailscale (or similar); do not expose port 18789              |
