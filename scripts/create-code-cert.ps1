# Generates an Authenticode Code Signing Certificate for Zain Ali Mughal (Mughal.Dev)
param(
    [string]$PublisherName = "Zain Ali Mughal (Mughal.Dev)",
    [string]$Password = "MughalDev2026!",
    [string]$OutputDir = "$PSScriptRoot\..\build\certs"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Generating Code Signing Certificate for: $PublisherName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$PublisherName" -KeyUsage DigitalSignature -FriendlyName "Terminal Manager Publisher Certificate ($PublisherName)" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5)

Write-Host "[OK] Certificate created with Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

$securePassword = ConvertTo-SecureString -String $Password -AsPlainText -Force
$pfxPath = Join-Path $OutputDir "MughalDevCodeSigning.pfx"
$cerPath = Join-Path $OutputDir "MughalDevCodeSigning.cer"

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Write-Host "[OK] Exported Private PFX: $pfxPath" -ForegroundColor Green

Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
Write-Host "[OK] Exported Public CER:  $cerPath" -ForegroundColor Green

Write-Host ""
Write-Host "To use with electron-builder, set:" -ForegroundColor Yellow
Write-Host "  `$env:CSC_LINK = '$pfxPath'"
Write-Host "  `$env:CSC_KEY_PASSWORD = '$Password'"
Write-Host ""
Write-Host "To install on user machines to remove the Untrusted Publisher popup:" -ForegroundColor Yellow
Write-Host "  Run: powershell -ExecutionPolicy Bypass -File scripts\install-cert.ps1"
