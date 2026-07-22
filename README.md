# Review Authenticity Lab

A Chrome Extension (Manifest V3) that analyzes product reviews on **Amazon** and
**Google Play** to detect suspicious patterns — entirely on-device, with no
backend and no data leaving the browser.

---

## Features

| Signal | Description | Status |
|--------|-------------|--------|
| **Sentiment Mismatch** | Detects reviews where text sentiment conflicts with star rating | Phase 2 |
| **Duplicate Detection** | Identifies verbatim and near-duplicate review text (Jaccard) | Phase 2 |
| **Reviewer Patterns** | Flags duplicate authors and single-review accounts | ✅ Foundation |
| **Burst Detection** | Detects abnormal temporal clustering of reviews (z-score) | Phase 2 |
| **AI Summary** | Natural-language summary via Transformers.js + optional Gemini/Groq | Phase 2 |
| **Snapshot History** | Time-series comparison of review state across multiple captures | ✅ Foundation |
| **Manual Labels** | User-created ground-truth labels on individual reviews | ✅ Foundation |

---

## Architecture

```
Browser Tab (Content Script)
  content.js          ← Coordinator + normalizer
  extractor.js        ← Platform-specific DOM extraction
  pageObserver.js     ← MutationObserver for SPA pagination
  pagination.js       ← Read pagination state
        ↓ chrome.runtime.sendMessage
Background Service Worker
  background.js       ← Message router, analysis orchestrator
        ↓
  Storage Layer
    indexedDb.js      ← IDB abstraction (promise-based)
    snapshots.js      ← Snapshot persistence + retention
    labels.js         ← Manual label CRUD
        ↑
  Analysis Pipeline (Phase 2)
    sentiment.js      ← Transformers.js inference
    mismatchDetector  ← Star vs. sentiment cross-check
    duplicateDetector ← Jaccard trigram similarity
    reviewerPattern   ← Duplicate author / single-account
    burstDetector     ← Temporal z-score clustering
    summaryGenerator  ← Structured + optional LLM summary
        ↑
  UI Layer
    popup.html/js/css     ← Lightweight status + trigger
    sidepanel.html/js/css ← Full analysis dashboard
```

---

## Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript (ES Modules)** — no frameworks
- **IndexedDB** — snapshot + label persistence
- **chrome.storage.local** — lightweight ephemeral state
- **Transformers.js** — on-device ML inference (Phase 2)
- **Gemini / Groq API** — optional summary generation (Phase 2)

---

## Project Structure

```
review-authenticity-lab/
├── extension/
│   ├── manifest.json
│   ├── background/background.js
│   ├── content/
│   │   ├── content.js
│   │   ├── extractor.js
│   │   ├── pageObserver.js
│   │   └── pagination.js
│   ├── analysis/
│   │   ├── sentiment.js
│   │   ├── mismatchDetector.js
│   │   ├── duplicateDetector.js
│   │   ├── reviewerPattern.js
│   │   ├── burstDetector.js
│   │   └── summaryGenerator.js
│   ├── storage/
│   │   ├── indexedDb.js
│   │   ├── snapshots.js
│   │   └── labels.js
│   ├── models/
│   │   ├── review.js
│   │   ├── snapshot.js
│   │   └── label.js
│   ├── ui/
│   │   ├── popup.html / popup.js / popup.css
│   │   └── sidepanel.html / sidepanel.js / sidepanel.css
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   └── assets/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
├── corpus/
│   ├── amazon-product-1.json
│   └── playstore-app-1.json
├── timeseries/
│   └── amazon-product-1/
│       ├── day1.json
│       ├── day2.json
│       └── day3.json
├── FINDINGS.md
└── README.md
```

---

## Installation (Development)

1. Clone the repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the `extension/` directory.
5. Navigate to an Amazon product page or Google Play app page.
6. Click the extension icon in the toolbar.

---

## Development Rules

See [AGENTS.md](./AGENTS.md) for the full code quality standards applied to this project.

---

## Code Quality Standards

- **Zero frameworks** — vanilla JS ES modules throughout
- **SOLID principles** — every module has exactly one responsibility
- **No magic strings** — all constants in `utils/constants.js`
- **Immutable models** — all data objects are `Object.freeze()`d
- **Graceful degradation** — every null-check, every try/catch, every error state shown in UI
- **No inline styles** — all styling via CSS classes

---

## Roadmap

### Phase 1 — Foundation ✅
- [x] Project structure
- [x] Manifest V3 configuration
- [x] ES Module content scripts
- [x] Background service worker with typed message routing
- [x] IndexedDB abstraction layer
- [x] Review, Snapshot, ManualLabel models
- [x] DOM extractors (Amazon + Google Play)
- [x] MutationObserver for SPA pagination
- [x] Popup UI (5 states)
- [x] Side Panel UI (full dashboard)
- [x] Corpus sample data

### Phase 2 — Analysis
- [ ] Transformers.js sentiment inference
- [ ] Mismatch detection (sentiment × rating)
- [ ] Duplicate detection (Jaccard trigrams)
- [ ] Burst detection (z-score sliding window)
- [ ] Summary generation (structured + LLM)
- [ ] Populate metrics in popup

### Phase 3 — Polish
- [ ] Export labels as CSV / JSON
- [ ] Cross-session time-series visualization
- [ ] Optional Gemini / Groq narrative summary
- [ ] Auto-pagination (opt-in)
