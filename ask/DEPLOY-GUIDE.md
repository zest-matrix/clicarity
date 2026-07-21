# Clicarity AI Chat — Deployment Guide
## Written for Puneet — step by step, no assumptions

---

## What you'll end up with

- A Cloudflare Worker at a URL like: `https://clicarity-chat.contact-4b6.workers.dev`
- Your AI chat page live at: `https://www.clicarity.com/ask/`
- Your Anthropic API key stored securely — never visible in any file

Total time: ~15–20 minutes

---

## PART 1 — Deploy the Worker

### Step 1 — Log in to Cloudflare

1. Go to: **https://dash.cloudflare.com**
2. Log in with your Cloudflare account

---

### Step 2 — Open Workers & Pages

1. In the left sidebar, click **"Workers & Pages"**
2. You'll see your existing workers — including the pincode one

---

### Step 3 — Create a new Worker

1. Click the blue **"Create"** button (top right)
2. Click **"Create Worker"**
3. Name it: `clicarity-chat`
4. Click **"Deploy"** (this deploys a placeholder — we'll replace it next)

---

### Step 4 — Replace the Worker code

1. After deploying, click **"Edit code"** (or go to the worker and click "Quick Edit")
2. You'll see a code editor with a simple "Hello World" example
3. **Delete everything** in the editor
4. Open the file `chat-worker.js` (from this zip) in any text editor
5. **Select all** (Ctrl+A) and **Copy** (Ctrl+C) the entire content
6. Paste it into the Cloudflare editor
7. Click **"Save and Deploy"** (top right)

---

### Step 5 — Add your Anthropic API key (the important part)

Your API key must NEVER go in the code. It goes here instead:

1. In your Worker page, click the **"Settings"** tab
2. Click **"Variables and Secrets"**  
3. Under **"Secret variables"**, click **"Add variable"**
4. Variable name: `ANTHROPIC_API_KEY`
5. Value: paste your Anthropic API key (starts with `sk-ant-...`)
6. Click **"Encrypt"** then **"Save"**

> **Where to get your Anthropic API key:**
> - Go to: https://console.anthropic.com
> - Sign up / log in
> - Click "API Keys" in the left menu
> - Click "Create Key"
> - Copy it immediately — you can only see it once
> - Cost: approximately $0.003 per chat message (₹0.25 per message at current rates)

---

### Step 6 — Note your Worker URL

1. On the Worker overview page, look for the URL — it will say something like:
   `https://clicarity-chat.contact-4b6.workers.dev`
2. Copy this URL — you'll need it in the next step

---

## PART 2 — Update the Chat Page

### Step 7 — Put your Worker URL in the chat page

1. Open `ask/index.html` in any text editor (Notepad, TextEdit, VS Code)
2. Find this line near the bottom (around line 195):
   ```
   const WORKER_URL = 'https://clicarity-chat.contact-4b6.workers.dev';
   ```
3. Replace `contact-4b6` with YOUR subdomain from Step 6
   - If your Worker URL is `https://clicarity-chat.YOUR-NAME.workers.dev`
   - Change the line to match that exactly
4. Save the file

> **Note:** If your Worker URL ends with `.workers.dev` and the subdomain is already `contact-4b6`, you may not need to change anything — just verify it matches.

---

## PART 3 — Deploy the Updated Website

### Step 8 — Upload to Cloudflare Pages

1. In Cloudflare dashboard, go to **"Workers & Pages"**
2. Click on your **Clicarity Pages project** (not the new Worker — your existing website)
3. Click **"Deployments"**
4. Click **"Upload assets"** or **"Create new deployment"**
5. Upload the new zip file that includes the `/ask/` folder
6. Wait for deployment (usually 30–60 seconds)

---

### Step 9 — Test it

1. Go to: `https://www.clicarity.com/ask/`
2. Type a question — try: *"Is Clicarity right for a packaging factory in Surat?"*
3. You should get a response within 3–5 seconds
4. If you see an error, check Step 5 (API key) first — that's the most common issue

---

## Troubleshooting

**"Something went wrong" error:**
- Check that the API key was saved correctly (Step 5)
- Make sure the Worker URL in `ask/index.html` matches your actual Worker URL (Step 7)

**No response at all:**
- Open browser developer tools (F12) → Console tab
- Look for any red error messages
- Most likely: Worker URL is wrong in the HTML file

**"API key invalid" in Cloudflare logs:**
- Your Anthropic API key may have been copied incorrectly
- Go back to https://console.anthropic.com and create a new key
- Update it in Cloudflare → Worker → Settings → Variables and Secrets

**Worker not found:**
- Make sure you clicked "Save and Deploy" in Step 4
- Wait 1–2 minutes and try again

---

## Cost Estimate

Each chat message costs approximately:
- Input tokens (your message + system prompt): ~2,000 tokens = ~$0.006
- Output tokens (AI response): ~300 tokens = ~$0.0015
- **Total per message: ~$0.008 (less than ₹1)**

For 100 conversations per month with ~5 messages each = ~500 messages = ~$4/month (₹330)

You can set a monthly spending limit in the Anthropic console to protect against unexpected costs.

---

## After Testing — Roll Out to Full Website

Once you've tested on `/ask/` and you're happy with how it responds:

1. Add the chat as a floating widget on every page
2. I (Claude) can build the floating widget code in one session
3. You add one `<script>` tag to every page — that's all

---

## Files in this folder

| File | What it is |
|---|---|
| `index.html` | The chat page — goes in `/ask/` folder of your website |
| `chat-worker.js` | The Cloudflare Worker code — goes in Cloudflare dashboard |
| `wrangler.toml` | Config file — only needed if using Wrangler CLI (optional) |
| `DEPLOY-GUIDE.md` | This guide |

---

*Questions? WhatsApp Puneet at 9867800451*
