<p align="center">
<img width="150" height="150" alt="Lovely Sim Racing" src="https://raw.githubusercontent.com/Lovely-Sim-Racing/lovely-car-classes/main/docs/images/lr-logo-small.png">
</p>

<h1 align="center">Lovely Dash Pro Presets</h1>

<p align="center">
Ready-made page setups for Lovely Dashboard Pro, shared by the community.<br>
<strong>Preset Format v1</strong>
</p>

---

## How to

### In the Lovely Plugin
Open **Dash Pro > Pages & Layout** and click **Browse** to see every preset here, with screenshots. Pick one and click **Import**.

A preset replaces the pages and layouts, the Alerts & Notifications settings and the Lap Review settings of whatever you have selected: All Devices, a device, a sim, a class or a single vehicle. Everything else stays as it is.

### By hand
Download a preset's `preset.dashpro` file from the [presets](presets) folder, then click **Import** on the Pages & Layout tab and choose the file.

## Presets
Every preset has its own folder in `presets/`:

```
presets/
  manifest.json            the list of all presets (generated)
  dash-pro-default/
    preset.dashpro         the preset, exactly as the plugin exports it
    info.json              name, author, description and tags
    preview.png            all pages and the Lap Review on one image
    lap-review.png         the preset's Lap Review, over the first page
    pages/
      01-primary.png       one image per page, in page order
      02-leaderboard.png
```

