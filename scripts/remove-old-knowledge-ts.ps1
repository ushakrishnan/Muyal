# Remove old TypeScript knowledge source files after migrating JSON descriptors
# - Creates a timestamped backup directory under scripts/backup
# - Copies the files there, then deletes the originals
# Usage: .\scripts\remove-old-knowledge-ts.ps1

$cwd = Get-Location
$base = Join-Path $cwd 'src\core\knowledge-sources'
$backupRoot = Join-Path $cwd 'scripts\backup'

$filesToRemove = @(
    'company-knowledge.ts',
    'dog-knowledge.ts',
    'eldenring-knowledge.ts',
    'employee-knowledge.ts',
    'remote-employee-knowledge.ts',
    'system-knowledge.ts',
    'template-knowledge.ts',
    'weather-knowledge.ts'
)

$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backupDir = Join-Path $backupRoot "knowledge-ts-$timestamp"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Backing up files to $backupDir"

foreach ($f in $filesToRemove) {
    $full = Join-Path $base $f
    if (Test-Path $full) {
        Copy-Item -Path $full -Destination $backupDir -Force
        Write-Host "Backed up: $f"
    } else {
        Write-Host "Not found (skipping): $f"
    }
}

# Confirm deletion
$confirm = Read-Host "Proceed to delete the original files? Type YES to confirm"
if ($confirm -ne 'YES') {
    Write-Host "Aborting deletion. Backups are available at: $backupDir"
    exit 0
}

foreach ($f in $filesToRemove) {
    $full = Join-Path $base $f
    if (Test-Path $full) {
        Remove-Item -Path $full -Force
        Write-Host "Deleted: $f"
    }
}

Write-Host "Done. Backups are at: $backupDir"