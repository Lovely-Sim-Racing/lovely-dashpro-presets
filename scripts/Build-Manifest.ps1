<#
  Builds presets/manifest.json from the preset folders and checks every preset.

  Each folder in presets/ holds:
    preset.dashpro   the preset, exactly as the Lovely Plugin exports it
    info.json        name, author, description, tags, added, updated, and optionally featured
                     (1, 2, 3...: shown first in Browse Presets, in that order; set by us, not by submitters)
    preview.png      all pages and the Lap Review on one sheet   (made by Render-Preset.ps1)
    pages/*.png      one image per page, in order                (made by Render-Preset.ps1)
    lap-review.png   the preset's Lap Review over the first page (made by Render-Preset.ps1)

  Usage:  .\scripts\Build-Manifest.ps1          (from the repo root; exits with an error if a preset is invalid)
#>
param([string]$Root = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$presetsDir = Join-Path $Root 'presets'
$supportedVersion = 1
$problems = @(); $entries = @()

foreach ($dir in Get-ChildItem -LiteralPath $presetsDir -Directory | Sort-Object Name) {
    $id = $dir.Name
    $presetFile = Join-Path $dir.FullName 'preset.dashpro'
    $infoFile = Join-Path $dir.FullName 'info.json'
    if (-not (Test-Path $presetFile)) { $problems += "${id}: preset.dashpro is missing"; continue }
    if (-not (Test-Path $infoFile)) { $problems += "${id}: info.json is missing"; continue }

    try { $preset = Get-Content -Raw -Encoding UTF8 $presetFile | ConvertFrom-Json } catch { $problems += "${id}: preset.dashpro is not valid JSON"; continue }
    try { $info = Get-Content -Raw -Encoding UTF8 $infoFile | ConvertFrom-Json } catch { $problems += "${id}: info.json is not valid JSON"; continue }

    $pages = @($preset.PagesLayout.Pages)
    $names = @($pages | ForEach-Object { $_.Name })
    if ($preset.Format -ne 'LovelyDashProPreset') { $problems += "${id}: not a Dash Pro preset (Format)" }
    if ($preset.Version -gt $supportedVersion) { $problems += "${id}: preset version $($preset.Version) is newer than $supportedVersion" }
    if ($names.Count -eq 0) { $problems += "${id}: no pages" }
    if (($names | Where-Object { -not $_ }).Count) { $problems += "${id}: a page has no name" }
    if (($names | Sort-Object -Unique).Count -ne $names.Count) { $problems += "${id}: duplicate page names" }
    if (@($pages | Where-Object { -not $_.Layout }).Count) { $problems += "${id}: a page has no layout" }
    if (-not $preset.AlertsNotifications) { $problems += "${id}: no AlertsNotifications section" }
    if ($null -eq $preset.LapReview) { $problems += "${id}: no LapReview section" }
    foreach ($field in 'name', 'author', 'description') { if (-not $info.$field) { $problems += "${id}: info.json has no $field" } }
    $featured = $null
    if ($null -ne $info.featured) {
        if ($info.featured -is [int] -and $info.featured -ge 1) { $featured = [int]$info.featured } else { $problems += "${id}: featured must be a whole number from 1 (1 is shown first)" }
    }

    $pageImages = @(Get-ChildItem -LiteralPath (Join-Path $dir.FullName 'pages') -Filter *.png -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { "$id/pages/$($_.Name)" })
    $hasPreview = Test-Path (Join-Path $dir.FullName 'preview.png')
    if (-not $hasPreview) { $problems += "${id}: preview.png is missing (run Render-Preset.ps1)" }
    $hasLapReview = Test-Path (Join-Path $dir.FullName 'lap-review.png')
    # The Lap Review image only when the preset shows it in a session (missing flags: Practice and Qualifying on, Race off)
    $lr = $preset.LapReview
    $lapReviewOn = $null -ne $lr -and (($null -eq $lr.IsPractice -or $lr.IsPractice) -or ($null -eq $lr.IsQualifying -or $lr.IsQualifying) -or ($lr.IsRace -eq $true))
    if ($lapReviewOn -and -not $hasLapReview) { $problems += "${id}: lap-review.png is missing (run Render-Preset.ps1)" }
    if (-not $lapReviewOn) { $hasLapReview = $false }
    if ($pageImages.Count -ne $names.Count) { $problems += "${id}: $($pageImages.Count) page images for $($names.Count) pages (run Render-Preset.ps1)" }

    $entries += [ordered]@{
        id          = $id
        name        = $info.name
        author      = $info.author
        description = $info.description
        tags        = @($info.tags)
        pages       = $names
        version     = $preset.Version
        path        = "$id/preset.dashpro"
        preview     = if ($hasPreview) { "$id/preview.png" } else { $null }
        pageImages  = $pageImages
        lapReview   = if ($hasLapReview) { "$id/lap-review.png" } else { $null }
        added       = $info.added
        updated     = $info.updated
        featured    = $featured
    }
}

if ($problems) { $problems | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }; throw "$($problems.Count) problem(s): manifest not written" }

$manifest = [ordered]@{ presets = @($entries | Sort-Object { $_.name }) }
$json = $manifest | ConvertTo-Json -Depth 6
# Windows PowerShell indents JSON oddly: re-indent with 2 spaces (Newtonsoft from SimHub, when it's there)
$nj = 'C:\Program Files (x86)\SimHub\Newtonsoft.Json.dll'
if (Test-Path $nj) {
    Add-Type -Path $nj
    $json = [Newtonsoft.Json.Linq.JToken]::Parse($json).ToString([Newtonsoft.Json.Formatting]::Indented)
}
[IO.File]::WriteAllText((Join-Path $presetsDir 'manifest.json'), $json + "`n", (New-Object Text.UTF8Encoding($false)))
"manifest.json: $($entries.Count) preset(s)"
