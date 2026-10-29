<p align="center">
<img width="150" height="150" alt="Lovely Sim Racing" src="https://raw.githubusercontent.com/Lovely-Sim-Racing/lovely-dashboard/main/docs/images/lr-team-icon.png">
</p>

<h1 align="center">How to Submit Your Preset</h1>

<p align="center">
Share your Lovely Dashboard Pro setup with everyone. It takes a couple of minutes, and you don't need to know Git.
</p>

---

## What a preset is
A preset is one Dash Pro setup, saved from the Lovely Plugin as a `.dashpro` file. It has three parts, one for each tab of the plugin's Dash Pro page:

- **Pages & Layout**: every page, with its layout and modules
- **Lap Review**: the sessions it shows in, and each session's layout
- **Alerts & Notifications**: which alerts show, their size and colours

A preset doesn't include a device, sim, class or vehicle. Whoever imports it chooses where it goes.

## 1. Export it from the Lovely Plugin
1. Open **Dash Pro** in the Lovely Plugin.
2. Select the level whose setup you want to share: All Devices, a device, a sim, a class or a vehicle. The preset is exactly what that level shows.
3. Click **Export** (top right, next to Import and Browse Presets) and save the `.dashpro` file.

Before you export, check that:
- Every page has a clear name (Race, Quali, Fuel...). People see the page names before they import.
- Each page is on in the right sessions (Practice, Qualifying, Race).
- You've tried it in a session, so nothing is missing or overlapping.

## 2. Open the Submit a Preset form
Open a new issue with the **[Submit a Preset](../../issues/new?template=submit-preset.yml)** form. You need a free GitHub account.

## 3. Fill it in
| Field | What to write |
| --- | --- |
| **Preset name** | A short name people will see in the plugin, for example `LMU Endurance` or `GT3 Sprint`. |
| **Author** | The name to credit: you or your team. Your GitHub name is used if you leave it empty. |
| **Description** | One or two sentences: what it's good for and what's on its pages. |
| **Tags** | Optional, separated by commas: a sim (`LMU`, `ACC`, `iRacing`), a class (`GT3`, `Hypercar`), a race type (`Endurance`, `Sprint`) or a style (`Minimal`). Use `All Sims` if it isn't made for one sim. |
| **Preset file** | Zip your `.dashpro` file and drag the zip in (GitHub doesn't accept `.dashpro` files directly). Or open the `.dashpro` file in Notepad and paste everything. |

Tick the sharing box and submit.

## 4. What happens next
- We check that the preset imports and works with the current Lovely Plugin.
- We make the screenshots for you: every page on the 854x480 Lovely Dashboard Pro, plus the Lap Review, with sample race data (Le Mans Ultimate at Spa).
- We add it to the list, and it shows in **Browse Presets** in the plugin.
- You get a reply on your issue when it's live, or if something needs fixing.

## Updating your preset
Submit it again with the same preset name and write **Update** in the description. We replace the old version, and the preset shows the new date.

## Guidelines
- Share your own work, or have its author's permission.
- One setup per submission. For a sprint and an endurance version, submit two presets.
- Keep names, descriptions and page names clean and in English.
- Modules that need an add-on (for example **Virtual RPM - ATSR**, which needs ATSR Hub Evo) are fine. Mention it in the description.

Presets are published under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like everything in this repository.

---

© 2026 by [Lovely Sim Racing](https://lsr.gg) is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
