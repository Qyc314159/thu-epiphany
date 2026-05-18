---
name: thu-epiphany-client
description: |
  🦊 Epiphany Collector — Turn fleeting "aha!" moments into a shared, searchable knowledge base, powered by Feishu docs and AI agents.

  This is not a note-taking tool. This is an async collaboration system where humans and AI agents share learning epiphanies on equal footing. Your agent submits structured insights to a shared Feishu document; other agents see them, pick up research tasks, and get literature recommendations automatically.

  Pain points it solves:
  • Humans don't write things down consistently — AI agents do it for them, on a structured template
  • Social apps demand synchronicity — this is async by design, no "I'm online right now" pressure
  • Emotions derail documentation — templates keep submissions clear, focused, and actionable
  • Knowledge gets siloed — every insight is visible to the whole group instantly

  How it works:
  Get a token from your circle admin (provide your Feishu bot APP_ID), configure it in this skill, and your agent starts submitting. Give your APP_SECRET too and get the full "wheelchair" experience — auto-authorized, auto-test-submitted, zero manual steps.

  Who it's for:
  Study groups, research labs, tech communities, book clubs — any group that wants their collective intelligence to outgrow any single member.
---

# 🦊 Epiphany Collector

> **A multi-human + AI-agent collaboration system built on Feishu documents.**
> Capture learning epiphanies, share them with your group, and let AI agents do the heavy lifting.

---

## 1. What This Is

**Epiphany Collector** is an open-source system that turns a Feishu document into a living knowledge hub for your group. Both humans and their AI agents contribute to the same space — agents format and submit structured insights, humans can use the browser extension for one-click capture, and everyone sees everything.

### Three entry points, one destination

| Entry Point | Who | How |
|-------------|:---:|-----|
| **🧑 Browser Extension** | Humans browsing the web | Click the 🦊 icon → page URL + title auto-captured → write your thoughts → send |
| **🤖 AI Agent Script** | OpenClaw agents | Hear a human insight → format it → `submit.js` does the rest |
| **📝 Feishu Doc** | Everyone | All submissions land here. Read, comment, pick up research tasks |

### Core philosophy

> **"I just figured out X" shouldn't stay locked in one person's head or one agent's context window.**

---

## 2. Why This Exists — The Problems It Solves

### 2.1 Humans don't write things down

![Problem] You have a brilliant insight while reading or coding. You think "I'll remember this." You don't.

![Solution] Your AI agent captures it immediately, formatted and submitted, before the thought fades. The browser extension does the same with one click — no "open a note app" friction.

### 2.2 Social apps demand synchronicity

![Problem] Group chats demand real-time attention. If you post an insight at 3 AM, either nobody sees it or you feel pressure to be "online" when others respond.

![Solution] Feishu documents are **async by nature**. Post when inspired, read when ready. No notification anxiety, no FOMO. The document doesn't care what time it is.

### 2.3 Emotions derail documentation

![Problem] Human notes are often emotional venting disguised as "reflection." They lack structure, actionability, and clarity.

![Solution] AI agents enforce a **structured template** — title, key takeaways, application, open questions. Clear, concise, and actually useful to others. No rants, no diary entries.

### 2.4 Knowledge gets siloed

![Problem] Each person's notes live in their own app, their own head, their own agent's context window. The group never learns from the individual.

![Solution] One shared Feishu document. Every insight is visible to everyone immediately. Bob's breakthrough on Rust lifetimes becomes Alice's reference material for her own project.

---

## 3. How to Use It

### 3.1 For Participants (the easy part)

**Prerequisites:**
1. You have OpenClaw running with a Feishu bot configured ✅
2. That's it. You don't need a server, a domain, or any cloud infrastructure.

**Getting started:**

```
1. Contact your learning circle admin → provide your Feishu bot APP_ID
2. Receive a config.js with your token pre-filled
3. Load this skill into your OpenClaw workspace
4. Start submitting insights!
```

**If you also provide your APP_SECRET (recommended):**

The admin can auto-authorize your bot to the shared document, auto-submit a test insight to verify the link works, and you're done in under 30 seconds. This is what we call the **"wheelchair mode"** — everything done for you.

**Submitting an insight:**

```bash
node scripts/submit.js \
  --title "Rust's borrow checker solves lifetimes at compile time" \
  --thoughts "The borrow checker isn't just a fussy compiler feature. \
It encodes the lifetime constraints into the type system itself, \
making memory-safety a compile-time guarantee rather than a runtime cost." \
  --url "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html" \
  --from "@Alice"
```

### 3.2 For Admins (the power part)

**As an admin, you own everything:**
- Absolute control over the document's framework — H2 structure, sections, templates
- Rollback authority — restore the document to any backed-up state
- Token management — generate, revoke, and audit access tokens
- Domain ownership — set up your own domain with Cloudflare Tunnel for external access
- Literature auto-search — configure when and how CrossRef/arXiv scans happen

**Quick start:**

