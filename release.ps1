<#
.SYNOPSIS
  Cut the next High Summoner release.
.DESCRIPTION
  Auto-increments the version in module.json, records a CHANGELOG entry, commits
  ALL pending changes (including Foundry compendium-pack edits), tags vX.Y.Z, and
  pushes. The GitHub Action (.github/workflows/release.yml) then builds module.zip
  and publishes the release. Installed copies auto-update because module.json's
  manifest/download point at the 'latest' release.
.PARAMETER Bump
  patch (default) | minor | major | an explicit X.Y.Z version string.
.PARAMETER Notes
  Optional one-line changelog note describing this release.
.PARAMETER DryRun
  Show what would happen (version, tag) without changing files or pushing.
.EXAMPLE
  .\release.ps1
  Bumps the patch version (e.g. 1.0.2 -> 1.0.3) and publishes.
.EXAMPLE
  .\release.ps1 minor -Notes "New avatar evolutions and two spells."
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Bump = "patch",
  [string]$Notes,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Die([string]$m) { Write-Host "release: $m" -ForegroundColor Red; exit 1 }

# --- preconditions ---
& git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Die "not inside a git repository." }
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "main") { Die "must be on the 'main' branch (currently on '$branch')." }

# --- current version ---
$modulePath = Join-Path $PSScriptRoot "module.json"
if (-not (Test-Path $modulePath)) { Die "module.json not found." }
$current = [version]((Get-Content -Raw -LiteralPath $modulePath | ConvertFrom-Json).version)

# --- compute next version ---
switch -Regex ($Bump.Trim()) {
  '^\d+\.\d+\.\d+$' { $next = [version]$Bump.Trim() }
  '^major$'         { $next = [version]::new($current.Major + 1, 0, 0) }
  '^minor$'         { $next = [version]::new($current.Major, $current.Minor + 1, 0) }
  '^(patch|)$'      { $next = [version]::new($current.Major, $current.Minor, $current.Build + 1) }
  default           { Die "Bump must be patch, minor, major, or X.Y.Z (got '$Bump')." }
}
$ver = "{0}.{1}.{2}" -f $next.Major, $next.Minor, [Math]::Max($next.Build, 0)
$tag = "v$ver"
if ($next -le $current) { Die "next version ($ver) must be greater than current ($current)." }
if (& git tag -l $tag)  { Die "tag $tag already exists." }

Write-Host "Releasing $tag  (current: $current)" -ForegroundColor Cyan

if ($DryRun) {
  $notesPreview = if ([string]::IsNullOrWhiteSpace($Notes)) { "Maintenance release." } else { $Notes }
  Write-Host "[dry run] would set module.json version -> $ver" -ForegroundColor Yellow
  Write-Host "[dry run] would add CHANGELOG entry: $notesPreview" -ForegroundColor Yellow
  Write-Host "[dry run] would commit all pending changes, tag $tag, and push. No changes made." -ForegroundColor Yellow
  exit 0
}

# --- 1) stamp version into module.json (only the version value changes) ---
$raw = Get-Content -Raw -LiteralPath $modulePath
$replacement = '${1}' + $ver + '${2}'
$new = $raw -replace '("version"\s*:\s*")[^"]*(")', $replacement
if ($new -eq $raw) { Die "could not find the version field in module.json." }
[System.IO.File]::WriteAllText($modulePath, $new)

# --- 2) CHANGELOG entry ---
$clPath = Join-Path $PSScriptRoot "CHANGELOG.md"
if (Test-Path $clPath) {
  if ([string]::IsNullOrWhiteSpace($Notes)) { $Notes = "Maintenance release." }
  $today   = Get-Date -Format "yyyy-MM-dd"
  $section = "## [$ver] - $today`n`n### Changed`n- $Notes`n`n"
  $link    = "[$ver]: https://github.com/EikoSakura/high-summoner/releases/tag/$tag"
  $cl = Get-Content -Raw -LiteralPath $clPath
  $marker = $cl.IndexOf("## [")
  if ($marker -ge 0) {
    $cl = $cl.Substring(0, $marker) + $section + $cl.Substring($marker)
  } else {
    $cl = $cl.TrimEnd() + "`n`n" + $section
  }
  $cl = $cl.TrimEnd() + "`n" + $link + "`n"
  [System.IO.File]::WriteAllText($clPath, $cl)
}

# --- 3) commit everything (pack edits + version + changelog); no AI attribution ---
& git add -A
& git commit -q -m "Release $tag"
if ($LASTEXITCODE -ne 0) { Die "git commit failed (nothing to release?)." }

# --- 4) tag + push (commit first, then the tag) ---
& git tag $tag
& git push origin main
if ($LASTEXITCODE -ne 0) { Die "git push (main) failed - check your GitHub credentials." }
& git push origin $tag
if ($LASTEXITCODE -ne 0) { Die "git push (tag) failed." }

Write-Host ""
Write-Host "Pushed $tag. The release workflow is building module.zip and publishing the release." -ForegroundColor Green
Write-Host "Watch:   https://github.com/EikoSakura/high-summoner/actions"
Write-Host "Release: https://github.com/EikoSakura/high-summoner/releases/tag/$tag"
