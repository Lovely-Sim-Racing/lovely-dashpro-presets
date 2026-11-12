<#
  Writes a README.md into every preset folder: what the preset is, how to import it, and every page with its
  screenshot, layout and modules, the Lap Review and the Alerts & Notifications settings.

  Built only from the folder's info.json, {id}.dashpro and screenshots: edit those, then run this again.
  Option names follow the Lovely Plugin (DashProHelper.cs).

  Usage:  .\scripts\Build-Readmes.ps1                       (every preset)
          .\scripts\Build-Readmes.ps1 -Id dash-pro-default  (one preset)
#>
param([string]$Root = (Split-Path -Parent $PSScriptRoot), [string]$Id)
$ErrorActionPreference = 'Stop'
$presetsDir = Join-Path $Root 'presets'
$dot = [char]0x00B7

$barModes = 'Sidebar & Topbar', 'Sidebar Only', 'Topbar Only', 'No Bars'
$fullScreenPages = 'Relative', 'Standings', 'Track Opponents', 'Class Opponents', 'Map Animated', 'Map Static', 'Radar', 'Telemetry', 'Lap History', 'Race Flags', 'Tire Info', 'Damage'
# Modules shown by each layout: the first N of the row's columns
$rowCounts = 3, 2, 2, 1                  # Layout 1-1-1, 1-2, 2-1, 3
$mediumRowCounts = 2, 1                  # Layout 1-1, 2 (2 x 2 blocks)
$centralCounts = 5, 4, 4, 4, 4, 3, 3, 3  # Layout 1-1-1-1-1, 2-1-1-1, 1-2-1-1, 1-1-2-1, 1-1-1-2, 2-2-1, 1-2-2, 2-1-2

function Get-Modules($row, [int]$count) {
    @(1..$count | ForEach-Object { $row."Column$_" } | Where-Object { $_ -and $_ -ne 'Blank' })
}
function Get-Sessions($o) {
    $s = @(); if ($o.IsPractice) { $s += 'Practice' }; if ($o.IsQualifying) { $s += 'Qualifying' }; if ($o.IsRace) { $s += 'Race' }
    if ($s) { $s -join ', ' } else { 'None' }
}
function Get-Colours($v) { if ($v -eq 1) { 'inverted' } else { 'normal colours' } }
function Get-Seconds($ms) { if ($null -eq $ms) { return $null }; ('{0:0.#} s' -f ($ms / 1000.0)) }
function Row([string]$label, $value) { if ($value) { "| **$label** | $value |" } }

# A module block: "3 x 3: Delta / Tire Front Left / Tire Rear Left" (rows split by " / ")
function Get-Block($block) {
    switch ([int]$block.Size) {
        2 { return 'Multifunction Modules (the pages set in the plugin)' }
        1 { $rows = 1..2; $counts = $mediumRowCounts; $size = '2 x 2' }
        default { $rows = 1..3; $counts = $rowCounts; $size = '3 x 3' }
    }
    $parts = foreach ($r in $rows) {
        $n = $counts[[Math]::Min([int]$block."Row${r}Layout", $counts.Count - 1)]
        $m = Get-Modules $block."Row${r}Modules" $n
        if ($m) { $m -join ', ' }
    }
    if ($parts) { "${size}: " + ($parts -join ' / ') } else { "${size}: empty" }
}

function Get-PageRows($layout) {
    $bars = $layout.SidebarTopbar; $mode = [int]$bars.BarMode
    $rows = @()
    if ([int]$layout.PageLayout -eq 1) {
        $rows += Row 'Layout' ("Full Screen: " + $fullScreenPages[[int]$layout.FullScreenPage])
    } else {
        $rows += Row 'Layout' 'Modular'
    }
    $rows += Row 'Sessions' (Get-Sessions $layout)
    if ($mode -eq 0 -or $mode -eq 2) { $rows += Row 'Topbar' $bars.TopbarPage }
    if ($mode -eq 0 -or $mode -eq 1) { $rows += Row 'Sidebars' "$($bars.LeftSidebarPage) (left), $($bars.RightSidebarPage) (right)" }
    if ([int]$layout.PageLayout -ne 1) {
        $mfm = $layout.MultifunctionModules; $bottom = $layout.BottomModules; $central = $layout.CentralColumn
        $rows += Row 'Left modules' (Get-Block $mfm.LeftModules)
        $rows += Row 'Right modules' (Get-Block $mfm.RightModules)
        $n = $centralCounts[[Math]::Min([int]$central.RowLayout, $centralCounts.Count - 1)]
        $centre = @(1..$n | ForEach-Object { $central.CentralRowModules."Row$_" } | Where-Object { $_ -and $_ -ne 'Blank' })
        $extras = @(); if ($central.ThrottleBrakeToggle -eq 1) { $extras += 'Inputs' }; if ($central.SectorBar) { $extras += 'sector bar' }
        $rows += Row 'Central column' ((@($centre -join ', ') + $extras | Where-Object { $_ }) -join " $dot ")
        foreach ($side in 'Left', 'Right') {
            $b = $bottom."${side}Modules"
            $m = Get-Modules $b.Row1Modules $rowCounts[[Math]::Min([int]$b.Layout, $rowCounts.Count - 1)]
            $rows += Row "Bottom $($side.ToLower())" ($m -join ', ')
        }
        $data = Get-Modules $layout.ModuleData 4
        $rows += Row 'Data row' ($data -join ', ')
    }
    $rows | Where-Object { $_ }
}

