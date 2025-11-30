# Add this to your PowerShell profile ($PROFILE)
# Run: notepad $PROFILE
# Then paste this content at the end

function Invoke-CommitPush {
    <#
    .SYNOPSIS
        Commit and push changes to GitHub with interactive commit message
    .DESCRIPTION
        This function performs the complete git workflow:
        - Shows git status
        - Prompts for commit message
        - Adds all changes
        - Commits with message
        - Pushes to origin main
    .EXAMPLE
        cp
    #>

    Write-Host "🔍 Checking git status..." -ForegroundColor Cyan
    git status --short

    Write-Host "`n📝 Enter commit message:" -ForegroundColor Yellow
    $commitMessage = Read-Host

    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        Write-Host "❌ Error: Commit message cannot be empty" -ForegroundColor Red
        return
    }

    Write-Host "`n➕ Adding all changes..." -ForegroundColor Cyan
    git add .

    Write-Host "💾 Committing changes..." -ForegroundColor Cyan
    git commit -m $commitMessage

    if ($LASTEXITCODE -eq 0) {
        Write-Host "🚀 Pushing to remote repository..." -ForegroundColor Cyan
        git push origin main

        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Successfully committed and pushed!" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Push failed" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Commit failed (possibly no changes to commit)" -ForegroundColor Red
    }
}

# Create alias for quick access
Set-Alias -Name cp -Value Invoke-CommitPush
Set-Alias -Name /cp -Value Invoke-CommitPush
