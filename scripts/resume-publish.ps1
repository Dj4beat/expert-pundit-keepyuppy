# Publish the reviewed commit in the existing release checkout, then verify Pages.
# This does not create another repository or overwrite remote history.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$release = Join-Path $root 'output\github-pages-source'
$gh = Join-Path $env:ProgramFiles 'GitHub CLI\gh.exe'
$git = Join-Path $env:ProgramFiles 'Git\cmd\git.exe'
if (!(Test-Path $gh)) { $gh = 'gh' }
if (!(Test-Path $git)) { $git = 'git' }
if (!(Test-Path (Join-Path $release '.git'))) { throw "Release checkout is missing: $release" }
$repository = 'Dj4beat/expert-pundit-keepyuppy'
$remote = & $git -C $release remote get-url origin
if ($LASTEXITCODE -ne 0 -or $remote -notmatch '^https://github\.com/Dj4beat/expert-pundit-keepyuppy(?:\.git)?$') {
    throw 'Release origin does not match the existing KeepyUppy repository.'
}
$branch = & $git -C $release branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Release checkout must be on main.' }
$changes = & $git -C $release status --porcelain
if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Review and commit the release checkout changes before publishing.' }
$head = & $git -C $release rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not read the release commit.' }
& $git -C $release push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed. No remote history was overwritten.' }
Write-Host "Watching deployment for commit $head"
$runId = $null
for ($attempt = 0; $attempt -lt 12; $attempt++) {
    $runId = & $gh run list --repo $repository --workflow pages.yml --branch main --commit $head --event push --limit 1 --json databaseId --jq '.[0].databaseId'
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the Actions run. Check gh auth status.' }
    if ($runId) { break }
    Start-Sleep -Seconds 5
}
if (!$runId) { throw "No push-triggered run found for $head. Inspect https://github.com/$repository/actions" }
& $gh run watch $runId --repo $repository --exit-status --interval 10
if ($LASTEXITCODE -ne 0) {
    $logPath = Join-Path $root 'output\github-build-failure.log'
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $PSNativeCommandUseErrorActionPreference = $false
    try {
        & $gh run view $runId --repo $repository --log-failed 2>&1 | Out-File -Encoding utf8 $logPath
        $logExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($logExitCode -eq 0) { Write-Host "Failed-step log saved: $logPath" }
    throw "Deployment did not succeed. Run: https://github.com/$repository/actions/runs/$runId"
}
$siteUrl = & $gh api "repos/$repository/pages" --jq '.html_url'
if ($LASTEXITCODE -ne 0 -or !$siteUrl) { throw 'Could not read the deployed Pages URL.' }
$verified = $false
for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
        $page = Invoke-WebRequest -UseBasicParsing -Uri $siteUrl
        if ($page.StatusCode -eq 200 -and $page.Content -match '<script[^>]+src="([^"]+\.js)"') {
            $bundleUrl = [Uri]::new([Uri]$siteUrl, $Matches[1])
            $bundle = Invoke-WebRequest -UseBasicParsing -Uri $bundleUrl
            if ($bundle.Content.Contains('Created by Adrian Dane') -and $bundle.Content.Contains('https://whatchan.co.uk/about-whatchan-adrian-dane#stat-man')) {
                $verified = $true
                break
            }
        }
    } catch { Write-Host 'Waiting for the published site to become available...' }
    Start-Sleep -Seconds 5
}
if (!$verified) { throw "Deployment finished, but live creator-credit verification failed at $siteUrl" }
Write-Host "Repository: https://github.com/$repository"
Write-Host "Live game verified: $siteUrl"
