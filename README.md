# Recall Loop — complete GitHub edition

A flashcard question app that keeps returning unfinished cards until every card meets your session goal. This package includes all application source, styles, icons, sample content, build scripts, tests, a standalone offline HTML app, and a GitHub Pages deployment workflow.

No backend, database server, API key, ChatGPT login, or paid AI service is required. PDF-to-question generation happens outside the app; import the resulting JSON. Your imported decks and progress are stored only in your browser.

## Publish on GitHub Pages

1. Extract this ZIP on your PC.
2. Create a **public** GitHub repository named `recall-loop`, with default branch `main`. A public repository can use GitHub Pages on GitHub Free.
3. Upload **the contents of this folder** into the repository root. Do not upload just the ZIP or nest everything in another `Recall_Loop_GitHub` folder. Include `.github/workflows/pages.yml`. GitHub Desktop is a convenient way to publish the complete folder, including files starting with a dot.
4. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Open **Actions → Deploy Recall Loop to GitHub Pages → Run workflow**, select `main`, and run it. If an automatic run failed before you enabled Pages, rerun it after step 4.
6. Wait for the run to finish successfully. The deployment result and Settings → Pages show the exact website URL. For the suggested repository name, it normally looks like `https://YOUR-USERNAME.github.io/recall-loop/`.
7. Open that URL on your PC or phone. Visitors do not need a GitHub or ChatGPT account.

The included workflow rebuilds the portable file and offline cache, runs tests, and publishes only `dist/`. Each future push to `main` repeats that process. If you use another branch, change `branches: [main]` in the workflow.

Official reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

### Uploading through the GitHub website

Use **Add file → Upload files** for the extracted files and folders. Confirm the repository shows `dist`, `scripts`, `tests`, `package.json`, and `.github` at the top level.

If your browser skips `.github`, use **Add file → Create new file**, type `.github/workflows/pages.yml` as the filename, paste the complete content of that file from this package, and commit to `main`. The `.github` folder is essential for automatic deployment. Do not choose “Deploy from a branch” with the complete package: the app entry point is in `dist/`, not the repository root.

### Simple alternative: no workflow

For a separate, basic hosting repository, upload **only the contents of `dist/`** at the repository root (so `index.html` is at the top level). In Settings → Pages, choose **Deploy from a branch**, `main`, `/(root)`, then Save. Keep this full source package on your computer for editing and rebuilding. Choose one deployment method per repository.

## Run on Windows immediately

Open `dist/Recall_Loop.html` in Chrome or Edge. This standalone file works without a server or internet. Import `examples/example-deck.json` or your own question files.

To test the full website locally, install Python 3 and run from this folder:

```sh
python -m http.server 8080 --directory dist
```

Open `http://localhost:8080/`. On Windows, `py` can replace `python`. Open the full website through a local server; do not double-click `dist/index.html`, because it uses JavaScript modules.

## Edit and test

Use Node.js 22 or newer. There are no npm dependencies to install.

```sh
npm run build
npm test
```

Edit the source files inside `dist/`, then rebuild. `Recall_Loop.html` and `sw.js` are generated files; change their source/build script instead of editing them directly. The workflow performs the rebuild automatically when publishing.

Optional icon regeneration requires Python with Pillow (`python -m pip install -r requirements-dev.txt`), then `python scripts/make-icons.py` and `npm run build`. The ready-made PNG icons are already included, so this is not required for hosting.

## What's included

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Main page and dialogs |
| `dist/styles.css` | Responsive interface, Night/Paper themes, reading preferences |
| `dist/app.js` | UI, imports, exports, browser storage and study interactions |
| `dist/engine.js` | Validation, shuffle, retry scheduling and completion rules |
| `dist/decks.js` | Built-in sample questions |
| `dist/install.js` | PWA installation and offline status |
| `dist/manifest.webmanifest` | Installable app metadata, using repository-relative URLs |
| `dist/icons/` | All app icons |
| `dist/sw.js` | Generated offline service worker |
| `dist/Recall_Loop.html` | Generated self-contained offline application |
| `scripts/` | Portable/offline build and icon-generation sources |
| `tests/` | Learning engine, portable app and offline regression tests |
| `examples/example-deck.json` | Ready-to-import question format example |
| `.github/workflows/pages.yml` | Automatic GitHub Pages deployment |
| `docs/APP_DETAILS.md` | Full app behavior and implementation notes |
| `docs/EXPORT_NOTES.md` | Export provenance and GitHub compatibility changes |

## Learning rules preserved

- Quick: each card must be answered correctly once.
- Reinforce: each card needs two consecutive correct answers. A mistake resets that card's streak.
- Every unfinished card stays in the session. The final missed card repeats immediately when nothing else remains; the session cannot end while any card is unfinished.
- Wrong choices do not reveal the answer. Explicit “I don't know” and correct answers can show it.
- Randomized retries use the selected maximum of 3, 7, or 10 other cards, default 7; shorter gaps are possible when needed.
- Choose shuffled or JSON first-appearance order. Answer choices still shuffle.
- Next stays at the bottom; completion includes mistake review.
- Night/Paper, larger text, Focus and optional break reminders remain available.

## Existing decks and progress

A GitHub Pages URL is a different origin from the old website. It cannot automatically read the old site's decks or progress. Reimport your JSON files, or export decks from the old site if it becomes reachable. Deck exports contain questions, not session progress. There is no cloud or cross-device sync.

This package contains built-in sample decks, not questions you imported on your devices. Those are stored in those browsers and are not accessible from the source code. Do not clear the old site's browser data if you want to preserve it.

For the portable file, browser storage support can vary by browser and file location; keep deck backups and keep the file at a consistent location.

## Installing and updates

Visit your published HTTPS site, then select **Get the app** or use the browser installation option when available. Wait until the app reports offline readiness before relying on it offline. After deploying an update, close all Recall Loop tabs/windows and reopen so the waiting service worker can activate.

The export has no hardcoded dependency on the old `chatgpt.site` host. The manifest and assets support repository subpaths. Offline caches are scoped to each app installation URL so separate Recall Loop repositories on the same GitHub Pages origin do not delete each other's offline caches. Browser deck storage is still shared by same-origin installations; use one primary installation per origin.

## Troubleshooting GitHub setup

- **No workflow listed:** ensure `.github/workflows/pages.yml` exists in the default branch.
- **Pages not enabled / deployment fails:** choose GitHub Actions in Settings → Pages, then rerun the workflow. Read the failed step under Actions for the exact error.
- **404:** use the URL shown by the successful Pages deployment, including the repository path. Confirm the ZIP contents were uploaded, not the ZIP itself.
- **Old version:** close all app tabs/windows, then reopen. Do not clear storage as the first troubleshooting step.

The package has been built and tested locally. The GitHub Actions deployment itself must run in your repository; it has not yet been executed on your GitHub account.
