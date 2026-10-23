# Installs the Mughal.Dev publisher certificate into the Windows Trusted Stores
param(
    [string]$CerPath = "$PSScriptRoot\..\build\certs\MughalDevCodeSigning.cer"
)

if (-not (Test-Path $CerPath)) {
    Write-Error "Certificate file not found at: $CerPath. Run create-code-cert.ps1 first."
    exit 1
}

Write-Host "Installing Publisher Certificate to Windows Trusted Stores..." -ForegroundColor Cyan

# Install to CurrentUser TrustedPublisher
Import-Certificate -FilePath $CerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null
Write-Host "[OK] Installed into Cert:\CurrentUser\TrustedPublisher" -ForegroundColor Green

# Install to CurrentUser Root Certification Authorities
Import-Certificate -FilePath $CerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
Write-Host "[OK] Installed into Cert:\CurrentUser\Root" -ForegroundColor Green

Write-Host ""
Write-Host "All installers signed with this certificate will now show:" -ForegroundColor Yellow
Write-Host "  Publisher: Zain Ali Mughal (Mughal.Dev)" -ForegroundColor Green
Write-Host "  Status: Verified and Trusted (No untrusted publisher warning!)" -ForegroundColor Green
