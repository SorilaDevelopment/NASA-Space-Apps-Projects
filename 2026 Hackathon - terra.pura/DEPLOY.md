# Deploying terra.pura

Handover notes for whoever hosts this folder. There are **two separate sites**:

| Site | Folder | Domain | Type |
|---|---|---|---|
| terra.pura (the app) | this folder (everything except `pitch/`) | **https://terrapura.sorila.dev** | Plain static site |
| Pitch deck | `pitch/` (only in the hosting copy, not on GitHub) | **https://slides.sorila.dev/terrapura-pitch** | Plain static site |

The source is also published at https://github.com/SorilaDevelopment/NASA-Space-Apps-Projects, in the folder `2026 Hackathon - terra.pura`.

## What the project is

terra.pura is a NASA Space Apps Challenge 2026 entry (farm challenge). Farmers draw their field on a map and get a dashboard of what's worth growing now. It shows the cost, profit, risk of crop failure and likelihood of selling for each crop, using NASA POWER climate, NASA GIBS satellite imagery and NASA EONET hazards, along with soil, weather, price and local utility data.

**Everything runs in the visitor's browser.** The browser calls the public data APIs directly and saves the farm in localStorage. There are no accounts, no database and no server-side code: the server only sends files.

- **Front end:** HTML, CSS and ES modules. There's no build step, framework or `npm install`, and the files are served as they are.
- **Libraries** (Leaflet, three.js) and **fonts** are self-hosted in `assets/` so the site works behind web filters.

## 1. The app: terrapura.sorila.dev

### Option A (recommended): any static web server
Point nginx, Caddy or similar at this folder (without `pitch/`):

```nginx
server {
    server_name terrapura.sorila.dev;
    # listen 443 ssl; certificates as usual
    root /srv/terrapura;
    index index.html;
    location ~ /\.(claude|git) { return 404; }
    location /assets/ { expires 7d; }
    types { application/manifest+json webmanifest; }
}
```

- ES modules need `.js` served as `text/javascript` (or `application/javascript`); nginx's default `mime.types` does this.
- HTML pages are better left uncached (or short-cached) so updates show up straight away.

### Option B: the bundled Python server
`serve.py` is a tiny standard-library file server (Python 3.8+, nothing to install):

```bash
python3 serve.py 8080 --host 127.0.0.1    # behind a reverse proxy
```

It blocks `.claude/` and `.git/` and sends sensible headers. Run one process per site, for example with systemd:

```ini
[Service]
User=terrapura
WorkingDirectory=/srv/terrapura
ExecStart=/usr/bin/python3 serve.py 8080 --host 127.0.0.1 --quiet
Restart=on-failure
```

### Don't upload
- `pitch/`, which goes to the slides site; see below.
- `.claude/` and `server_data/`, local development leftovers. `server_data/` is from an older version that had accounts and isn't used any more.
- `install.ps1` and `install.sh` are harmless to serve, but they are meant to be run from GitHub, not the website.

### Check it's working
- `GET /` returns the homepage.
- In a browser: Get started, draw a field, and the loading screen should lead to the dashboard. That confirms the external data APIs are reachable.
- `GET /.claude/launch.json` returns 404.

### Outbound domains
Visitors' browsers call these directly; the server doesn't. If a school or office filter blocks the site, the About page (`/about.html`, "For network administrators") lists every domain to allow, including NASA POWER, GIBS and EONET, SoilGrids, Open-Meteo, OpenStreetMap, Esri and Wikidata.

### Other notes
- **VPN check:** the privacy page describes Sorila's VPN check, which applies across Sorila sites. Implementing it is the server's job; this code doesn't do it.
- **Canonical URLs:** canonical links, `sitemap.xml` and `robots.txt` already point to `https://terrapura.sorila.dev/`.
- **SI disclosure:** this is required by NASA Space Apps. It's in every page's metadata and footer, `about.html`, `README.md` and `LICENSE.md`; please keep it.
- **Licence:** dual-licensed, AGPL-3.0 or commercial; see `LICENSE.md`.

## 2. The pitch deck: slides.sorila.dev/terrapura-pitch

The deck's source isn't in the public GitHub repo; it's only in the copy of this folder handed over for hosting. The READMEs link to the live deck instead.

- **Upload:** put the contents of `pitch/` (about 5 MB) at `/terrapura-pitch/` on the slides host. It's a **plain static site**: one `index.html` plus `fonts/`, `img/` and `shots/`.
- **Paths are relative,** so it works in that subfolder with no changes. Serve `/terrapura-pitch` with a trailing slash, or redirect to it, so relative paths resolve.
- **No server code, API or build.** It doesn't call terrapura.sorila.dev except for the link and QR code on the last slide.
- **Presenting:** arrow keys, space or click to move; F for full screen; N for speaker notes; 1–7 to jump to a slide; swipe works on touch screens. Each slide has its own URL, e.g. `#4`.
- Normal caching is fine. All images, fonts and the QR code are local files.
- Check: `https://slides.sorila.dev/terrapura-pitch/#1` should show the intro slide with the aerial tractor photo, and F should go full screen.
