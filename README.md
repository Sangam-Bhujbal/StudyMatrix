# StudyMatrix — Elite Study OS

StudyMatrix is a browser-based study command centre for hackathon demos and
student productivity. It runs as a static site: there is no required backend,
build step, or API key.

## Live demo

This project can be deployed directly to GitHub Pages, Netlify, or Vercel.
Connect the repository to one of those providers and use the repository root
as the publish directory. No build command is required.

For optional live Gemini responses, deploy on Vercel or Netlify and add
`GEMINI_API_KEY` as a server-side environment variable. The browser calls
`/api/ai`; if the key, endpoint, or Gemini service is unavailable, the app
automatically uses its local demo responses. Never put the key in frontend
JavaScript or commit it to GitHub. GitHub Pages supports the demo fallback but
cannot run the secure serverless endpoint.

## Features

- Chronotype onboarding for Morning Bird and Night Owl study patterns
- AI mind-map generation from a topic, notes, or PDF
- Strict focus timer with tab-switch breach detection
- Sound Lab with 432Hz, brown noise, rain, ocean, fireplace, and wind waves
- Full-screen Focus Shield with a live clock and one-button exit
- Sound Lab with independent ambient-wave controls, optional browser voice
  coach, and chatbot voice replies
- Two voice personas (Male/Female) with English, Hindi, and Marathi language
  selection. The Web Speech API uses the closest installed browser/OS voice;
  Hindi or Marathi quality depends on whether that language voice is installed
  on the device.
- Feynman explanation evaluator and a separate Quiz Lab notes-to-quiz generator
- Context-aware Matrix AI chatbot
- Bionic reading mode
- Adaptive weekly schedule generator with a structured 5-question planner:
  daily study target, college hours, preferred study window, other busy time,
  and subject priorities. Generated sessions avoid busy periods and can be
  marked **Done**, **Not done**, or **Skip**; status is saved locally so
  students can manage the plan day by day.
- Local login/demo session and JSON backup/import

## Run locally

Because ES modules are used, serve the folder over HTTP instead of opening
`index.html` directly:

```bash
npx serve .
```

Then open the URL printed by the server.

## Demo account

The app also supports a guest demo. For the account login tab:

```text
Email:    demo@studymatrix.app
Password: Demo@1234
```

Use **Settings → Demo controls → Reset demo data** to clear the current
browser's local state before a presentation.

## Public repository safety

- This repository is designed to be public.
- No real API keys, service-role keys, or passwords should be committed.
- `.env`, `.env.*`, and `*.local` files are ignored by Git.
- Demo data and preferences are stored locally in the current browser.
- The included login is a demo-only client-side flow, not production
  authentication. Use Supabase Auth or another server-backed identity provider
  before using real user accounts.
- See [SECURITY.md](./SECURITY.md) for the public-repository security notes.

## Project structure

```text
studymatrix/
├── index.html
├── styles/main.css
└── src/
    ├── app.js
    ├── config/api-simulator.js
    ├── core/
    │   ├── auth.js
    │   ├── local-db.js
    │   ├── sync-manager.js
    │   ├── strict-timer.js
    │   ├── audio-mixer.js
    │   └── voice-coach.js
    └── features/
        ├── 1_onboarding.js
        ├── 2_pdf-mindmap.js
        ├── 3_feynman-quiz.js
        ├── 4_chatbot.js
        ├── 5_bionic-reader.js
        ├── 6_schedule.js
        └── 7_settings.js
```

Built for the Education Track Hackathon.

## Technology used

- HTML5 for the application shell and accessible controls
- CSS3 plus Tailwind CDN utility classes for the responsive dark UI
- Vanilla JavaScript ES modules for feature logic and state management
- Web Speech API for Male/Female coach voices and chatbot voice replies
- Web Audio API for synthesized focus sounds (no audio files required)
- Mermaid.js for the syllabus mind-map diagrams
- PDF.js for extracting text from uploaded PDF syllabi
- LocalStorage through the `DB` adapter for demo sessions, schedules, voice
  preferences, backups, and task status
- Optional Gemini API through the server-only `/api/ai` Vercel function
- Vercel/GitHub Pages-compatible static deployment

The voice coach is controlled only by the Male/Female preset and language
selector; the browser voice dropdown is intentionally not exposed. The
selected language is also used for chatbot voice replies. Native Hindi or
Marathi pronunciation depends on voices installed by the operating system.

## Code size

The project contains approximately **5,214 tracked lines of source code** across
HTML, CSS, JavaScript, and the serverless API. This count can change as
features evolve; use `git ls-files` and a line-count command for an exact
checkout-specific count.
