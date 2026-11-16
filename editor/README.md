# Online Editor

The Lovely Dash Pro editor in the browser: `index.html`, `editor.css` and `editor.js`, with no build step. It has the plugin's three Dash Pro tabs (Pages Layout, Alerts & Notifications, Lap Review), a preview made from the module images below, and opens and exports `.dashpro` presets exactly as the plugin writes them. Work in progress is kept in the browser.

To try it locally, serve the repository root over HTTP (the editor reads `../presets/` for the community presets) and open `/editor/`.

## Data

Everything below is generated from the Lovely Plugin and the Lovely Dashboard Pro, so the online editor offers exactly what the plugin's Dash Pro editor offers. Don't edit these files by hand.

## editor-schema.json

Written from the plugin's own lists and models:

- **modules**: the modules each kind of slot offers (Topbar, sidebars, module rows, Data row and central column, Full Screen pages, Lap Review), the module picker's groups, and modules that need another plugin.
- **options**: bar modes, page layouts, module sizes, row layouts, central column layouts, Lap Review strip layouts and modes. Most are saved by index, as in a `.dashpro` file.
- **geometry**: where every slot sits on the 854 x 480 dash for each bar mode, in dash pixels.
- **settings**: the Alerts & Notifications and Lap Review settings, with the labels, ranges and descriptions the plugin shows.
- **defaults**: the Dash Pro Default preset, the layout a new page starts from, and the settings' own defaults.

`schema` changes when the file's shape changes. `preset.version` is the `.dashpro` version it writes.

## images/

Every module, cut from the real dash rendered with sample race data (the same data as the preset screenshots), at twice the dash's size. `images/index.json` maps each module name to its image for every kind of slot and size:

| Folder | Slot | Size (dash pixels) |
| --- | --- | --- |
| `topbar/` | Topbar | 758 x 28 |
| `sidebar/` | Left and right sidebars | 28 x 460 |
| `module/<w>x<h>/` | Module rows (3 x 3, 2 x 2, bottom) | 90, 190, 290 x 86 and 140, 290 x 134 |
| `data/<w>x<h>/` | Data row, central column | 140 x 38 and 140 x 86 |
| `fullscreen/` | Full Screen pages | 758 x 422 |
| `mfm/` | A module zone set to MFM | 290 x 278 |
| `central/` | Gear, with or without inputs and sectors | 158 x 182 |
| `lapreview/<colors>/` | Lap Review Strip (140 to 756 x 94) and Full Screen tiles, transparent | |

With no bars, the dash draws the module zones and Full Screen pages larger (`modulesScale`, `fullScreenScale` in the geometry), so the editor scales these images up.
