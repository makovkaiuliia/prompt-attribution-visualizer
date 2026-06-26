# 🎯 Prompt Attribution Visualizer

Visualize how system prompt instructions shape an LLM's response.

## ✨ Features

- Select any fragment of the response → see which prompt rules influenced it
- Attribution by both content and form (casing, length, grammar, style)
- Highlights rule conflicts (e.g. "lowercase" vs "follow capitalization rules")
- Overlap-safe prompt highlighting with influence-weighted colors

## 🚀 Getting started

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run preview    # preview the build
```

Then in the browser:

1. Enter your OpenAI API key
2. Set the system prompt and the user message
3. Get the response → select any text in it → the influencing prompt parts get highlighted

The API key lives only in the browser tab's memory — it is never stored or logged, and goes straight to OpenAI.

## 📝 Example

**System prompt:**

```text
1) be concise
2) write everything in lowercase
3) write grammatically correct
4) always follow proper capitalization rules
```

**User message:** "Ask me how my trip to Paris went"
**Response:** "how did your trip to paris go?"

Select "paris" → rule #2 (lowercase) is highlighted as the cause, in conflict with rule #4 (capitalization).

## 🛠️ Tech

- React 18 + Vite
- Tailwind CSS (CDN)
- OpenAI API (`gpt-4o`, JSON mode for analysis)

## 🗂️ Structure

| File | Purpose |
|---|---|
| `src/api.js` | OpenAI calls (response + per-fragment attribution) |
| `src/attribution.js` | pure matching and highlighting logic |
| `src/App.jsx` | UI and step orchestration |

> The previous single-file version, `prompt_analyzer.html`, is kept in the repo.
