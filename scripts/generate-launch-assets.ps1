Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

function Join-ProjectPath {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  return [System.IO.Path]::GetFullPath((Join-Path $projectRoot $RelativePath))
}

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  $directory = Split-Path -Parent $Path
  if ($directory -and -not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }
}

function New-HexColor {
  param(
    [Parameter(Mandatory = $true)][string]$Hex,
    [int]$Alpha = 255
  )

  $clean = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($clean.Substring(0, 2), 16),
    [Convert]::ToInt32($clean.Substring(2, 2), 16),
    [Convert]::ToInt32($clean.Substring(4, 2), 16)
  )
}

function New-GraphicsPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-Canvas {
  param(
    [int]$Width,
    [int]$Height,
    [System.Drawing.Color]$Background = [System.Drawing.Color]::Transparent
  )

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear($Background)

  return @{
    Bitmap = $bitmap
    Graphics = $graphics
  }
}

function Close-Canvas {
  param($Canvas)

  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Save-Png {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)][string]$Path
  )

  Ensure-Directory -Path $Path
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-Ico {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)][string]$Path
  )

  Ensure-Directory -Path $Path

  $stream = New-Object System.IO.MemoryStream
  try {
    $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $stream.ToArray()
    $writer = New-Object System.IO.BinaryWriter([System.IO.File]::Open($Path, [System.IO.FileMode]::Create))
    try {
      $writer.Write([UInt16]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]1)
      $writer.Write([byte]$Bitmap.Width)
      $writer.Write([byte]$Bitmap.Height)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$bytes.Length)
      $writer.Write([UInt32]22)
      $writer.Write($bytes)
    } finally {
      $writer.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

function Get-Image {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  return [System.Drawing.Image]::FromFile((Join-ProjectPath $RelativePath))
}

function Draw-ContainedImage {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][System.Drawing.Image]$Image,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [Parameter(Mandatory = $true)][float]$Height
  )

  $ratio = [Math]::Min($Width / $Image.Width, $Height / $Image.Height)
  $targetWidth = $Image.Width * $ratio
  $targetHeight = $Image.Height * $ratio
  $offsetX = $X + (($Width - $targetWidth) / 2)
  $offsetY = $Y + (($Height - $targetHeight) / 2)

  $Graphics.DrawImage($Image, $offsetX, $offsetY, $targetWidth, $targetHeight)
}

function Resize-SourceIcon {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][System.Drawing.Color]$Background,
    [float]$PaddingRatio = 0.14
  )

  $canvas = New-Canvas -Width $Size -Height $Size -Background $Background
  try {
    $padding = $Size * $PaddingRatio
    Draw-ContainedImage -Graphics $canvas.Graphics -Image $Source -X $padding -Y $padding -Width ($Size - ($padding * 2)) -Height ($Size - ($padding * 2))
    return $canvas.Bitmap
  } finally {
    $canvas.Graphics.Dispose()
  }
}

function New-MaskableIcon {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
    [Parameter(Mandatory = $true)][int]$Size
  )

  $cream = New-HexColor "#f5f2ec"
  $green = New-HexColor "#247052"
  $canvas = New-Canvas -Width $Size -Height $Size -Background $green

  try {
    $graphics = $canvas.Graphics
    $safeZone = $Size * 0.2
    $ringSize = $Size - ($safeZone * 2)
    $ringBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, $cream))
    $ringPath = New-GraphicsPath -X $safeZone -Y $safeZone -Width $ringSize -Height $ringSize -Radius ($Size * 0.18)
    try {
      $graphics.FillPath($ringBrush, $ringPath)
    } finally {
      $ringBrush.Dispose()
      $ringPath.Dispose()
    }

    Draw-ContainedImage -Graphics $graphics -Image $Source -X ($Size * 0.22) -Y ($Size * 0.22) -Width ($Size * 0.56) -Height ($Size * 0.56)
    return $canvas.Bitmap
  } finally {
    $canvas.Graphics.Dispose()
  }
}

