$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$Version = "20260719-live-logo-pull"

$items = @(
  @{
    Id = "haven-mobility"
    File = "assets/images/businesses/haven-mobility/haven-mobility-logo.jpg"
    Url = "https://static.wixstatic.com/media/b74180_6d4ed9fbff1143c489c7f7710ecc6c82~mv2.jpg/v1/fill/w_402,h_162,al_c,lg_1,q_80/b74180_6d4ed9fbff1143c489c7f7710ecc6c82~mv2.jpg"
  },
  @{
    Id = "beijing-house"
    File = "assets/images/businesses/beijing-house/beijing-house-logo.jpg"
    Url = "https://static.wixstatic.com/media/b74180_fc7addc68e9b4594b6596db79bf57623~mv2.jpg/v1/fill/w_357,h_64,al_c,lg_1,q_80/415.jpg"
  },
  @{
    Id = "torfaen-salvage"
    File = "assets/images/businesses/torfaen-salvage/torfaen-salvage-logo.jpg"
    Url = "https://static.wixstatic.com/media/ad417a_16e5fb271df24b3882784bad1673b047~mv2.jpg/v1/fill/w_300,h_95,al_c,q_80/ad417a_16e5fb271df24b3882784bad1673b047~mv2.jpg"
  },
  @{
    Id = "mosswood-industrial-supplies"
    File = "assets/images/businesses/mosswood-industrial-supplies/mosswood-industrial-supplies-logo.gif"
    Url = "https://static.wixstatic.com/media/b74180_7a135e409d794b1dbe2942df723ca5f9~mv2.gif"
  },
  @{
    Id = "the-little-computer-shop"
    File = "assets/images/businesses/the-little-computer-shop/the-little-computer-shop-logo.jpg"
    Url = "https://static.wixstatic.com/media/b74180_09254251cf2b46009f7e62f2b49872ee~mv2.jpg/v1/crop/x_4,y_0,w_251,h_73/fill/w_310,h_90,al_c,lg_1,q_80/b74180_09254251cf2b46009f7e62f2b49872ee~mv2.jpg"
  },
  @{
    Id = "windsor-wedding-car-hire"
    File = "assets/images/businesses/windsor-wedding-car-hire/windsor-wedding-car-hire-logo.png"
    Url = "https://static.wixstatic.com/media/b74180_54505997dfe542a9867383e13e3a5a9e~mv2.png/v1/fill/w_883,h_131,al_c,q_85/b74180_54505997dfe542a9867383e13e3a5a9e~mv2.png"
  },
  @{
    Id = "cwmbran-door-centre"
    File = "assets/images/businesses/cwmbran-door-centre/cwmbran-door-centre-logo.jpg"
    Url = "https://static.wixstatic.com/media/b74180_ef5182d99b7243c39e11a9a8b57ef8d5~mv2.jpg/v1/fill/w_346,h_186,al_c,lg_1,q_80/b74180_ef5182d99b7243c39e11a9a8b57ef8d5~mv2.jpg"
  },
  @{
    Id = "car-body-work-specialists-ltd"
    File = "assets/images/businesses/car-body-work-specialists-ltd/car-body-work-specialists-ltd-logo.png"
    Url = "https://static.wixstatic.com/media/b74180_fd1ec933a44a4252b036467a77390c26~mv2.png/v1/fill/w_364,h_112,al_c,lg_1,q_85/b74180_fd1ec933a44a4252b036467a77390c26~mv2.png"
  }
)

$downloaded = @()

foreach ($item in $items) {
  $target = Join-Path $Root $item.File
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  Write-Host "Downloading $($item.Id)..."
  try {
    Invoke-WebRequest -Uri $item.Url -OutFile $target -UserAgent "Mozilla/5.0"
    if ((Test-Path $target) -and ((Get-Item $target).Length -gt 0)) {
      $downloaded += $item
      Write-Host "  saved $($item.File)"
    } else {
      Write-Host "  failed: empty file"
    }
  } catch {
    Write-Host "  failed: $($_.Exception.Message)"
  }
}

if ($downloaded.Count -eq 0) {
  Write-Host ""
  Write-Host "No logos downloaded. Check your internet connection and try again."
  exit 1
}

$jsonPath = Join-Path $Root "data/businesses.json"
$jsPath = Join-Path $Root "data/businesses.js"
$data = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json

foreach ($item in $downloaded) {
  $business = $data.businesses | Where-Object { $_.id -eq $item.Id } | Select-Object -First 1
  if ($null -eq $business) { continue }

  $business.logo = $item.File
  $business.cardImage = $item.File
  $business.cardImageFit = "contain"

  if ($business.PSObject.Properties.Name -contains "logoStatus") {
    $business.logoStatus = "live-site-original"
  } else {
    $business | Add-Member -NotePropertyName "logoStatus" -NotePropertyValue "live-site-original"
  }
}

$json = $data | ConvertTo-Json -Depth 50
Set-Content -LiteralPath $jsonPath -Value ($json + "`n") -Encoding UTF8
Set-Content -LiteralPath $jsPath -Value ("window.NP_BUSINESSES = " + $json + ";`n") -Encoding UTF8

Get-ChildItem -Path $Root -Filter "*.html" | ForEach-Object {
  $html = Get-Content -LiteralPath $_.FullName -Raw
  $html = $html -replace 'data/businesses\.js\?v=[^"'''']+', "data/businesses.js?v=$Version"
  Set-Content -LiteralPath $_.FullName -Value $html -NoNewline -Encoding UTF8
}

Write-Host ""
Write-Host "Downloaded $($downloaded.Count) logos and updated the site data."
Write-Host "Refresh the preview to see the updated category and location cards."
