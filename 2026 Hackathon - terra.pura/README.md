# terra.pura

Changing how you see agriculture: find out what's worth growing on your land using NASA Earth-observation climate data, soil, weather and local price data. A NASA Space Apps Challenge 2026 project (farm challenge).

Live: https://terrapura.sorila.dev

## Run it on your own computer

### Windows (one command)

Open **PowerShell** and paste:

```powershell
irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
```

It downloads terra.pura and, if you don't already have Python, a portable copy from python.org (no admin needed). It installs to `%LOCALAPPDATA%\terra.pura` and asks how you want to run it:

1. **This computer only.** Opens in your browser; stop it with Ctrl+C.
2. **Shared on your network.** Phones, tablets and other computers on your Wi-Fi can open it too. Windows asks once to allow it through the firewall (private networks only).
3. **In the background 24/7.** Starts automatically whenever you log in.
4. **Background 24/7 and shared on your network.**
5. **Remove** terra.pura from your computer.

Run the same command again any time to update or change the option.

### macOS and Linux (one command)

Open **Terminal** and paste:

```bash
curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | bash
```

Same five options as on Windows. It needs `python3` (3.8+), which macOS and most Linux systems already have; if it's missing, the installer tells you how to get it. "Keep it running" uses launchd on macOS and a systemd user service on Linux.

### Or run it by hand (any system with Python 3.8+)

```bash
python3 serve.py                      # http://localhost:5173, this computer only
python3 serve.py 5173 --host 0.0.0.0  # also reachable from your network
```

There's nothing to install or build: it's HTML, CSS and ES modules plus a tiny standard-library Python file server. Everything you enter is saved in your own browser (localStorage); there are no accounts and nothing is stored on the server.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Homepage. "Get started" offers to continue with the farm saved in your browser or start a new one |
| `onboarding.html` | 6 steps: land (map + pins), energy, water, sewage, machinery, storage. `?edit=<step>` opens a single step |
| `complete.html` | Loading screen: fetches NASA POWER, SoilGrids, Open-Meteo, OpenStreetMap and price data |
| `dash.html` | Best crops now, year-round rotation, explained costs, emissions, editable estimates, hazard alerts, soil moisture, 3D crops |
| `simulate.html` | Sped-up growth simulation and "most likely to die" ranking |
| `satellite.html` | NASA GIBS satellite layers (HLS 30 m, MODIS NDVI) and 4-year crop-health chart |
| `report.html` | Itemised cost report, all crops compared, every assumption listed |
| `market.html` | Demand & supply, sell likelihood, supermarket contract odds, refinery (flour mill / oil press) calculator |
| `solar.html` | Solar planner: savings vs crop sales lost under panels |
| `pricing.html` | Local farm-gate prices vs world median |
| `settings.html` | Change providers, machinery, storage, land, staff & wages |
| `about.html` | How it works, data sources, SI disclosure, allowlist for network admins |
| `privacy.html` | Privacy policy |
| `pitch/` | The pitch deck: a separate static site, hosted at slides.sorila.dev/terrapura-pitch |

Hosting it for other people? See [DEPLOY.md](DEPLOY.md).

## Data sources

NASA POWER (climate, sunlight, soil wetness) · NASA GIBS (HLS, MODIS NDVI) · NASA EONET (hazards) · ISRIC SoilGrids 2.0 (soil) · Open-Meteo (forecast) · OpenStreetMap: tiles, Nominatim, Overpass (© OpenStreetMap contributors, ODbL) · Esri World Imagery (photo basemap) · FAOSTAT Producer Prices and Food Balance Sheets (CC BY 4.0, bundled in `assets/data/`) · World Bank Pink Sheet (bundled) · ExchangeRate-API · postcodes.io · Octopus Energy API · Ofgem · US: DOE/PNNL electric service territories, EIA Form 861 2025 (bundled), EPA water-system service areas · Eurostat (reference only) · Red Eléctrica (Spain) · CRE (France) · ANRE POSF (Romania) · Wikidata / Wikimedia Commons (logos) · supplier directory for 68 countries and water directory for 101 (`assets/js/suppliers.js`).

## Licence

Dual-licensed: **AGPL-3.0** (free; see the repository's [`LICENSE`](../LICENSE)) or a **commercial licence** if you want to edit it or build it into a commercial product or service without releasing your code under AGPL-3.0. Details and contact in [LICENSE.md](LICENSE.md).

## Super Intelligence (SI) disclosure

The code for terra.pura was generated with Super Intelligence (SI): Claude by Anthropic, a code-generation tool. The terra.pura team created the original interface designs (homepage, onboarding and dashboard layouts, colours and typography), chose the challenge, data sources and features, and directed, reviewed and tested every step on a local server. SI was used to turn those designs into working pages and animations; write the crop growth simulation, economics model and data integrations; generate the procedural 3D crop models; build the FAOSTAT price dataset; and write the site metadata. All climate, soil, weather, map and price figures come from the cited data providers, not from SI.

## Third-party libraries

Leaflet 1.9.4 (BSD-2-Clause) and three.js r170 (MIT), self-hosted in `assets/vendor/`.
