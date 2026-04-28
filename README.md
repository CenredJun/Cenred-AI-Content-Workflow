# AI Content & SEO Workflow

> Topic in → AI researches → drafts blog post → generates SEO meta → publishes to Ghost CMS. Fully automated. No human writing.

Portfolio Project 4 of 5 by **Cenred (Cj)** — [cenredai.bizguro.net](https://cenredai.bizguro.net)

A push-button content pipeline. A marketing manager enters a topic, n8n routes it through three Claude calls (research → writing → SEO), and a finished draft post lands in a Ghost CMS instance — typically in under 2 minutes.

## What this demonstrates

- **n8n workflow orchestration** — 7 nodes chaining a webhook, three Claude API calls, a Code node, the Ghost Admin API, and a synchronous webhook response.
- **Multi-step prompt engineering** — three different Claude system prompts, each tuned for a single task (outline, writing, SEO meta).
- **CMS API integration** — Ghost Admin API with JWT auth, programmatic post creation in HTML format.
- **End-to-end automation thinking** — a single click turns a 3-6 hour content workflow into a 2-minute one.

## Pipeline at a glance

```
[Form submit]
     ↓ webhook
[Claude — Research & Outline]   →  JSON outline (5 sections)
     ↓
[Claude — Full Draft]           →  HTML body (600-900 words)
     ↓
[Claude — SEO Meta]             →  JSON (metaTitle, metaDescription, slug, focusKeywords)
     ↓
[Code — Assemble payload]       →  Ghost-shaped post object
     ↓
[Ghost — Create Post]           →  Draft created, returns post URL
     ↓
[Respond to UI]                 →  JSON sent back to the demo frontend
```

## Project structure

```
ai-content-workflow/
├─ index.html                       ← demo UI (form + 7-step status panel + results)
├─ netlify.toml                     ← Netlify config
├─ netlify/
│  └─ functions/
│     └─ trigger.js                 ← proxy that hides the n8n webhook URL
├─ n8n/
│  └─ ai-content-workflow.json      ← exportable n8n workflow
├─ prompts/
│  ├─ prompt-1-outline.txt          ← research & outline system prompt
│  ├─ prompt-2-draft.txt            ← full draft system prompt
│  └─ prompt-3-seo.txt              ← SEO meta system prompt
├─ package.json
├─ .gitignore
└─ README.md
```

## Setup

### 1. Anthropic API key

Get one at [console.anthropic.com](https://console.anthropic.com). The workflow uses `claude-sonnet-4-6`.

### 2. Ghost CMS instance

Either:
- **Self-host** — run `ghost install local` ([Ghost CLI docs](https://ghost.org/docs/install/local/)), or
- **Ghost Pro trial** — sign up at [ghost.org](https://ghost.org/pricing/).

Then in Ghost Admin: **Settings → Advanced → Integrations → Add custom integration**. Copy the **Admin API Key** — it looks like `<id>:<secret>`.

### 3. Import the n8n workflow

1. In n8n.cloud (or self-hosted n8n), go to **Workflows → Import from File** and select `n8n/ai-content-workflow.json`.
2. Open the imported workflow. The three Claude HTTP nodes need an **Anthropic API** credential — create one with your Anthropic key and select it on each Claude node.
3. The **Ghost — Create Post** node needs a **Ghost Admin API** credential — create one with your Ghost URL + Admin API key and select it.
4. **Activate** the workflow. Copy the production webhook URL (looks like `https://YOURNAME.app.n8n.cloud/webhook/ai-content`).

### 4. Wire up the demo frontend

Two options:

**Option A — Netlify proxy (recommended for production demo).** Hides the n8n URL and adds CORS:

```bash
# in this repo
npm install -g netlify-cli   # if you don't have it yet
netlify login
netlify init
netlify env:set N8N_WEBHOOK_URL "https://YOURNAME.app.n8n.cloud/webhook/ai-content"
netlify deploy --prod
```

**Option B — direct n8n call (simplest).** Open `index.html` and replace the `TRIGGER_URL` constant with your n8n webhook URL. Then drag the folder onto Netlify — no env vars needed.

> ⚠️ **Timing note.** The full pipeline runs ~60-90s (mostly the draft Claude call). Netlify's standard sync function timeout is 26s on Pro / 10s on Free. If you hit timeouts with Option A, use Option B or upgrade Netlify. The `trigger.js` proxy is wired with a 60s `AbortController` so it'll surface a clean 504 instead of hanging if it does time out.

### 5. Try it

Open the deployed URL or run locally:

```bash
npm run dev   # netlify dev — serves index.html on http://localhost:8888
```

Click one of the three sample topic buttons or type your own. Watch the 7-step pipeline animate. When it lands, the new draft appears in your Ghost admin.

## The 3 Claude prompts

Each Claude call has a different system prompt, tuned for one job. The prompts are inlined in the n8n workflow JSON for portability and also stored in `prompts/` for reference and editing.

| Prompt | Output | Why a separate call |
|---|---|---|
| `prompt-1-outline.txt` | JSON outline (title, target audience, 5 sections) | Cheap, fast, gives the writing call structured guidance instead of a vague topic |
| `prompt-2-draft.txt` | Clean HTML body (600-900 words) | Largest call by tokens — gets the full outline as context so the writing stays on-rails |
| `prompt-3-seo.txt` | JSON SEO meta (title, description, slug, 5 keywords) | Tiny call, runs after the draft so SEO has the actual content to summarise |

Editing a prompt? Update both the `.txt` file (for documentation) **and** the corresponding `system` field inside `n8n/ai-content-workflow.json` (for the live workflow).

## Sample topics (preloaded in the demo)

1. **5 Ways AI is Changing Small Business Operations in 2026** — broad, business-relevant, demonstrates Claude's ability to write practically.
2. **Beginner's Guide to Automating Your E-commerce Store with n8n** — directly relevant to the target client base.
3. **How to Use ChatGPT and Claude for Content Marketing Without Losing Your Brand Voice** — high search volume, AI-adjacent, meta value.

## Business use cases

- **Marketing agencies** producing 20+ blog posts per month for clients — cuts production time by ~80%.
- **E-commerce stores** that need weekly SEO content but can't afford a dedicated content team.
- **SaaS companies** maintaining a technical blog without pulling engineers off product work.
- **Any business** running WordPress, Ghost, or Webflow that wants to automate their editorial calendar — swap the Ghost node for the equivalent CMS connector.

## Stack

- **n8n** (n8n.cloud or self-hosted) — workflow orchestration
- **Anthropic Claude API** (`claude-sonnet-4-6`) — research, writing, SEO
- **Ghost CMS** — Admin API publishing target
- **Vanilla JS + HTML + CSS** — demo frontend (no build step)
- **Netlify Functions** — optional proxy + hosting

---

Built with Claude Code in VS Code · April 2026
