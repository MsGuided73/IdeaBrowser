<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12iQY6TvtM3A1RmtN6oJkjMFB5FJwMZEC

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Development Workflow

### Quick Commit & Push

Use the provided scripts to quickly commit and push changes:

**Using npm script:**
```bash
npm run cp "Your commit message here"
```

**Using PowerShell script:**
```powershell
.\cp.ps1
```
This will interactively prompt for your commit message and handle the git workflow.

**To create a global `/cp` command:**
1. Copy the content from `powershell-profile-snippet.ps1` in your project root
2. Add it to your PowerShell profile by running: `notepad $PROFILE`
3. Paste the content at the end of the profile file
4. Restart PowerShell or run: `. $PROFILE`

Then you can use either:
- `cp` (interactive mode - prompts for commit message)
- `/cp` (same as cp)

The global function includes:
- Git status check
- Interactive commit message prompt
- Automatic add, commit, and push
- Colored output with emojis
- Error handling