function New-OgImage {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Image]$LogoSource,
    [Parameter(Mandatory = $true)][System.Drawing.Image]$MascotSource
  )

  $cream = New-HexColor "#f5f2ec"
  $green = New-HexColor "#247052"
  $greenDark = New-HexColor "#193129"
  $surface = New-HexColor "#ffffff"
  $amber = New-HexColor "#d48b45"
  $muted = New-HexColor "#64746d"

  $canvas = New-Canvas -Width 1200 -Height 630 -Background $cream

  try {
    $graphics = $canvas.Graphics

    $topGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36, $green))
    $bottomGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22, $amber))
    try {
      $graphics.FillEllipse($topGlow, -80, -120, 520, 360)
      $graphics.FillEllipse($bottomGlow, 850, 360, 340, 220)
    } finally {
      $topGlow.Dispose()
      $bottomGlow.Dispose()
    }

    $cardPath = New-GraphicsPath -X 44 -Y 54 -Width 1112 -Height 522 -Radius 36
    $cardBrush = New-Object System.Drawing.SolidBrush $surface
    $cardBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(24, $greenDark), 1.5)
    try {
      $graphics.FillPath($cardBrush, $cardPath)
      $graphics.DrawPath($cardBorder, $cardPath)
    } finally {
      $cardPath.Dispose()
      $cardBrush.Dispose()
      $cardBorder.Dispose()
    }

    $logoPanelPath = New-GraphicsPath -X 84 -Y 94 -Width 96 -Height 96 -Radius 28
    $logoPanelBrush = New-Object System.Drawing.SolidBrush $green
    try {
      $graphics.FillPath($logoPanelBrush, $logoPanelPath)
      Draw-ContainedImage -Graphics $graphics -Image $LogoSource -X 102 -Y 112 -Width 60 -Height 60
    } finally {
      $logoPanelBrush.Dispose()
      $logoPanelPath.Dispose()
    }

    $brandFont = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
    $headlineFont = New-Object System.Drawing.Font "Segoe UI", 48, ([System.Drawing.FontStyle]::Bold)
    $subFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Regular)
    $ctaFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Bold)
    $metaFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
    $greenBrush = New-Object System.Drawing.SolidBrush $green
    $greenDarkBrush = New-Object System.Drawing.SolidBrush $greenDark
    $mutedBrush = New-Object System.Drawing.SolidBrush $muted
    $creamBrush = New-Object System.Drawing.SolidBrush $cream

    try {
      $graphics.DrawString("FAZUMI", $brandFont, $greenBrush, 200, 124)
      $graphics.DrawString("WhatsApp summary in seconds", $headlineFont, $greenDarkBrush, 84, 226)
      $graphics.DrawString("Turn busy school chats into clear summaries, dates, and action items without storing raw chat text.", $subFont, $mutedBrush, (New-Object System.Drawing.RectangleF 84, 318, 540, 120))
      $graphics.DrawString("Parents across the GCC use Fazumi to catch the signal, not the noise.", $metaFont, $mutedBrush, 84, 444)

      $ctaPath = New-GraphicsPath -X 84 -Y 490 -Width 206 -Height 54 -Radius 26
      $ctaBrush = New-Object System.Drawing.SolidBrush $green
      try {
        $graphics.FillPath($ctaBrush, $ctaPath)
        $graphics.DrawString("Start free", $ctaFont, $creamBrush, 132, 506)
      } finally {
        $ctaBrush.Dispose()
        $ctaPath.Dispose()
      }
    } finally {
      $brandFont.Dispose()
      $headlineFont.Dispose()
      $subFont.Dispose()
      $ctaFont.Dispose()
      $metaFont.Dispose()
      $greenBrush.Dispose()
      $greenDarkBrush.Dispose()
      $mutedBrush.Dispose()
      $creamBrush.Dispose()
    }

    Draw-ContainedImage -Graphics $graphics -Image $MascotSource -X 760 -Y 190 -Width 340 -Height 340

    return $canvas.Bitmap
  } finally {
    $canvas.Graphics.Dispose()
  }
}

function New-MascotVariant {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
    [Parameter(Mandatory = $true)][ValidateSet("thinking", "celebrating", "error")][string]$Variant
  )

  $green = New-HexColor "#247052"
  $greenDark = New-HexColor "#193129"
  $cream = New-HexColor "#f5f2ec"
  $amber = New-HexColor "#d48b45"
  $red = New-HexColor "#c24d42"

  $canvas = New-Canvas -Width 512 -Height 512 -Background ([System.Drawing.Color]::Transparent)

  try {
    $graphics = $canvas.Graphics
    Draw-ContainedImage -Graphics $graphics -Image $Source -X 24 -Y 48 -Width 464 -Height 432

    switch ($Variant) {
      "thinking" {
        $bubbleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, $cream))
        $bubblePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(210, $green), 4)
        try {
          $graphics.FillEllipse($bubbleBrush, 304, 42, 136, 96)
          $graphics.DrawEllipse($bubblePen, 304, 42, 136, 96)
          $graphics.FillEllipse($bubbleBrush, 278, 130, 24, 24)
          $graphics.DrawEllipse($bubblePen, 278, 130, 24, 24)
          $graphics.FillEllipse($bubbleBrush, 246, 164, 14, 14)
          $graphics.DrawEllipse($bubblePen, 246, 164, 14, 14)

          foreach ($x in 332, 372, 412) {
            $dotBrush = New-Object System.Drawing.SolidBrush $green
            try {
              $graphics.FillEllipse($dotBrush, $x, 82, 12, 12)
            } finally {
              $dotBrush.Dispose()
            }
          }
        } finally {
          $bubbleBrush.Dispose()
          $bubblePen.Dispose()
        }
      }
      "celebrating" {
        foreach ($confetti in @(
            @{ X = 94; Y = 68; W = 28; H = 10; Color = $amber; Angle = -24 },
            @{ X = 136; Y = 48; W = 22; H = 10; Color = $green; Angle = 18 },
            @{ X = 370; Y = 62; W = 24; H = 10; Color = $amber; Angle = 30 },
            @{ X = 410; Y = 98; W = 22; H = 10; Color = $green; Angle = -16 },
            @{ X = 78; Y = 124; W = 18; H = 10; Color = $greenDark; Angle = 12 }
          )) {
          $brush = New-Object System.Drawing.SolidBrush $confetti.Color
          $state = $graphics.Save()
          try {
            $graphics.TranslateTransform($confetti.X, $confetti.Y)
            $graphics.RotateTransform($confetti.Angle)
            $graphics.FillRectangle($brush, 0, 0, $confetti.W, $confetti.H)
          } finally {
            $graphics.Restore($state)
            $brush.Dispose()
          }
        }

        $haloBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, $green))
        try {
          $graphics.FillEllipse($haloBrush, 130, 32, 252, 118)
        } finally {
          $haloBrush.Dispose()
        }
      }
      "error" {
        $ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(210, $red), 10)
        $badgeBrush = New-Object System.Drawing.SolidBrush $red
        $badgeTextBrush = New-Object System.Drawing.SolidBrush $cream
        $badgeFont = New-Object System.Drawing.Font "Segoe UI", 34, ([System.Drawing.FontStyle]::Bold)
        try {
          $graphics.DrawEllipse($ringPen, 88, 88, 336, 336)
          $graphics.FillEllipse($badgeBrush, 354, 84, 86, 86)
          $graphics.DrawString("!", $badgeFont, $badgeTextBrush, 386, 97)
        } finally {
          $ringPen.Dispose()
          $badgeBrush.Dispose()
          $badgeTextBrush.Dispose()
          $badgeFont.Dispose()
        }
      }
    }

    return $canvas.Bitmap
  } finally {
    $canvas.Graphics.Dispose()
  }
}

