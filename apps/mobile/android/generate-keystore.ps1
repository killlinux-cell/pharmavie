# Génère upload-keystore.jks pour la signature Play Store (Windows)
# Usage : depuis apps/mobile/android
#   powershell -ExecutionPolicy Bypass -File .\generate-keystore.ps1

$Keytool = "C:\Program Files\Android\Android Studio2\jbr\bin\keytool.exe"

if (-not (Test-Path $Keytool)) {
    Write-Host "keytool introuvable. Chemins possibles :" -ForegroundColor Red
    Write-Host '  "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"'
    Write-Host '  "C:\Program Files\Android\Android Studio2\jbr\bin\keytool.exe"'
    Write-Host ""
    Write-Host "Ou installez le JDK : https://adoptium.net/"
    exit 1
}

$Keystore = Join-Path $PSScriptRoot "upload-keystore.jks"
if (Test-Path $Keystore) {
    Write-Host "Le fichier upload-keystore.jks existe deja." -ForegroundColor Yellow
    $confirm = Read-Host "Ecraser ? (o/N)"
    if ($confirm -ne "o" -and $confirm -ne "O") { exit 0 }
}

Write-Host ""
Write-Host "=== Creation de la cle PharmaVie (Play Store) ===" -ForegroundColor Cyan
Write-Host "Repondez aux questions (mot de passe a retenir !)" -ForegroundColor Gray
Write-Host "Suggestion CN : PharmaVie | Organisation : PharmaVie | Ville : Abidjan | Pays : CI" -ForegroundColor Gray
Write-Host ""

& $Keytool -genkey -v `
    -keystore $Keystore `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -alias upload

if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec keytool (code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Keystore cree : $Keystore" -ForegroundColor Green
Write-Host ""
Write-Host "Etape suivante : creez key.properties (copiez key.properties.example)" -ForegroundColor Cyan
Write-Host "  storePassword=..."
Write-Host "  keyPassword=..."
Write-Host "  keyAlias=upload"
Write-Host "  storeFile=upload-keystore.jks"
Write-Host ""
Write-Host "SAUVEGARDEZ upload-keystore.jks en lieu sur (cloud + USB) !" -ForegroundColor Yellow
