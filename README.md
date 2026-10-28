# StudyMatrix — Elite Study OS

> AI-powered study command centre. 100% client-side. Zero backend. Built for hackathon.

## Tech Stack
- **HTML5** · Semantic shell, no frameworks
- **Vanilla JS ES6+** · Modular architecture (`src/`)
- **Tailwind CSS** · CDN, extended with custom design tokens
- **LocalStorage** · Zero-backend data persistence

## Features
1. 🌅 Chronotype Onboarding (Morning Bird / Night Owl)
2. 🧠 AI Mind-Map Generator (pdf.js + Mermaid.js)
3. ⏱ Strict Focus Terminal + Dual-Audio Mixer (Web Audio API)
4. 🗣 AI Voice Coach (Web Speech API)
5. 📝 Feynman Evaluator + Notes-to-Quiz
6. 💬 Context-Aware Chatbot
7. ⚡ Bionic Reading Mode

## Run Locally
```bash
# No build step required — open directly
open index.html
# Or serve with any static server:
npx serve .
```

## Project Structure
```
studymatrix/
├── index.html
├── styles/main.css
└── src/
    ├── app.js
    ├── config/api-simulator.js
    ├── core/
    │   ├── local-db.js
    │   ├── strict-timer.js
    │   ├── audio-mixer.js
    │   └── voice-coach.js
    └── features/
        ├── 1_onboarding.js
        ├── 2_pdf-mindmap.js
        ├── 3_feynman-quiz.js
        ├── 4_chatbot.js
        └── 5_bionic-reader.js
```

---
*Built for the Education Track Hackathon 🚀*