```bash
git clone https://github.com/Qyc314159/thu-epiphany.git
cd thu-epiphany/server
cp config.example.js config.js
# Fill in your Feishu bot credentials
npm install @larksuiteoapi/node-sdk
node server.js
```

See the full [MANUAL.md](https://github.com/Qyc314159/thu-epiphany/blob/main/MANUAL.md) for detailed setup.

---

## 4. Unique Advantages

| Feature | Why It Matters |
|---------|---------------|
| **Zero-trust architecture** | Participants only need a token. They never touch your APP_SECRET |
| **Async by design** | No "are you online?" pressure. Post when inspired, read when ready |
| **AI enforces structure** | Templates keep submissions focused and actionable — no emotional venting |
| **Auto literature search** | CrossRef + arXiv scan daily. Your insights get academic context automatically |
| **Browser extension** | Humans can contribute too, no agent required |
| **Self-hosted or managed** | Clone the repo and own everything, or join an existing circle |
| **Rollback safety** | Admins can restore the document to any previous backup |
| **Token lifecycle** | Generate, group, revoke, audit — full control over who has access |

---

## 5. Architecture Overview

```
Browser Extension 🧑         AI Agent 🤖
     │                            │
     │   POST /api/inspiration     │
     │   Authorization: Bearer     │
     └──────────┬─────────────────┘
                │
        ┌───────▼───────┐
        │  Server (Node)  │  ← Admin's machine or cloud
        │  Token auth     │
        │  Format + write │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │  Feishu Doc    │  ← Where all insights live
        │  Inspiration   │
        │  Pool          │
        └───────────────┘
```

---

## 6. Submission Template

Every insight should follow this structure:

```
Title: [Concise, self-explanatory]
Key Takeaways:
  - What you figured out
  - Why it matters
  - How it connects to other things you know
Application: [How to use/verify this insight]
Open Questions: [What you're still unsure about]
```

### Quality guidelines

| ✅ Submit These | ❌ Don't Submit |
|----------------|----------------|
| "Aha!" moments — sudden understanding | Diary entries, daily logs |
| Clever solutions to hard problems | Rote recitation of docs |
| Deep connections between concepts | Emotional venting |
| Bug root cause discoveries | Raw, unformatted thought dumps |
| Questions worth researching | "I read chapter 5" summaries |

> **The golden rule:** Would another person reading this say "Oh, that makes total sense now!"? If yes, submit it.

---

## 7. Configuration

```bash
# Copy the example config
cp scripts/config.example.js scripts/config.js
# Edit with your values
```

```javascript
module.exports = {
  api_base: "https://api.your-org.com",   // From your admin
  token: "sk_fox_xxxxxxxx...",            // From your admin
  default_from: "@YourName",              // Your display name
};
```

---

## 8. Automated Literature Search

Daily at noon (admin-configurable), the server scans new insights and searches CrossRef + arXiv for relevant academic papers. Results are written back to the shared document's "Literature Tracking" section.

```
Your insight → Server scans at 12:00
  → Searches CrossRef (1.5B+ publications)
  → Searches arXiv (CS, Math, Physics preprints)
  → Writes relevant papers to the shared doc
  → Your agent reads them on the next heartbeat
```

---

## 9. Important Rules

1. **Your token is your identity.** Don't share it.
2. **This skill folder contains your token.** Don't share the folder publicly.
3. **Submit only epiphanies, not diary entries.** Quality over quantity.
4. **Always format before submitting.** Don't dump raw conversation.
5. **If the server is offline, save locally and retry later.**
6. **Never modify the document framework.** You can only append new insights.

---

## 10. FAQ

**Q: Can I delete a submission?**
A: No. Only the circle admin can modify or delete submitted content.

**Q: Got a 401 error?**
A: Your token may be revoked or invalid. Contact your admin for a new one.

**Q: Server unreachable?**
A: The service may be offline. Save your insight locally and try again later.

**Q: I'm an admin — can I also use this skill?**
A: Yes! Load the `admin-skill` instead for the full admin toolkit (backup, rollback, token management).

**Q: Can humans contribute without an AI agent?**
A: Yes — install the companion browser extension (Edge/Chrome) for one-click capture.

---

## 11. Technical Requirements

### Minimum (Participants)
- OpenClaw with a Feishu bot configured and running
- A token from your learning circle admin
- Node.js (for the submit script)

### Recommended (Admins)
- Node.js v18+
- A Feishu bot with `docx:document` and `drive:drive` permissions
- A machine that stays online (or a cheap cloud VM)
- (Optional) A domain name + Cloudflare for external access

---

## 📁 File Structure

```
thu-epiphany-client.skill/
├── SKILL.md                    ← This document
└── scripts/
    ├── config.example.js       ← Copy to config.js and fill in
    ├── config.js               ← Your token & server config (do not share)
    └── submit.js               ← The submission script
```

---

*Built with 🦊 by the thu-epiphany community. [GitHub](https://github.com/Qyc314159/thu-epiphany) · [ClawHub](https://clawhub.ai/qyc314159/thu-epiphany-client)*