function Get-LapReviewLayout($l) {
    if ([int]$l.Mode -eq 1) {
        $middle = if ($l.FullScreenSectors) { 'Sectors band' } else { @($l.FullScreenMiddle) -join ', ' }
        "Full Screen: $middle / " + (@($l.FullScreenBottom) -join ', ')
    } else {
        "Strip $($l.StripLayout): " + (@($l.StripModules.($l.StripLayout)) -join ', ')
    }
}

function Get-LapReviewRows($lr) {
    # Missing flags: Practice and Qualifying on, Race off (as the plugin reads older presets)
    $on = [ordered]@{
        Practice   = ($null -eq $lr.IsPractice -or $lr.IsPractice)
        Qualifying = ($null -eq $lr.IsQualifying -or $lr.IsQualifying)
        Race       = ($lr.IsRace -eq $true)
    }
    $shown = @($on.Keys | Where-Object { $on[$_] })
    if (-not $shown) { return , 'Off in every session.' }
    $rows = @('| | |', '| --- | --- |')
    $rows += Row 'Sessions' ($shown -join ', ')
    # Older presets have one layout directly under LapReview, for all sessions
    $layouts = foreach ($s in $shown) { $l = if ($lr.$s) { $lr.$s } else { $lr }; [pscustomobject]@{ Session = $s; Text = Get-LapReviewLayout $l } }
    if (@($layouts.Text | Sort-Object -Unique).Count -eq 1) {
        $rows += Row 'Layout' $layouts[0].Text
    } else {
        foreach ($l in $layouts) { $rows += Row $l.Session $l.Text }
    }
    $duration = if ($null -ne $lr.Duration) { "$(Get-Seconds $lr.Duration) after each lap" }
    $rows += Row 'Shows' ((@($duration, (Get-Colours $lr.Colors)) | Where-Object { $_ }) -join ', ')
    $rows
}

function Get-AlertRows($a) {
    $size2 = @{ 0 = 'Strip'; 1 = 'Full Screen' }; $small = @{ 0 = 'Small'; 1 = 'Full Screen' }; $damage = @{ 0 = 'Strip'; 1 = 'Full Screen'; 2 = 'Block' }
    function Alert($name, $enabled, $how) { if ($null -eq $enabled) { return }; "| $name | " + $(if ($enabled) { (@($how) | Where-Object { $_ }) -join ', ' } else { 'Off' }) + ' |' }
    $rows = @('| Alert | Shown as |', '| --- | --- |')
    $rows += Alert 'Vehicle Settings' $a.AlertEnabled @($size2[[int]$a.AlertSize], (Get-Colours $a.AlertColors), (Get-Seconds $a.AlertDuration))
    $rows += Alert 'Rotary Dials' $a.RotaryDialsEnabled @($size2[[int]$a.RotaryDialsSize], (Get-Colours $a.RotaryDialsColors))
    $rows += Alert 'Pit Limiter' $a.PitLimiterEnabled @($small[[int]$a.PitLimiterSize], (Get-Colours $a.PitLimiterColors))
    $rows += Alert 'Engine & Ignition' $a.EngineAlertEnabled @($small[[int]$a.EngineAlertSize], (Get-Colours $a.EngineAlertColors))
    $rows += Alert 'Launch Mode' $a.LaunchAlertEnabled @($small[[int]$a.LaunchAlertSize], (Get-Colours $a.LaunchAlertColors))
    $rows += Alert 'Lift Now' $a.LiftAlertEnabled @($size2[[int]$a.LiftAlertSize], (Get-Colours $a.LiftAlertColors))
    $fuel = @()
    if ($a.FuelWarningLaps) { $fuel += "Fuel blinks at $($a.FuelWarningLaps) laps" }
    if ($a.FuelCriticalLaps) { $fuel += "LOW FUEL at $($a.FuelCriticalLaps) laps" }
    if ($a.PitNowAlertEnabled) { $fuel += 'PIT NOW' }
    $rows += Alert 'Fuel Warnings' $a.FuelAlertEnabled $fuel
    $engine = @()
    if ($a.EngineWarningWaterTemp) { $engine += 'Water temperature' + $(if ($a.EngineWarningWaterLimit) { " ($($a.EngineWarningWaterLimit)$([char]0x00B0))" }) }
    if ($a.EngineWarningOilTemp) { $engine += 'oil temperature' + $(if ($a.EngineWarningOilLimit) { " ($($a.EngineWarningOilLimit)$([char]0x00B0))" }) }
    if ($a.EngineWarningOilPressure) { $engine += 'oil pressure' }
    if ($a.EngineWarningFuelPressure) { $engine += 'fuel pressure' }
    $rows += Alert 'Engine Warnings' $a.EngineWarningEnabled $engine
    $rows += Alert 'Penalty' $a.PenaltyAlertEnabled 'On'
    $rows += Alert 'Flags' $a.FlagsAlertEnabled 'On'
    $rows += Alert 'Damage' $a.DamageAlertEnabled @($damage[[int]$a.DamageAlertSize], (Get-Seconds $a.DamageAlertDuration))
    $rows | Where-Object { $_ }
}

