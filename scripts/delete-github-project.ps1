param(
    [string]$Owner = "@me",
    [int]$Limit = 100
)

$ErrorActionPreference = "Stop"

function Exit-WithMessage {
    param(
        [string]$Message,
        [int]$Code = 1
    )

    Write-Host $Message
    exit $Code
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Exit-WithMessage "gh CLI was not found. Install GitHub CLI and run this script again."
}

Write-Host "Fetching GitHub Projects. Owner: $Owner"

try {
    $json = gh project list --owner $Owner --limit $Limit --format json
} catch {
    Exit-WithMessage "Failed to list projects: $($_.Exception.Message)"
}

if ($LASTEXITCODE -ne 0) {
    Exit-WithMessage "gh project list failed. Check gh auth status and network access."
}

$result = $json | ConvertFrom-Json
$projects = @($result.projects)

if ($projects.Count -eq 0) {
    Write-Host "No GitHub Projects were found for deletion."
    exit 0
}

Write-Host ""
Write-Host "GitHub Projects available for deletion:"
Write-Host ""

for ($i = 0; $i -lt $projects.Count; $i++) {
    $project = $projects[$i]
    $closed = if ($project.closed) { "closed" } else { "open" }
    $idText = if ($project.id) { " id=$($project.id)" } else { "" }
    Write-Host ("[{0}] number={1} status={2}{3} title={4}" -f ($i + 1), $project.number, $closed, $idText, $project.title)
}

Write-Host ""
$selection = Read-Host "Enter the list index, project number, or id to delete"

if ([string]::IsNullOrWhiteSpace($selection)) {
    Exit-WithMessage "No selection was entered. Aborting."
}

$selectedProject = $null
$selection = $selection.Trim()

$selectionNumber = 0
if ([int]::TryParse($selection, [ref]$selectionNumber)) {
    if ($selectionNumber -ge 1 -and $selectionNumber -le $projects.Count) {
        $selectedProject = $projects[$selectionNumber - 1]
    } else {
        $selectedProject = $projects | Where-Object { $_.number -eq $selectionNumber } | Select-Object -First 1
    }
} else {
    $selectedProject = $projects | Where-Object { $_.id -eq $selection } | Select-Object -First 1
}

if (-not $selectedProject) {
    Exit-WithMessage "The selected project was not found in the listed projects."
}

Write-Host ""
Write-Host "Delete target:"
Write-Host ("  number: {0}" -f $selectedProject.number)
Write-Host ("  title : {0}" -f $selectedProject.title)
if ($selectedProject.url) {
    Write-Host ("  url   : {0}" -f $selectedProject.url)
}
Write-Host ""

$confirmation = Read-Host "Type DELETE to permanently delete this project"
if ($confirmation -cne "DELETE") {
    Exit-WithMessage "Confirmation did not match. Aborting."
}

try {
    gh project delete $selectedProject.number --owner $Owner
} catch {
    Exit-WithMessage "Failed to delete project: $($_.Exception.Message)"
}

if ($LASTEXITCODE -ne 0) {
    Exit-WithMessage "gh project delete failed."
}

Write-Host "Deleted project: $($selectedProject.title)"
