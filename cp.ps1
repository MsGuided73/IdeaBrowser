# Commit and Push Workflow Script
# Usage: .\cp.ps1

Write-Host "Checking git status..." -ForegroundColor Cyan
git status --short

Write-Host "`nEnter commit message:" -ForegroundColor Yellow
$commitMessage = Read-Host

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    Write-Host "Error: Commit message cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host "`nAdding all changes..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing to remote repository..." -ForegroundColor Cyan
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Successfully committed and pushed!" -ForegroundColor Green
    } else {
        Write-Host "`n✗ Push failed" -ForegroundColor Red
    }
} else {
    Write-Host "`n✗ Commit failed (possibly no changes to commit)" -ForegroundColor Red
}
