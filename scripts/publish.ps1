# Run from Windows PowerShell with an existing GitHub CLI login.
# Prepares a separate source repository so the protected workspace .git is untouched.
$ErrorActionPreference = 'Stop'

function Invoke-GitHubProbe {
    param([string]$Executable, [string[]]$Arguments)
    # Windows PowerShell 5.1 turns redirected native stderr into ErrorRecords.
    # A missing repository is an expected HTTP result, so inspect the exit code
    # and HTTP status ourselves without relaxing error handling for publication.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $PSNativeCommandUseErrorActionPreference = $false
    try {
        $output = @(& $Executable @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    return [PSCustomObject]@{
        ExitCode = $exitCode
        Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
}
$root = Split-Path $PSScriptRoot -Parent
$release = Join-Path $root 'output\github-pages-source'
$gh = Join-Path $env:ProgramFiles 'GitHub CLI\gh.exe'
$git = Join-Path $env:ProgramFiles 'Git\cmd\git.exe'
if (!(Test-Path $gh)) { $gh = 'gh' }
if (!(Test-Path $git)) { $git = 'git' }
$account = & $gh api user --jq '.login'
if ($LASTEXITCODE -ne 0) { throw 'Sign in with gh auth login first.' }
$repository = "$account/expert-pundit-keepyuppy"
$probe = Invoke-GitHubProbe -Executable $gh -Arguments @('api', "repos/$repository", '--include')
if ($probe.ExitCode -eq 0) {
    throw "Repository $repository already exists. Review it before publishing; this script does not overwrite existing repositories."
}
if ($probe.Output -notmatch '(?m)^HTTP/\S+\s+404(?:\s|$)') {
    throw "Could not check repository $repository. No publication was attempted. GitHub response: $($probe.Output)"
}
Write-Host "Repository $repository does not exist yet. Creating it now..."
if (Test-Path $release) { throw "Release staging already exists at $release. Review or move it before rerunning." }
New-Item -ItemType Directory -Path $release -Force | Out-Null
$include = @('src','public','tests','scripts','docs','.github','assets','README.md','AGENTS.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','vitest.config.ts','playwright.config.ts','eslint.config.js','.prettierrc.json','.gitignore','index.html')
foreach ($name in $include) { Copy-Item -Recurse -Force (Join-Path $root $name) $release }
& $git -C $release init -b main
if ($LASTEXITCODE -ne 0) { throw 'Git initialization failed.' }
# Use existing Git identity where configured; otherwise use this authenticated account locally.
$authorName = & $git -C $release config user.name
if (!$authorName) {
  $authorName = & $gh api user --jq '.name // .login'
  & $git -C $release config user.name $authorName
}
$authorEmail = & $git -C $release config user.email
if (!$authorEmail) { & $git -C $release config user.email "$account@users.noreply.github.com" }
& $git -C $release add .
& $git -C $release commit -m 'Add Expert Pundit KeepyUppy game'
if ($LASTEXITCODE -ne 0) { throw 'Git commit failed. Configure your Git name and email.' }
Push-Location $release
try {
  & $gh repo create $repository --public --source . --remote origin --push
  if ($LASTEXITCODE -ne 0) { throw 'Repository creation or push failed.' }
  & $gh api --method POST "repos/$repository/pages" --field build_type=workflow
  if ($LASTEXITCODE -ne 0) { throw 'Enable GitHub Pages with GitHub Actions in repository Settings, then rerun the workflow.' }
  & $gh workflow run pages.yml --repo $repository
  if ($LASTEXITCODE -ne 0) { throw 'Start the Pages workflow in GitHub Actions.' }
  Write-Host "Build and deployment started. Inspect https://github.com/$repository/actions"
  $runId = $null
  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    Start-Sleep -Seconds 5
    $runId = & $gh run list --repo $repository --workflow pages.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
    if ($runId) { break }
  }
  if (!$runId) { throw 'No deployment run was found. Inspect the repository Actions page.' }
  & $gh run watch $runId --repo $repository --exit-status --interval 10
  if ($LASTEXITCODE -ne 0) { throw 'Deployment checks failed. Review the Actions logs before publishing further changes.' }
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
} finally { Pop-Location }