$dirs = Get-ChildItem -LiteralPath $presetsDir -Directory | Where-Object { -not $Id -or $_.Name -eq $Id } | Sort-Object Name
foreach ($dir in $dirs) {
    $presetName = "$($dir.Name).dashpro"
    $presetRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $dir.FullName $presetName)
    $preset = $presetRaw | ConvertFrom-Json
    $info = Get-Content -Raw -Encoding UTF8 (Join-Path $dir.FullName 'info.json') | ConvertFrom-Json
    $pages = @($preset.PagesLayout.Pages)
    $images = @(Get-ChildItem -LiteralPath (Join-Path $dir.FullName 'pages') -Filter *.png -ErrorAction SilentlyContinue | Sort-Object Name)
    $hasLapReview = Test-Path (Join-Path $dir.FullName 'lap-review.png')
    $needsAtsr = $presetRaw.Contains('"Virtual RPM - ATSR"')

    $md = @(
        "<!-- Made by scripts/Build-Readmes.ps1 from info.json and $presetName`: change those, not this file -->"
        "[$([char]0x2190) All presets](../../README.md)"
        ''
        "# $($info.name)"
        ''
        $info.description
        ''
        $(if ($images) { "![$($pages[0].Name)](pages/$($images[0].Name))"; '' })
        '| | |'
        '| --- | --- |'
        (Row 'Author' $info.author)
        (Row 'Tags' ((@($info.tags) | ForEach-Object { "``$_``" }) -join ' '))
        (Row 'Pages' ("$($pages.Count): " + (($pages | ForEach-Object { $_.Name }) -join ', ')))
        $(if ($needsAtsr) { Row 'Needs' 'ATSR Hub Evo, for Virtual RPM - ATSR' })
        (Row 'Added' $info.added)
        (Row 'Updated' $info.updated)
        (Row 'Preset format' "v$($preset.Version)")
        ''
        '## Import'
        "In the Lovely Plugin, open **Dash Pro**, click **Browse Presets**, pick **$($info.name)** and click **Import**."
        ''
        "Or download [$presetName]($presetName), then click **Import** at the top right of the Dash Pro page and choose the file."
        ''
        "Importing replaces the pages and layouts, the Lap Review and the Alerts & Notifications settings of the level you have selected: All Devices, a device, a sim, a class or a vehicle."
        ''
        '## Pages'
    ) | Where-Object { $null -ne $_ }

    for ($i = 0; $i -lt $pages.Count; $i++) {
        $p = $pages[$i]
        $md += ''
        $md += "### $($i + 1). $($p.Name)"
        if ($i -lt $images.Count) { $md += "![$($p.Name)](pages/$($images[$i].Name))"; $md += '' }
        $md += '| | |'; $md += '| --- | --- |'
        $md += Get-PageRows $p.Layout
    }

    $md += ''; $md += '## Lap Review'
    if ($hasLapReview) { $md += '![Lap Review](lap-review.png)'; $md += '' }
    $md += Get-LapReviewRows $preset.LapReview

    $md += ''; $md += '## Alerts & Notifications'
    $md += Get-AlertRows $preset.AlertsNotifications

    $md += ''; $md += '---'; $md += ''
    $md += "Screenshots: the 854x480 Lovely Dashboard Pro with sample race data (Le Mans Ultimate at Spa). Shared under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)."

    [IO.File]::WriteAllText((Join-Path $dir.FullName 'README.md'), ($md -join "`n") + "`n", (New-Object Text.UTF8Encoding($false)))
    "$($dir.Name)/README.md"
}
