# Recall Loop

Public, account-free static study app. Open the hosted URL in a modern desktop browser (Chrome or Edge on Windows). No account, API key, or subscription configuration is needed to use the app. Select **Get the app** for optional installation in Chrome or Edge, or download the portable HTML file.

## Workflow

Give ChatGPT a PDF, notes, or topic. Ask for a Recall Loop question file. In the app, select **Add questions → Import questions** and upload the `.json` file or paste its contents. The **From a PDF** tab contains a complete prompt. Direct PDF processing and automatic AI generation are not part of this version.

## Question format

```json
{
  "title": "My study deck",
  "description": "What this deck covers",
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1,
      "explanation": "Two plus two equals four.",
      "source": "Notes, page 1",
      "topic": "Addition"
    }
  ]
}
```

`correctIndex` is zero-based. Each deck supports 1–500 questions, each with 2–6 distinct choices. Import validates the complete deck before adding it. File import has a 5 MB limit. Text is displayed as text, never executed as HTML. The app also supports writing cards manually and exporting question decks.

## Learning behavior

- Quick: each question needs one correct answer.
- Reinforce: each question needs two consecutive correct attempts; an incorrect answer resets that card's streak.
- Choose Shuffle or JSON order for new cards. Retry cards are interleaved in either mode; answer choices remain shuffled.
- Missed or unfinished cards are reinserted after up to 3, 7, or 10 other cards (default 7). With fewer cards remaining, they return sooner.
- Order changes after an attempt ask to restart the session. Retry-gap changes preserve progress and apply to future reinsertions. Both settings persist with the session.
- A wrong choice is marked without revealing the correct answer, explanation, or source. These are shown after a correct answer or an explicit “I don’t know” request. Answer positions are shuffled while retaining their correct-answer association.
- The score counts unique cleared questions. Repeated button clicks cannot count multiple answers.
- Progress (including an open feedback state) and decks save in localStorage under `recall-loop-v1`. There is no server-side account data or device synchronization. Exported files contain questions only.
- The interface supports keyboard choices 1–6 and Enter to continue; dialogs support Escape and tabs support arrow keys.

## Implementation

Buildless HTML/CSS/ES modules in `dist/`. No external assets or runtime dependencies. `engine.js` is pure session/import logic; `app.js` renders the interface and stores progress. `decks.js` contains two sample decks. This export deploys `dist/` using `.github/workflows/pages.yml`.

Run checks with `node --test tests/engine.test.mjs` and `node --check dist/app.js`.

Browser QA verified wrong-answer feedback, requeueing, shuffled choices, pasted imports, invalid import errors, completion, refresh persistence, the PDF guide, and manual card creation with a non-first correct answer.

## Installed app and offline copy

The web app has a manifest with standalone display and 192/512-pixel icons. The Get the app dialog uses the native install prompt where available and provides browser installation instructions otherwise. A service worker precaches the complete application. The dialog reports when offline access is ready; the first online visit is required. Updates activate after all older app windows close, preserving a consistent set of assets.

`dist/Recall_Loop.html` is a self-contained portable file with embedded styles and classic JavaScript. Download it and double-click it on a PC to use it offline. Browser storage for local files can vary by browser and file location; keeping the file at one path and exporting decks is recommended. The portable file and hosted app do not synchronize progress.

After modifying runtime source, run `node scripts/build-portable.mjs` to regenerate the portable file and content-versioned service worker. After changing the brand mark, run `python scripts/make-icons.py` first. Run `node --test tests/*.test.mjs` for session and offline checks.

## Session review and navigation

After answering, Next is fixed to the bottom of the viewport so it remains reachable for long cards. After completion, Review mistakes lists each missed question, missed choices (including I don't know), counts, the correct answer, explanation, and source. Mistakes persist through refresh and later correct attempts; restarting begins a new review. Older sessions keep their existing progress and explicitly disclose that earlier mistakes were not tracked.

Shuffle mode retains the Fisher–Yates algorithm. Displayed card numbers refer to their original deck positions. Tests check all possible three-item shuffle branches, ordered first appearances, configurable retry gaps, short-deck behavior, and settings persistence.

## Reading preferences

The study screen includes Night and Paper themes, larger text, and Focus mode that hides side navigation. Preferences save separately in `recall-loop-comfort`, preserving deck/session data. Session settings collapse to keep the question prominent. Optional break reminders count visible practice time and show a dismissible reminder after 25 minutes; they never block answers or erase progress. The timer resets on reload. Existing session tests and portable/offline checks pass; browser visual QA was unavailable for this redesign because the browser connection timed out.


## Retry integrity (November 2026)

Completion now requires every deck card to have a recorded correct streak meeting the goal, in addition to an empty pending queue. Reconciliation restores any missing pending cards from streaks and invalidates stale completion flags. This is defensive hardening: the reported premature completion could not be reproduced in the original scheduler, which already shortened retries for small decks.

Retries reserve randomized attempt slots, normally after 2 through the chosen maximum (3/7/10) other cards. Slots can be earlier near the end or to avoid delaying already scheduled retries. With no fresh cards, the earliest pending retry runs immediately rather than waiting. Later errors cannot push existing reservations back. Changes to the maximum affect future scheduling; existing reservations stay intact. No automatic answer reveal was added.

Validated with 18 tests, including 120 seeded mixed-error scenarios, final-card repeated misses at all three caps and both goals, reloads, repairing dropped pending IDs, JSON first-appearance order, offline use and portable builds. Browser QA: a one-card deck remained 0/1 after a wrong answer, repeated after refresh, completed only after a correct answer, and retained the mistake review. Overall attempt accuracy can remain below 100% after all cards are cleared; the UI explains this.
