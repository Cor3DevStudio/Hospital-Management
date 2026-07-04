Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot "..\src\assets\forms\CF1-bg.png"
$dst = Join-Path $PSScriptRoot "..\src\assets\forms\philhealth-logo.png"
$img = [System.Drawing.Image]::FromFile((Resolve-Path $src))
Write-Host ("source {0}x{1}" -f $img.Width, $img.Height)
# Logo region from official CF-1 artwork (figures + PhilHealth wordmark + tagline)
# Inset past the form border so only the logo is kept.
$rect = New-Object System.Drawing.Rectangle 38, 42, 280, 100
$bmp = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage(
  $img,
  (New-Object System.Drawing.Rectangle 0, 0, $rect.Width, $rect.Height),
  $rect,
  [System.Drawing.GraphicsUnit]::Pixel
)
$bmp.Save((Resolve-Path (Split-Path $dst -Parent)).Path + "\philhealth-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "saved philhealth-logo.png"