Folder names follow the same name format as [Lovely Car Data](https://github.com/Lovely-Sim-Racing/lovely-car-data#name-format): lowercase, accents replaced, spaces and special characters as single hyphens.

The screenshots show each page on the 854x480 Lovely Dashboard Pro, with sample race data (Le Mans Ultimate at Spa), and the Lap Review as it shows after a lap. The numbers are for illustration only.

### Manifest
`presets/manifest.json` lists all presets. Fetch it from:

`https://raw.githubusercontent.com/Lovely-Sim-Racing/lovely-dashpro-presets/main/presets/manifest.json`

```
{
  "presets": [
    {
      "id": "dash-pro-default",
      "name": "Dash Pro Default",
      "author": "Lovely Sim Racing",
      "description": "...",
      "tags": [ "Default", "All Sims" ],
      "pages": [ "Primary", "Leaderboard", "Map", "Quali" ],
      "version": 1,
      "path": "dash-pro-default/preset.dashpro",
      "preview": "dash-pro-default/preview.png",
      "pageImages": [ "dash-pro-default/pages/01-primary.png", "..." ],
      "lapReview": "dash-pro-default/lap-review.png",
      "added": "2026-10-24",
      "updated": "2026-10-26"
    }
  ]
}
```

- All paths are relative to `presets/`.
- `version` is the preset format. The plugin only imports versions it supports.

## File Format
A `.dashpro` file is JSON on a single line, with one section per tab of the plugin's Dash Pro page:

```
# Format                    (String) - Always "LovelyDashProPreset"
# Version                   (Int)    - The preset format version (currently 1)
# PagesLayout                        The Pages & Layout tab
  # Pages                            An array of pages, in page order
    # Name                  (String) - The page name
    # Layout                         The page layout, as the plugin stores it
      # IsPractice          (Bool)   - Page is active in Practice
      # IsQualifying        (Bool)   - Page is active in Qualifying
      # IsRace              (Bool)   - Page is active in Race
      # PageLayout          (Int)    - 0: Modular, 1: Full Screen
      # FullScreenPage      (Int)    - The Full Screen page shown in Full Screen mode
      # SidebarTopbar                - Bar mode and the Topbar / Sidebar modules
      # MultifunctionModules         - The left and right module blocks: size, row layouts and modules
      # BottomModules                - The bottom rows: layouts and modules
      # CentralColumn                - The central column: throttle / brake bars, row layout and data rows
      # ModuleData                   - The four data columns
# AlertsNotifications                The Alerts & Notifications tab
  # AlertEnabled            (Bool)   - Show Vehicle Settings Alerts
  # AlertSize               (Int)    - 0: Strip, 1: Full Screen
  # AlertColors             (Int)    - 0: Normal, 1: Inverted
  # PitLimiterEnabled       (Bool)   - Show the Pit Limiter
  # PitLimiterSize          (Int)    - 0: Small, 1: Full Screen
  # PitLimiterColors        (Int)    - 0: Normal, 1: Inverted
  # EngineAlertEnabled      (Bool)   - Show the Engine & Ignition alerts
  # EngineAlertSize         (Int)    - 0: Small, 1: Full Screen
  # EngineAlertColors       (Int)    - 0: Normal, 1: Inverted
  # LaunchAlertEnabled      (Bool)   - Show Launch Mode (off by default)
  # LaunchAlertSize         (Int)    - 0: Small, 1: Full Screen
  # LaunchAlertColors       (Int)    - 0: Normal, 1: Inverted
  # LaunchClutchAbove       (Int)    - Launch Mode shows with the clutch above this %
  # LaunchSpeedBelow        (Int)    - ...and the speed below this (SimHub's speed unit)
  # LaunchWindow            (Int)    - Green window: 0: Auto (F1 only), 1: On, 2: Off
  # LaunchRpmFrom           (Int)    - Green window RPM, from
  # LaunchRpmTo             (Int)    - Green window RPM, to
  # LaunchThrottleFrom      (Int)    - Green window throttle %, from
  # LaunchThrottleTo        (Int)    - Green window throttle %, to
  # LiftAlertEnabled        (Bool)   - Show Lift Now (Le Mans Ultimate's lift and coast cue)
  # LiftAlertSize           (Int)    - 0: Strip, 1: Full Screen
  # LiftAlertColors         (Int)    - 0: Normal, 1: Inverted
  # LiftAlertPoint          (Int)    - Where on the lift and coast count (0-255) LIFT NOW starts, 220 by default
  # FuelAlertEnabled        (Bool)   - Show Fuel Warnings
  # FuelAlertColors         (Int)    - LOW FUEL strip, 0: Normal, 1: Inverted
  # FuelWarningLaps         (Int)    - Level 1: laps of fuel left when the Fuel value blinks red (0-10, 4 by default, 0: off)
  # FuelCriticalLaps        (Int)    - Level 2: laps of fuel left when the LOW FUEL strip shows (0-10, 2 by default, 0: off)
  # PitNowAlertEnabled      (Bool)   - Show the PIT NOW strip with the fuel warnings (last 20% of the lap with about a lap of fuel left, not in F1)
  # RotaryDialsEnabled      (Bool)   - Show the Rotary Dials labels and alerts
  # RotaryDialsColors       (Int)    - 0: Normal, 1: Inverted
  # DamageAlertEnabled      (Bool)   - Show the Damage Alert
  # DamageAlertSize         (Int)    - 0: Strip, 1: Full Screen, 2: Block
  # AlertDuration           (Int)    - How long the Vehicle Settings and Rotary Dials alerts stay up, in ms
  # DamageAlertDuration     (Int)    - How long the Damage Alert stays up, in ms
# LapReview                          The Lap Review tab
  # IsPractice              (Bool)   - Show the Lap Review in Practice
  # IsQualifying            (Bool)   - Show the Lap Review in Qualifying
  # IsRace                  (Bool)   - Show the Lap Review in Race
  # Colors                  (Int)    - 0: Normal, 1: Inverted (all sessions)
  # Duration                (Int)    - How long the Lap Review stays up after each lap, in ms (all sessions)
  # Practice                         The Practice layout (Qualifying and Race have the same fields)
    # Mode                  (Int)    - 0: Strip, 1: Full Screen
    # StripLayout           (String) - The Strip's columns: "1-1-1-1-1", "2-1-1-1", "1-1-1-2", "1-3-1", "2-1-2", "3-1-1", "1-1-3", "3-2", "2-3" or "5"
    # StripModules                   - The modules of each Strip layout, by layout ("1-3-1": [ "Position", "Sectors", "Lap Delta" ])
    # FullScreenSectors     (Bool)   - Full Screen middle row: true for the Sectors band, false for FullScreenMiddle
    # FullScreenMiddle               - The three Full Screen middle row modules
    # FullScreenBottom               - The three Full Screen bottom row modules
  # Qualifying                       The Qualifying layout
  # Race                             The Race layout
```

Presets made before each session had its own Lap Review layout have one layout directly under `LapReview` (`Mode`, `StripLayout`...). They still import: that layout is used for all three sessions. Settings a preset doesn't have (such as the Damage Alert in older presets) import with their defaults.

Lap Review modules: `Lap Time`, `Lap Delta`, `Sectors`, `Sector Deltas`, `Position`, `Gaps`, `Fuel Used`, `Fuel Left`, `VE Used`, `VE Left`, `Fuel / VE Used`, `Tire Wear`, `Lap Validity`, `Top Speed` and `Blank` (empty).

A preset has no device, sim, class or vehicle in it. It describes one setup: pages and layouts, Alerts & Notifications settings and Lap Review settings. Importing it replaces all three for the selected level.

## Contributing
Sharing a preset takes a couple of minutes, and you don't need to know Git.

1. In the Lovely Plugin, set up your pages and click **Export** on the Pages & Layout tab.
2. Open a new issue with the **[Submit a Preset](../../issues/new?template=submit-preset.yml)** form.
3. Fill in a name and a short description, and attach your preset: zip the `.dashpro` file and drag the zip in (GitHub doesn't accept `.dashpro` files directly), or paste the file's contents.

We check every submission, make the screenshots and add it to the list. You'll get a reply on your issue when it's live, or if something needs fixing.

### Maintainers
Submissions are added with two scripts:

1. Create `presets/{name}/` with the `preset.dashpro` and an `info.json`.
2. Render the screenshots with `Render-Preset.ps1 -Folder presets/{name}` (Lovely preview tools; needs SimHub and the Lovely dashboards on the same PC).
3. Run `scripts/Build-Manifest.ps1`. It checks every preset and rewrites `presets/manifest.json`, and stops if anything is wrong.

To keep the JSON files consistently formatted, the repo uses the same `pre-commit` hooks as the other Lovely repos. They check every `.json` and `.dashpro` file, and format the `.json` files; `.dashpro` files stay on one line, exactly as the plugin exports them:

```
pre-commit install
pre-commit run --all-files
```

---

© 2026 by [Lovely Sim Racing](https://lsr.gg) is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
