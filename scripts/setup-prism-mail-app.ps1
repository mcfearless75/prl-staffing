<#
    Sets up the Entra app registration PRISM uses to send email via Microsoft 365 Graph.

    Run this yourself in PowerShell as a Global Administrator. It performs a security
    configuration change on your tenant (a new app principal with Mail.Send, plus admin
    consent), so read it before running it.

    Creates a NEW app registration deliberately - do not reuse the SSO one. Mail.Send as
    an application permission is tenant-wide "send as anybody" by default, so the final
    step scopes it to a single mailbox via an Exchange application access policy.

    Usage:
        .\setup-prism-mail-app.ps1
        .\setup-prism-mail-app.ps1 -Mailbox "someone@prlsitesolutions.co.uk"

    Prints GRAPH_TENANT_ID, GRAPH_CLIENT_ID and GRAPH_CLIENT_SECRET at the end. The secret
    is shown once and is never retrievable again - copy it straight into Railway.

    NOTE: deliberately ASCII-only. Windows PowerShell 5.1 reads .ps1 files as ANSI unless
    they carry a UTF-8 BOM, which mangles characters like em-dashes and breaks parsing.
#>

[CmdletBinding()]
param(
    [string]$Mailbox = "infotech@prlsitesolutions.co.uk",
    [string]$AppName = "PRISM Mail",
    [int]$SecretYears = 2,
    [switch]$SkipExchangePolicy
)

$ErrorActionPreference = "Stop"
$GraphAppId = "00000003-0000-0000-c000-000000000000"  # Microsoft Graph, same in every tenant

function Write-Step { param($n, $t) Write-Host "`n[$n] $t" -ForegroundColor Cyan }
function Write-Ok   { param($t) Write-Host "    OK   $t" -ForegroundColor Green }
function Write-Warn { param($t) Write-Host "    WARN $t" -ForegroundColor Yellow }

Write-Host "PRISM mail app setup" -ForegroundColor White
Write-Host "Mailbox to send as : $Mailbox"
Write-Host "App registration   : $AppName"

# --- Modules ----------------------------------------------------------------
Write-Step 1 "Checking required PowerShell modules"
foreach ($m in @("Microsoft.Graph.Applications", "Microsoft.Graph.Identity.SignIns")) {
    if (-not (Get-Module -ListAvailable -Name $m)) {
        Write-Warn "$m not installed - installing for current user (can take a few minutes)"
        Install-Module $m -Scope CurrentUser -Force -AllowClobber
    }
    Write-Ok $m
}

# --- Sign in ----------------------------------------------------------------
Write-Step 2 "Signing in to Microsoft Graph (a browser window will open)"
Connect-MgGraph -Scopes "Application.ReadWrite.All", "AppRoleAssignment.ReadWrite.All" -NoWelcome
$context  = Get-MgContext
$tenantId = $context.TenantId
Write-Ok "Signed in as $($context.Account) on tenant $tenantId"

# --- Existing app guard -----------------------------------------------------
Write-Step 3 "Checking whether '$AppName' already exists"
$existing = Get-MgApplication -Filter "displayName eq '$AppName'" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "An app called '$AppName' already exists (AppId $($existing.AppId))."
    Write-Warn "Re-running would create duplicate credentials. Either delete it in the"
    Write-Warn "Entra portal, or re-run with -AppName 'Something Else'. Stopping here."
    return
}
Write-Ok "No clash"

# --- Resolve the Mail.Send application role ---------------------------------
# Looked up rather than hardcoded, so a changed GUID cannot silently grant the wrong thing.
Write-Step 4 "Resolving the Mail.Send application permission"
$graphSp  = Get-MgServicePrincipal -Filter "appId eq '$GraphAppId'"
$mailSend = $graphSp.AppRoles | Where-Object {
    $_.Value -eq "Mail.Send" -and $_.AllowedMemberTypes -contains "Application"
}
if (-not $mailSend) { throw "Could not find the Mail.Send application role on Microsoft Graph." }
Write-Ok "Mail.Send = $($mailSend.Id)"

