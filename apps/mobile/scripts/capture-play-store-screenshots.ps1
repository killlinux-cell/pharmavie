# Génère des captures Play Store depuis l'émulateur Android (vraies screens app)
# Prérequis : émulateur Pixel démarré OU appareil USB branché
# Usage :
#   cd d:\pharmavie\apps\mobile
#   powershell -ExecutionPolicy Bypass -File .\scripts\capture-play-store-screenshots.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$OutDir = Join-Path $Root "store-assets\screenshots-real"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "=== Captures Play Store (app reelle) ===" -ForegroundColor Cyan

$devices = flutter devices 2>&1 | Out-String
if ($devices -notmatch "emulator|android") {
    Write-Host "Demarrage emulateur Pixel_7..." -ForegroundColor Yellow
    flutter emulators --launch Pixel_7
    Write-Host "Attente boot (60s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 60
}

Set-Location $Root
flutter pub get | Out-Null

Write-Host "Lancez manuellement l'app sur l'emulateur, puis :" -ForegroundColor Yellow
Write-Host "  1. Accueil + recherche Paracetamol  -> Entree"
Write-Host "  2. Mode Pharmacie + recherche        -> Entree"
Write-Host "  3. Catalogue pharmacie               -> Entree"
Write-Host "  4. Carte interactive                 -> Entree"
Write-Host "  5. Panier                            -> Entree"
Write-Host "  6. Commandes                         -> Entree"
Write-Host ""
Write-Host "A chaque ecran pret, appuyez sur Entree pour capturer." -ForegroundColor Cyan

$names = @(
    "01-accueil-recherche.png",
    "02-recherche-pharmacie.png",
    "03-catalogue-pharmacie.png",
    "04-carte-pharmacies.png",
    "05-panier.png",
    "06-commande-suivi.png"
)

$serial = (adb devices | Select-String "device$" | Select-Object -First 1).ToString().Split()[0]
if (-not $serial) { throw "Aucun appareil ADB detecte" }
Write-Host "Appareil : $serial" -ForegroundColor Green

$i = 0
foreach ($name in $names) {
    $i++
    Read-Host "Ecran $i/6 pret ($name) - Entree pour capturer"
    $remote = "/sdcard/pharmavie_cap.png"
    $local = Join-Path $OutDir $name
    adb -s $serial shell screencap -p $remote | Out-Null
    adb -s $serial pull $remote $local | Out-Null
    adb -s $serial shell rm $remote | Out-Null
    Write-Host "  OK -> $local" -ForegroundColor Green
}

Write-Host ""
Write-Host "Captures reelles dans : $OutDir" -ForegroundColor Green
Write-Host "Remplacez les fichiers dans store-assets\screenshots\ si vous preferez les vraies screens." -ForegroundColor Yellow
