# Rent-a-Rower — Build Setup

## Folder Structure

Put all three files in the same folder:

```
~/rent-a-rower/
├── spec.md                  # Project specification
├── implementation-notes.md  # Implementation patterns & pitfalls
└── run-phases.sh            # Overnight build script
```

## Prerequisites

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Authenticate
```bash
claude auth login
```

### 3. Install Context7 MCP Server (recommended)
This gives Claude Code access to up-to-date docs for Next.js, Supabase, Stripe, etc.
```bash
claude mcp add --transport stdio context7 -- npx -y @upggr/context7-mcp
```

### 4. Verify everything works
```bash
claude --version
claude "say hello and confirm you can read files"
```

## Running the Build

```bash
cd ~/rent-a-rower
chmod +x run-phases.sh
nohup bash run-phases.sh > build-log.txt 2>&1 &
```

Then go to sleep.

## In the Morning

Check these files:

| File | What it tells you |
|------|------------------|
| `build-report.md` | Clean summary: what was built, test results, issues |
| `build-log.txt` | Raw terminal output if you need to debug |

## After the Build

You'll still need to do these manual steps before deploying:

1. **Create a Supabase project** at supabase.com — run `supabase/schema.sql` in the SQL editor
2. **Create a Stripe account** — get your test API keys and set up a webhook
3. **Enable Google Maps Geocoding API** in Google Cloud Console
4. **Create a Resend account** at resend.com
5. **Deploy to Vercel** — connect the GitHub repo and set all env vars
6. **Update `.env.local`** with real credentials for local testing

## Troubleshooting

**Build script stops midway:**
Check `build-log.txt` for errors. You can re-run individual phases by commenting out completed phases in `run-phases.sh`.

**Claude Code asks for permissions:**
The `--dangerously-skip-permissions` flag should prevent this. If it still happens, make sure you're running the latest version of Claude Code.

**Build errors in the report:**
Open the project in your editor, run `npm run build`, and feed the errors back to Claude Code:
```bash
cd ~/rent-a-rower/rent-a-rower  # the Next.js project is nested
claude "Fix these build errors: [paste errors]"
```