# --- Create the app ---------------------------------------------------------
Write-Step 5 "Creating the app registration"
$app = New-MgApplication -DisplayName $AppName -SignInAudience "AzureADMyOrg" -RequiredResourceAccess @(
    @{
        ResourceAppId  = $GraphAppId
        ResourceAccess = @(@{ Id = $mailSend.Id; Type = "Role" })
    }
)
Write-Ok "Created - AppId $($app.AppId)"

Write-Step 6 "Creating its service principal"
$sp = New-MgServicePrincipal -AppId $app.AppId
Write-Ok "Service principal $($sp.Id)"

# --- Admin consent ----------------------------------------------------------
Write-Step 7 "Granting admin consent for Mail.Send"
Start-Sleep -Seconds 10   # directory replication; the assignment 404s if this runs too soon
New-MgServicePrincipalAppRoleAssignment `
    -ServicePrincipalId $sp.Id `
    -PrincipalId $sp.Id `
    -ResourceId $graphSp.Id `
    -AppRoleId $mailSend.Id | Out-Null
Write-Ok "Consent granted (no portal click needed)"

# --- Client secret ----------------------------------------------------------
Write-Step 8 "Creating a client secret valid for $SecretYears year(s)"
$expiry = (Get-Date).AddYears($SecretYears)
$cred = Add-MgApplicationPassword -ApplicationId $app.Id -PasswordCredential @{
    DisplayName = "PRISM Railway"
    EndDateTime = $expiry
}
$expiryLabel = $expiry.ToString("dd MMM yyyy")
Write-Ok "Secret created, expires $expiryLabel"
Write-Warn "DIARISE THAT DATE - PRISM email stops dead when the secret lapses."

# --- Scope to one mailbox ---------------------------------------------------
if ($SkipExchangePolicy) {
    Write-Step 9 "Skipping the Exchange access policy (-SkipExchangePolicy given)"
    Write-Warn "Until a policy exists this app can send as ANY mailbox in the tenant."
} else {
    Write-Step 9 "Restricting the app to $Mailbox only"
    if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
        Write-Warn "Installing ExchangeOnlineManagement"
        Install-Module ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
    }
    try {
        Connect-ExchangeOnline -ShowBanner:$false
        New-ApplicationAccessPolicy `
            -AppId $app.AppId `
            -PolicyScopeGroupId $Mailbox `
            -AccessRight RestrictAccess `
            -Description "PRISM may only send as $Mailbox" | Out-Null
        Write-Ok "Policy created"

        Start-Sleep -Seconds 5
        $test = Test-ApplicationAccessPolicy -Identity $Mailbox -AppId $app.AppId
        Write-Ok "Access check for ${Mailbox}: $($test.AccessCheckResult)"
    } catch {
        Write-Warn "Could not create the access policy: $($_.Exception.Message)"
        Write-Warn "The app WILL still send, but is not yet restricted to one mailbox."
        Write-Warn "Run this manually in Exchange Online PowerShell:"
        $manual = "    New-ApplicationAccessPolicy -AppId $($app.AppId) -PolicyScopeGroupId $Mailbox -AccessRight RestrictAccess -Description 'PRISM mail scope'"
        Write-Host $manual -ForegroundColor Gray
    }
}

# --- Output -----------------------------------------------------------------
Write-Host ""
Write-Host "==============================================================" -ForegroundColor White
Write-Host " Add these four variables in Railway, then redeploy" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor White
Write-Host ""
Write-Host "GRAPH_TENANT_ID     = $tenantId"
Write-Host "GRAPH_CLIENT_ID     = $($app.AppId)"
Write-Host "GRAPH_CLIENT_SECRET = $($cred.SecretText)"
Write-Host "MAIL_SENDER         = $Mailbox"
Write-Host ""
Write-Host "The secret above is shown ONCE and cannot be retrieved again." -ForegroundColor Yellow
Write-Host "If you lose it, create a replacement under Certificates and secrets." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then verify from a browser tab logged into PRISM as staff:" -ForegroundColor White
Write-Host '  fetch("/api/admin/email-test").then(r=>r.json()).then(console.log)' -ForegroundColor Gray
Write-Host '  fetch("/api/admin/email-test",{method:"POST"}).then(r=>r.json()).then(console.log)' -ForegroundColor Gray
Write-Host ""
