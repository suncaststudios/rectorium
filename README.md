# The Rectorium

Personal portfolio for **r3ctrr313** (music as **vivi4nite**): a desktop-OS-style site with games, art, music and posts. Plain HTML/CSS/JS with ES modules, no build step.

## Run locally
ES modules and `fetch` need http, not `file://`:
```
python3 -m http.server 8000     # then open http://localhost:8000
```

## Deploy on GitHub Pages
1. Push this folder's contents to the root of a repo (or `/docs`).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Everything uses relative paths, so it works at `https://user.github.io/repo/`.

## Where things are
| What | Where |
|---|---|
| **All content** (games, art, albums, Radios, songs, posts, archive, socials, about, achievements) | `data/content.json` |
| Images (`full/` 1600px, `thumb/` 480px, webp, metadata stripped) | `assets/img/` |
| Audio (128 kbps mp3, metadata stripped) | `assets/audio/` |
| Firebase config + on/off switch for analytics | `firebase-config.js` |
| Desktop / windows / search / easter egg | `js/main.js`, `js/wm.js` |
| Apps | `js/apps/*.js` |
| Simple non-desktop version | `portfolio.html` |

## Editing content
Edit `data/content.json` and commit. Keep one record per thing and link by id (`game`, `radio`, `song`, `games: [...]` on posts) so search and cross-links work.
- Game status: `IN DEVELOPMENT`, `PLANNING STAGES`, `RELEASED`, `IN DEMO`, `EARLY ACCESS`, `ON HOLD`, `CANCELLED`, `FINISHED`. Visibility is the separate `visibility` / `status` field (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- Posts: `type` is `REVIEW`, `DEVLOG` or `UPDATE`. Reviews can add `"rating": {"value": 4, "scale": 5}` (or scale 10), `pros`, `cons`, `subject`, `spoilers`.
- Art/songs: `date` is optional (`YYYY-MM-DD`); items without dates keep file order.
- Add new image: put `name.webp` in both `assets/img/full` and `assets/img/thumb`, then add an `art` entry with `"id": "name"`.

## Notes
- Downloads: no download buttons, right-click/drag disabled on art and `nodownload` on the simple page's audio. This deters casual saving only; anything a browser can show can be saved.
- Analytics: Firebase Analytics loads only if `ANALYTICS_ENABLED` is true, the visitor hasn't enabled Do Not Track, and the in-app toggle is on.
- Firebase web config values are public identifiers, not secrets. Protect any database/storage with Security Rules.
