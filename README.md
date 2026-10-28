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
- Dual audio mixer and optional browser voice coach
- Feynman explanation evaluator and notes-to-quiz generator
- Context-aware Matrix AI chatbot
- Bionic reading mode
- Adaptive weekly schedule generator
- Local login/demo session, JSON backup/import, and optional Supabase sync

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
- Supabase credentials are entered at runtime and stored only in the current
  browser when cloud sync is enabled.
- The included login is a demo-only client-side flow, not production
  authentication. Use Supabase Auth or another server-backed identity provider
  before using real user accounts.
- Keep the Supabase service-role key off the client permanently. Only a
  properly restricted public/anon key may be used in a browser.

## Optional Supabase sync

Cloud sync is optional. Create a `study_sessions` table with policies that
match your security model, then enter the project URL and restricted anon key
under Settings. If the connection is unavailable, the app continues in
Local-Only mode.

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
