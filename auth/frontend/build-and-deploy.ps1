# Auth Frontend Build Script
# Run this script to build and deploy the React frontend to Django static files

# Navigate to frontend directory
Push-Location "c:\work\Capstone 2\Ticket-Tracking-System\auth\frontend"

# Build the React app
Write-Host "Building React frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Copy assets to Django static folder
Write-Host "Copying assets to Django static folder..." -ForegroundColor Cyan
Copy-Item -Path "dist\assets\*" -Destination "..\static\frontend\" -Force

# Copy public assets (images) to static/images
Write-Host "Copying public assets..." -ForegroundColor Cyan
Copy-Item -Path "public\*" -Destination "..\static\images\" -Force -Recurse

# Get the new filenames from the dist folder
$jsFile = Get-ChildItem "dist\assets\index-*.js" | Select-Object -First 1
$cssFile = Get-ChildItem "dist\assets\index-*.css" | Select-Object -First 1

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "JS file: $($jsFile.Name)" -ForegroundColor Yellow
Write-Host "CSS file: $($cssFile.Name)" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Update the Django template with the new filenames:" -ForegroundColor Magenta
Write-Host "  Edit: auth\templates\frontend\index.html" -ForegroundColor White
Write-Host "  JS:  {% static 'frontend/$($jsFile.Name)' %}" -ForegroundColor White
Write-Host "  CSS: {% static 'frontend/$($cssFile.Name)' %}" -ForegroundColor White

Pop-Location
