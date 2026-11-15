# NASA-Space-Apps-Projects
SorilaDevelopment/NASA-Space-Apps-Projects is a repository created by Sorila Development, containing all our NASA Space Apps Challenge projects licensed under a AGPL 3.0 license, allowing you to use our projects on your own hardware and modify them to fit your needs.

# List of releases:
2026 Hackathon:
- [terra.pura](2026%20Hackathon%20-%20terra.pura) · use it online at https://terrapura.sorila.dev

terra.pura is a project aimed at giving independent farmers access to technology that helps them prepare for the future, for free. This project combines lots of information sources to prepare farmers for anything, like weather risks, shown by NASA EONET API, field colour analysis using NASA MODIS Terra and much more! Our app also aims to allow farmers to know what is best to grow and sell based on their circumstances, while also citing how much they are estimated invest in return for an estimated profit.

## How to run terra.pura on your laptop or PC

**Windows:** open **PowerShell** (Start → type "PowerShell"), paste this and press Enter:

```powershell
irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
```

**macOS / Linux:** open **Terminal**, paste this and press Enter:

```bash
curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | bash
```

It downloads terra.pura, then asks whether to open it on this computer, share it on your network, keep it running in the background, stop it, or uninstall it. Press Enter for the default and it opens in your browser at http://localhost:5173.

Prefer not to use a terminal? Click **Code → Download ZIP**, unzip it, open the `2026 Hackathon - terra.pura` folder and double-click **`Start terra.pura (Windows).bat`** or **`Start terra.pura (macOS).command`**.

### Stop or uninstall

**Stop it** (keeps it installed). Windows, in PowerShell:

```powershell
$env:TP_MODE='stop'; irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
```

macOS / Linux, in Terminal:

```bash
curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=stop bash
```

**Uninstall it completely.** Windows, in PowerShell:

```powershell
$env:TP_MODE='remove'; irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
```

macOS / Linux, in Terminal:

```bash
curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=remove bash
```

More detail: [terra.pura README](2026%20Hackathon%20-%20terra.pura/README.md) · Licence: [AGPL-3.0](LICENSE) or commercial, see [LICENSE.md](2026%20Hackathon%20-%20terra.pura/LICENSE.md)
