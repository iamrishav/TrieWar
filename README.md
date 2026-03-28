# 🚨 TRIAGE AI — Universal Emergency & Action Intelligence

> **From Chaos to Clarity, Instantly.**

TRIAGE AI is a **Gemini-powered** universal bridge that transforms **any unstructured, messy real-world input** — voice, photos, medical records, accident reports, disaster alerts — into **structured, verified, life-saving actions**.

[![Built with Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini%202.0-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Google Maps Platform](https://img.shields.io/badge/Google%20Maps-Platform-34A853?logo=googlemaps&logoColor=white)](https://developers.google.com/maps)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Analytics-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
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
   - **Location context**: User coordinates via browser Geolocation API + Google Geocoding API
   - **Seasonal awareness**: Monsoon flood risks, summer heat warnings, dengue season alerts
   - **Input type hints**: Voice inputs may have transcription errors, images need visual analysis

3. **STRUCTURE** — Google Gemini (gemini-2.0-flash) processes the enriched input with:
   - **Structured JSON output** using Gemini's `responseSchema` enforcement
   - **System instructions** for consistent, safety-first behavior
   - Severity level (🔴 Critical / 🟡 Urgent / 🟢 Normal)
   - Prioritized action steps with timeframes
   - Emergency contacts (India-specific: 112, 102, 100, 101)
   - Key findings with confidence levels

4. **VERIFY** — **Google Search grounding** cross-checks key claims for accuracy using Gemini's built-in `googleSearch` tool, providing source-backed verification with confidence scores.

---

## 🔗 Google Services Integration (Deep Dive)

### 1. Google Gemini API (`@google/genai`)

- **Model**: `gemini-2.0-flash` — fast, cost-efficient multimodal model
- **Multimodal Input**: Text + Image processing in a single call
- **Structured Output**: Uses `responseSchema` with JSON schema enforcement for guaranteed valid output
- **System Instructions**: Specialized emergency triage prompt with India-relevant context
- **Temperature**: 0.3 (low for consistent, factual responses)
- **Google Search Tool**: Built-in grounding for real-time fact verification

**Files**: [`services/gemini-service.js`](services/gemini-service.js)

### 2. Google Search Grounding (via Gemini Tools)

- Cross-checks emergency information against live web data
- Provides verification status (Verified / Partially Verified / Unverified)
- Returns confidence scores (0.0 - 1.0) and source references
- Processes up to 3 verification queries per triage session

**Files**: [`services/gemini-service.js`](services/gemini-service.js) → `verifyWithGrounding()`

### 3. Google Maps JavaScript API

- **Interactive Maps**: Custom dark-themed maps matching the app's design system
- **Custom Markers**: Severity-coded colored markers with numbered labels
- **InfoWindows**: Rich place details (name, address, phone, rating, open status, Google Maps link)
- **Dynamic Loading**: Maps API loaded only when needed via async script injection

**Files**: [`public/js/map-service.js`](public/js/map-service.js)

### 4. Google Places API (New)

- **Nearby Search**: Finds hospitals, police stations, fire stations, pharmacies based on triage category
- **Category Mapping**: Triage categories → Place types (medical→hospital, accident→hospital+police, disaster→shelter)
- **Place Details**: Name, address, phone, rating, opening hours, Google Maps URL
- **Server-Proxied**: All requests go through Express backend to protect API key

**Files**: [`services/maps-api-service.js`](services/maps-api-service.js) → `searchNearbyPlaces()`

### 5. Google Directions API

- **Route Calculation**: Driving/walking route from user to nearest emergency service
- **Step-by-step Instructions**: Turn-by-turn navigation text
- **Distance & Duration**: ETA to nearest facility displayed on map
- **Polyline Rendering**: Visual route drawn on the interactive map

**Files**: [`services/maps-api-service.js`](services/maps-api-service.js) → `getDirections()`

### 6. Google Geocoding API

- **Reverse Geocoding**: Converts GPS coordinates to human-readable addresses
- **Address Components**: Extracts city, state, country, PIN code, area
- **Location Display**: Shows user's resolved address below the map

**Files**: [`services/maps-api-service.js`](services/maps-api-service.js) → `reverseGeocode()`

### 7. Firebase Firestore (Cloud Database)

- **Triage Sessions**: Every triage result stored with metadata (severity, category, processing time, location)
- **Emergency Statistics**: Aggregated severity/category counters for analytics
- **Cloud History**: Persistent triage history accessible across devices
- **REST API**: Uses Firestore REST API for lightweight server-side writes (no firebase-admin bloat)

**Files**: [`services/firebase-service.js`](services/firebase-service.js)

### 8. Firebase Analytics (via Firebase JS SDK)

- **Event Tracking**: `triage_submit`, `scenario_click`, `feature_use`, `map_interaction`
- **User Properties**: App version, platform
- **Engagement**: Background/foreground tracking, feature usage
- **CDN Loaded**: Firebase SDK loaded from Google CDN (no npm dependency)

**Files**: [`public/js/firebase-client.js`](public/js/firebase-client.js)

### 9. Google Fonts

- **Inter**: Primary UI font (weights 300-900) for the application interface
- **JetBrains Mono**: Monospace font for data display and technical content

### 10. Web Speech API (Google-powered in Chrome)

- **SpeechRecognition**: Voice input with en-IN locale for Hindi-English support
- **Continuous Mode**: Real-time transcription while speaking
- **Browser-Native**: Uses Google's speech recognition engine in Chrome

**Files**: [`public/js/input-handler.js`](public/js/input-handler.js)

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
- **Interactive Google Map** with nearby hospitals, police, shelters (via Places API)
- **Directions** to nearest emergency facility (via Directions API)
- **Reverse-geocoded address** showing user's current location
- **Verification badges** showing fact-check results from Google Search
- **Cloud-synced history** via Firebase Firestore

### Demo Scenarios Included
1. 🏥 **Medical Emergency** — Unconscious person with head wound
2. 🚗 **Road Accident** — Multi-vehicle collision on highway
3. 🌊 **Natural Disaster** — Flooding with elderly and children
4. 📋 **Health Records** — Diabetic patient with cardiac symptoms
5. 🛡️ **Personal Safety** — Being followed at night

---

## 🛠️ Tech Stack

| Layer | Technology | Google Service |
|-------|-----------|---------------|
| **AI Engine** | Gemini 2.0 Flash | ✅ Google Gemini API |
| **Verification** | Google Search Grounding | ✅ Google Search (via Gemini Tools) |
| **Maps** | Maps JavaScript API | ✅ Google Maps Platform |
| **Places** | Places API (New) | ✅ Google Maps Platform |
| **Routing** | Directions API | ✅ Google Maps Platform |
| **Geocoding** | Geocoding API | ✅ Google Maps Platform |
| **Database** | Firestore (REST) | ✅ Firebase |
| **Analytics** | Firebase Analytics | ✅ Firebase |
| **Fonts** | Inter + JetBrains Mono | ✅ Google Fonts |
| **Voice** | Web Speech API | ✅ Google (in Chrome) |
| **Backend** | Express.js (Node.js) | — |
| **Frontend** | Vanilla HTML/CSS/JS | — |
| **Testing** | Vitest | — |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- A Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
- A Google Maps API key with Places, Directions, Geocoding, Maps JS APIs enabled
- (Optional) Firebase project for cloud persistence and analytics

### Google Cloud APIs Required
Enable these APIs at [Google Cloud Console](https://console.cloud.google.com/apis/library):
1. **Maps JavaScript API**
2. **Places API (New)**
3. **Directions API**
4. **Geocoding API**

### Firebase Setup (Optional)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable Firestore Database (test mode)
3. Add a Web App → Copy the config to `.env`

### Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TrieWar.git
cd TrieWar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

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
├── server.js                  # Express server + API routes + Google Maps proxy
├── package.json               # Minimal dependencies
├── .env.example               # Environment template (all API keys)
├── .gitignore                 # Excludes node_modules, .env
├── public/                    # Static frontend (SPA)
│   ├── index.html             # Semantic HTML5 with ARIA labels
│   ├── css/styles.css         # Premium dark-mode design system
│   └── js/
│       ├── app.js             # Main orchestrator + Firebase init
│       ├── input-handler.js   # Multi-modal input (text/voice/camera/file)
│       ├── api-client.js      # Server API communication + SSE
│       ├── renderer.js        # Action card rendering engine
│       ├── map-service.js     # Google Maps JavaScript API integration
│       ├── firebase-client.js # Firebase Analytics + Firestore client
│       └── accessibility.js   # WCAG 2.1 AA utilities
├── services/
│   ├── gemini-service.js      # Gemini API (multimodal + structured output + grounding)
│   ├── triage-engine.js       # 4-stage pipeline (classify→enrich→structure→verify)
│   ├── context-enricher.js    # Time, location, season awareness
│   ├── maps-api-service.js    # Google Places, Directions, Geocoding APIs
│   └── firebase-service.js    # Firebase Firestore REST API service
├── tests/
│   ├── triage-engine.test.js  # Pipeline + Firebase + Maps unit tests
│   └── api.test.js            # API integration tests (all endpoints)
└── README.md
```

---

## 🔒 Security

- **API Key Protection**: All API keys stored server-side only (`.env`, gitignored)
- **CSP Headers**: Comprehensive Content Security Policy with allowlisted Google domains
- **Permissions Policy**: Camera, microphone, and geolocation restricted to same-origin
- **Input Sanitization**: HTML tags stripped, input length capped at 5000 chars
- **Rate Limiting**: 20 requests/minute per IP (sliding window, with automatic cleanup)
- **No Client-Side Secrets**: All Google API calls proxied through Express backend
- **XSS Protection**: `X-XSS-Protection`, `X-Content-Type-Options: nosniff`
- **CORS**: Same-origin policy enforced by default

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
- Triage pipeline (classification, enrichment, structuring, error handling)
- Context enrichment (time, location, input type, weekend detection)
- Input validation (XSS sanitization, truncation, empty input, nested HTML)
- Firebase service (configuration detection, graceful degradation, save/retrieve)
- Maps API service (function exports, error handling, category mapping)
- API endpoint validation (health, triage, places, directions, geocode, firebase config)
- Rate limiting logic (sliding window, cleanup)
- Security headers verification

---

## 📝 Assumptions

1. Users have a modern browser with JavaScript enabled (Chrome/Edge recommended for voice input)
2. Internet connection is available for Gemini API calls, Google Maps, and Firebase
3. The app is an **assistance tool**, not a replacement for actual emergency services — users are always advised to call 112 directly in life-threatening situations
4. Voice recognition works best in English (en-IN locale)
5. Camera access requires HTTPS in production (works on localhost for dev)
6. Medical advice is AI-generated and should always be verified by healthcare professionals
7. Firebase is optional — app works fully offline with localStorage fallback

---

## 📄 License

MIT License — Built for PromptWars: Build with AI 2026