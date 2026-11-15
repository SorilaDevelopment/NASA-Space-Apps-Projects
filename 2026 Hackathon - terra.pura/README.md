# terra.pura

Changing how you see agriculture: find out what's worth growing on your land using NASA Earth-observation climate data, soil, weather and local price data. A NASA Space Apps Challenge 2026 project (farm challenge).

Live: https://terrapura.sorila.dev

## How to run it on your laptop or PC

**Easiest: use it online at <https://terrapura.sorila.dev>.** Nothing to install.

To run your own copy, pick **one** of the options below. Each takes about a minute.

### Option 1: paste one command (recommended)

**Windows:** press the Start button, type **PowerShell**, open it, paste this line and press Enter:

```powershell
irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
```

**macOS:** open **Terminal** (Applications → Utilities), paste this line and press Enter:

```bash
curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | bash
```

**Linux:** open a terminal and paste the same `curl` line as macOS.

### Option 2: download and double-click

1. On the [repository page](https://github.com/SorilaDevelopment/NASA-Space-Apps-Projects), click the green **Code** button → **Download ZIP**.
2. Unzip it and open the **`2026 Hackathon - terra.pura`** folder.
3. Double-click the launcher for your system:
   - **Windows:** `Start terra.pura (Windows).bat`. If Windows SmartScreen warns you, click **More info → Run anyway**.
   - **macOS:** `Start terra.pura (macOS).command`. The first time, **right-click → Open → Open**, because it came from the internet.
   - **Linux:** run `./start-linux.sh` in a terminal.

### What happens next

Whichever way you start it, terra.pura asks one question:

```text
  [1] Open it now, on this computer only             (default)
  [2] Open it now, and share it on my network (LAN)   (phones and other computers on your Wi-Fi)
  [3] Keep it running in the background 24/7         (starts when you log in)
  [4] Keep it running 24/7 AND share it on my network
  [5] Stop terra.pura                               (stops it and turns off start-at-login; keeps it installed)
  [6] Uninstall terra.pura from this computer
```

Press **Enter** for the default, and terra.pura opens in your browser at **http://localhost:5173**.

- **Python:** terra.pura needs Python 3.8+.
  - **Windows:** if you don't have it, the installer downloads a small portable copy (no admin rights needed).
  - **macOS and Linux:** usually already installed; if not, the installer tells you how to get it.
- **Install location:** `%LOCALAPPDATA%\terra.pura` on Windows, `~/Library/Application Support/terra.pura` on macOS, `~/.local/share/terra.pura` on Linux.
- **Updating:** run the same command or launcher again to update it or change the option.
- **Sharing on your network (2 or 4):** other devices open the address it prints, e.g. `http://192.168.1.20:5173`. Windows asks once to allow it through the firewall, on private networks only.

### Stop or uninstall

**Stop it** (shuts it down and stops it starting when you log in, but keeps it installed):

- Windows (PowerShell):
  ```powershell
  $env:TP_MODE='stop'; irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
  ```
- macOS / Linux (Terminal):
  ```bash
  curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=stop bash
  ```

**Uninstall it completely** (stops it and deletes everything it installed):

- Windows (PowerShell):
  ```powershell
  $env:TP_MODE='remove'; irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
  ```
- macOS / Linux (Terminal):
  ```bash
  curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=remove bash
  ```

You can also run the normal install command or launcher and choose **5** (stop) or **6** (uninstall). If it's open in a terminal window (options 1 and 2), pressing **Ctrl+C** there stops it too. Uninstalling doesn't delete farms saved in your browser; clear those in terra.pura under Settings → Start over.

### For developers

There's no build step: it's HTML, CSS and ES modules plus a tiny standard-library Python file server. From this folder:

```bash
python3 serve.py                      # http://localhost:5173, this computer only
python3 serve.py 5173 --host 0.0.0.0  # also reachable from your network
```

Everything you enter is saved in your own browser (localStorage); there are no accounts and nothing is stored on the server.

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