$logoSource = Get-Image "public/brand/logo/favicon.png"
$mascotWaving = Get-Image "public/brand/mascot/mascot-waving.png"
$mascotReading = Get-Image "public/brand/mascot/mascot-reading.png"

try {
  $green = New-HexColor "#247052"
  $transparent = [System.Drawing.Color]::Transparent

  $appleTouch = Resize-SourceIcon -Source $logoSource -Size 180 -Background $green -PaddingRatio 0.1
  $icon192 = Resize-SourceIcon -Source $logoSource -Size 192 -Background $green -PaddingRatio 0.1
  $icon512 = Resize-SourceIcon -Source $logoSource -Size 512 -Background $green -PaddingRatio 0.1
  $faviconBitmap = Resize-SourceIcon -Source $logoSource -Size 48 -Background $transparent -PaddingRatio 0.08
  $maskable = New-MaskableIcon -Source $logoSource -Size 512
  $ogImage = New-OgImage -LogoSource $logoSource -MascotSource $mascotWaving
  $thinkingMascot = New-MascotVariant -Source $mascotReading -Variant "thinking"
  $celebratingMascot = New-MascotVariant -Source $mascotWaving -Variant "celebrating"
  $errorMascot = New-MascotVariant -Source $mascotReading -Variant "error"
  $logoPng = Resize-SourceIcon -Source $logoSource -Size 512 -Background $transparent -PaddingRatio 0.08

  try {
    Save-Png -Bitmap $appleTouch -Path (Join-ProjectPath "public/apple-touch-icon.png")
    Save-Png -Bitmap $appleTouch -Path (Join-ProjectPath "public/brand/logo/apple-touch-icon.png")
    Save-Png -Bitmap $icon192 -Path (Join-ProjectPath "public/icon-192.png")
    Save-Png -Bitmap $icon512 -Path (Join-ProjectPath "public/icon-512.png")
    Save-Png -Bitmap $maskable -Path (Join-ProjectPath "public/maskable-icon-512.png")
    Save-Png -Bitmap $ogImage -Path (Join-ProjectPath "public/og-image.png")
    Save-Png -Bitmap $thinkingMascot -Path (Join-ProjectPath "public/brand/mascot/mascot-thinking.png")
    Save-Png -Bitmap $celebratingMascot -Path (Join-ProjectPath "public/brand/mascot/mascot-celebrating.png")
    Save-Png -Bitmap $errorMascot -Path (Join-ProjectPath "public/brand/mascot/mascot-error.png")
    Save-Png -Bitmap $logoPng -Path (Join-ProjectPath "public/brand/logo/fazumi-logo.png")
    Save-Ico -Bitmap $faviconBitmap -Path (Join-ProjectPath "public/favicon.ico")
    Save-Ico -Bitmap $faviconBitmap -Path (Join-ProjectPath "app/favicon.ico")
  } finally {
    $appleTouch.Dispose()
    $icon192.Dispose()
    $icon512.Dispose()
    $faviconBitmap.Dispose()
    $maskable.Dispose()
    $ogImage.Dispose()
    $thinkingMascot.Dispose()
    $celebratingMascot.Dispose()
    $errorMascot.Dispose()
    $logoPng.Dispose()
  }
} finally {
  $logoSource.Dispose()
  $mascotWaving.Dispose()
  $mascotReading.Dispose()
}

Write-Output "Launch assets generated successfully."
