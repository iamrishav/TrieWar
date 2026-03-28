# 🚨 TRIAGE AI — Universal Emergency & Action Intelligence

> **From Chaos to Clarity, Instantly.**

TRIAGE AI is a Gemini-powered universal bridge that transforms **any unstructured, messy real-world input** — voice, photos, medical records, accident reports, disaster alerts — into **structured, verified, life-saving actions**.

[![Built with Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![PromptWars](https://img.shields.io/badge/PromptWars-Build%20with%20AI-FF6B35)](https://promptwars.in)

---

## 🎯 Chosen Vertical

**Universal Bridge for Societal Benefit** — A smart, dynamic assistant that acts as a universal bridge between human intent and complex systems, converting unstructured inputs into structured, verified, life-saving actions.

---

## 🧠 Approach & Logic

### The TRIAGE Pipeline

TRIAGE stands for: **T**ransform **R**aw **I**nput into **A**ctionable, **G**rounded **E**mergency responses.

The app processes every input through a **4-stage AI pipeline**:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. CLASSIFY │───▶│  2. ENRICH   │───▶│ 3. STRUCTURE │───▶│  4. VERIFY   │
│              │    │              │    │              │    │              │
│ Determine    │    │ Add context: │    │ Gemini AI    │    │ Cross-check  │
│ input type & │    │ location,    │    │ processes    │    │ with Google  │
│ urgency      │    │ time, season │    │ into action  │    │ Search       │
│ level        │    │ awareness    │    │ cards        │    │ grounding    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Stage Details

1. **CLASSIFY** — Keyword-based pre-classification determines the likely category (medical, accident, disaster, safety, health records) and routes the input for optimized processing.

2. **ENRICH** — Context enricher adds:
   - **Time awareness**: Rush hour, night time, weekend (affects service availability)
   - **Location context**: User coordinates for nearby services
   - **Seasonal awareness**: Monsoon flood risks, summer heat warnings, dengue season alerts
   - **Input type hints**: Voice inputs may have transcription errors, images need visual analysis

3. **STRUCTURE** — Google Gemini (gemini-2.5-flash) processes the enriched input with a specialized system prompt that outputs:
   - Severity level (🔴 Critical / 🟡 Urgent / 🟢 Normal)
   - Prioritized action steps
   - Emergency contacts (India-specific: 112, 102, 100, 101)
   - Key findings with confidence levels
   - Warnings and follow-up actions

4. **VERIFY** — Google Search grounding cross-checks key claims for accuracy and provides source verification.

---

## 🔧 How It Works

### Multi-Modal Input
- **Text**: Describe any situation, paste medical records, news articles
- **Voice**: Web Speech API with Hindi-English support (en-IN locale)
- **Camera**: Capture photos of prescriptions, accident scenes, symptoms
- **File Upload**: Drag-and-drop images, text files, documents

### Smart Output
- **Severity-coded dashboard** with animated urgency indicators
- **Actionable checklists** — mark actions as complete
- **Emergency contacts** with click-to-call (`tel:` links)
- **Google Maps** showing nearest relevant services (hospitals, police, shelters)
- **Verification badges** showing fact-check results
- **Query history** with localStorage persistence

### Demo Scenarios Included
1. 🏥 **Medical Emergency** — Unconscious person with head wound
2. 🚗 **Road Accident** — Multi-vehicle collision on highway
3. 🌊 **Natural Disaster** — Flooding with elderly and children
4. 📋 **Health Records** — Diabetic patient with cardiac symptoms
5. 🛡️ **Personal Safety** — Being followed at night

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI Engine** | Google Gemini 2.5 Flash | Multimodal understanding & structured output |
| **Verification** | Google Search Grounding | Fact-checking via built-in search tool |
| **Maps** | Google Maps Embed API | Location-aware emergency services |
| **Backend** | Express.js (Node.js) | API server with security middleware |
| **Frontend** | Vanilla HTML/CSS/JS | Zero-framework, lightweight, fast |
| **Testing** | Vitest | Unit & integration tests |

### Google Services Integration
- **Gemini API** (`@google/genai`) — Core intelligence for multimodal input processing
- **Google Search Grounding** — Built-in tool for fact verification
- **Google Maps Embed API** — Nearby service discovery (hospitals, police, shelters)
- **Web Speech API** — Voice input (browser-native, Google-powered in Chrome)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- A Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TrieWar.git
cd TrieWar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the development server
npm run dev
```

### Run
```bash
npm run dev      # Development server with auto-reload
npm start        # Production server
npm test         # Run test suite
```

Visit `http://localhost:3000` to use the app.

---

## 🏗️ Architecture

```
TrieWar/
├── server.js                  # Express server + API routes + security
├── package.json               # Minimal dependencies
├── .env.example               # Environment template
├── .gitignore                 # Excludes node_modules, .env
├── public/                    # Static frontend (SPA)
│   ├── index.html             # Semantic HTML5 with ARIA labels
│   ├── css/styles.css         # Premium dark-mode design system
│   └── js/
│       ├── app.js             # Main orchestrator
│       ├── input-handler.js   # Multi-modal input (text/voice/camera/file)
│       ├── api-client.js      # Server API communication + SSE
│       ├── renderer.js        # Action card rendering engine
│       ├── map-service.js     # Google Maps integration
│       └── accessibility.js   # WCAG 2.1 AA utilities
├── services/
│   ├── gemini-service.js      # Gemini API wrapper (multimodal + grounding)
│   ├── triage-engine.js       # 4-stage pipeline (classify→enrich→structure→verify)
│   └── context-enricher.js    # Time, location, season awareness
├── tests/
│   ├── triage-engine.test.js  # Pipeline unit tests
│   └── api.test.js            # API integration tests
└── README.md
```

---

## 🔒 Security

- **API Key Protection**: Gemini API key stored server-side only (`.env`, gitignored)
- **CSP Headers**: Content Security Policy, X-XSS-Protection, X-Frame-Options
- **Input Sanitization**: HTML tags stripped, input length capped at 5000 chars
- **Rate Limiting**: 20 requests/minute per IP (in-memory)
- **No Client-Side Secrets**: All API calls proxied through the backend

---

## ♿ Accessibility

- **WCAG 2.1 AA compliant**
- Skip navigation link
- Semantic HTML5 elements with ARIA labels
- Keyboard navigation (Escape, Ctrl+Enter, Ctrl+K)
- Screen reader announcements (`aria-live` regions)
- High contrast mode toggle (persisted in localStorage)
- Reduced motion support (`prefers-reduced-motion`)
- Focus management for dynamic content
- `tel:` links for emergency contacts

---

## 🧪 Testing

```bash
npm test
```

**Test coverage includes:**
- Triage pipeline (classification, enrichment, structuring)
- Context enrichment (time, location, input type)
- Input validation (XSS sanitization, truncation)
- API endpoint validation (health, empty input, security headers)
- Rate limiting logic

---

## 📝 Assumptions

1. Users have a modern browser with JavaScript enabled (Chrome/Edge recommended for voice input)
2. Internet connection is available for Gemini API calls and map loading
3. The app is an **assistance tool**, not a replacement for actual emergency services — users are always advised to call 112 directly in life-threatening situations
4. Voice recognition works best in English (en-IN locale)
5. Camera access requires HTTPS in production (works on localhost for dev)
6. Medical advice is AI-generated and should always be verified by healthcare professionals

---

## 📄 License

MIT License — Built for PromptWars: Build with AI 2026