<!-- Made by scripts/Build-Readmes.ps1 from info.json and hypercar-endurance-lmu.dashpro: change those, not this file -->
[← All presets](../../README.md)

# Hypercar Endurance LMU

Made for Hypercar endurance races in Le Mans Ultimate, with everything Team Hellas Vision Racing uses in long races. The Marge page's top bar uses Virtual RPM - ATSR, which needs ATSR Hub Evo.

| | |
| --- | --- |
| **Author** | George Margetis-HVT |
| **Tags** | `LMU` `Hypercar` `Endurance` `16:9` |
| **Pages** | 4: Default Page, Leaderboard, Map, Marge |
| **Needs** | ATSR Hub Evo, for Virtual RPM - ATSR |
| **Added** | 2026-11-11 |
| **Updated** | 2026-11-11 |
| **Preset format** | v1 |

![Hypercar Endurance LMU](preview.png)

## Import
In the Lovely Plugin, open **Dash Pro**, click **Browse Presets**, pick **Hypercar Endurance LMU** and click **Import**.

Or download [hypercar-endurance-lmu.dashpro](hypercar-endurance-lmu.dashpro), then click **Import** at the top right of the Dash Pro page and choose the file.

Importing replaces the pages and layouts, the Lap Review and the Alerts & Notifications settings of the level you have selected: All Devices, a device, a sim, a class or a vehicle.

## Pages

### 1. Default Page
![Default Page](pages/01-default-page.png)

| | |
| --- | --- |
| **Layout** | Modular |
| **Sessions** | Practice, Race |
| **Topbar** | Delta |
| **Left modules** | 2 x 2: Tire Front Left, Tire Front Right / Tire Rear Left, Tire Rear Right |
| **Right modules** | 3 x 3: TC, TC 2, ABS / Brake Bias / Engine Map |
| **Central column** | RPM, Speed, Session Time, Time Remaining, Session Name · Inputs · sector bar |
| **Bottom left** | Refuel |
| **Bottom right** | Fuel, Fuel Average, Fuel Laps Left |
| **Data row** | Lap, Position, Last Lap, Session Best |

### 2. Leaderboard
![Leaderboard](pages/02-leaderboard.png)

| | |
| --- | --- |
| **Layout** | Modular |
| **Sessions** | Practice, Qualifying, Race |
| **Topbar** | Delta |
| **Sidebars** | Fuel (left), Linear Map (right) |
| **Left modules** | 2 x 2: Tire Front Left, Tire Front Right / Tire Rear Left, Tire Rear Right |
| **Right modules** | 3 x 3: TC, TC 2, ABS / Brake Bias / Engine Map |
| **Central column** | RPM, Speed, Session Time, Time Remaining, Session Name · Inputs |
| **Bottom left** | Fuel, Refuel |
| **Bottom right** | Fuel Average, Fuel Time Left, Fuel Laps Left |
| **Data row** | Lap, Position, Last Lap, Session Best |

### 3. Map
![Map](pages/03-map.png)

| | |
| --- | --- |
| **Layout** | Full Screen: Map Static |
| **Sessions** | Practice, Race |
| **Topbar** | Next Race |

### 4. Marge
![Marge](pages/04-marge.png)

| | |
| --- | --- |
| **Layout** | Modular |
| **Sessions** | Practice, Qualifying, Race |
| **Topbar** | Virtual RPM - ATSR |
| **Sidebars** | Fuel / VE (left), Delta (right) |
| **Left modules** | 2 x 2: Tire Front Left, Tire Front Right / Tire Rear Left, Tire Rear Right |
| **Right modules** | 3 x 3: Refuel / Brake Bias, Pit Loss / TC, TC 2, TC Slip |
| **Central column** | Speed, Lap, Time Remaining, Functions · Inputs · sector bar |
| **Bottom left** | Fuel, VE %, Engine Map |
| **Bottom right** | SoC, Regen, Brake Migration |
| **Data row** | Fuel Laps Left, Optimal Best Lap, Estimated Lap, Weather |

## Lap Review
![Lap Review](lap-review.png)

| | |
| --- | --- |
| **Sessions** | Practice, Qualifying, Race |
| **Practice** | Strip 1-3-1: Lap Time, Lap Validity, Position |
| **Qualifying** | Strip 1-3-1: Position, Sectors, Lap Delta |
| **Race** | Strip 1-3-1: Position, Sectors, Lap Delta |
| **Shows** | 3.5 s after each lap, normal colours |

## Alerts & Notifications
| Alert | Shown as |
| --- | --- |
| Vehicle Settings | Strip, normal colours, 1 s |
| Rotary Dials | Full Screen, normal colours |
| Pit Limiter | Small, normal colours |
| Engine & Ignition | Full Screen, inverted |
| Launch Mode | Off |
| Lift Now | Strip, normal colours |
| Fuel Warnings | Fuel blinks at 4 laps, LOW FUEL at 2 laps, PIT NOW |
| Engine Warnings | Water temperature (110°), oil temperature (130°), oil pressure, fuel pressure |
| Penalty | On |
| Flags | On |
| Damage | Block, 7.5 s |

---

Screenshots: the 854x480 Lovely Dashboard Pro with sample race data (Le Mans Ultimate at Spa). Shared under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
