$host.ui.RawUI.WindowTitle = "helpdesk frontend"
Write-Host "Starting Helpdesk Frontend..." -ForegroundColor Cyan

# Navigate and Run
Set-Location "$PSScriptRoot\..\..\..\hdts\frontendfolder"
npm run dev