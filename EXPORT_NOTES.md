# Export notes

Prepared 2026-11-04 from Recall Loop source commit `9e8aeeb4c2a1dfe8e604e018a6740249a01d8bc2` (published version 7).

This is a separate portable source export; the existing hosted website was not changed by preparing it.

GitHub-specific changes:
- Relative manifest id, start URL and scope for repository subpaths.
- Removed the old hosting address from the portable app shortcut. A hosted portable copy links to its own directory; a local offline copy has no misleading online shortcut.
- Namespaced service-worker caches by scope to isolate multiple repository paths on one origin.
- Added GitHub Pages workflow, setup instructions, sample JSON, and subpath offline checks.
- Regenerated standalone HTML and service worker from the included sources.

All application files, source scripts, tests and icons are included. The former host's internal deployment metadata, Git history and repository credentials are intentionally excluded; none is needed for GitHub hosting. Imported personal decks and session data live in users' browsers and are not part of the project repository.
