
param (
    [string]$inputPath,
    [string]$outputPath
)

Add-Type -AssemblyName System.Drawing

if (-not $inputPath -or -not $outputPath) {
    Write-Error "Please provide both -inputPath and -outputPath arguments."
    exit 1
}

Write-Host "Processing $inputPath..."

if (-not (Test-Path $inputPath)) {
    Write-Error "Input file not found: $inputPath"
    exit 1
}

try {
    # Load image safely
    $originalImage = [System.Drawing.Image]::FromFile($inputPath)
    $bmp = New-Object System.Drawing.Bitmap($originalImage.Width, $originalImage.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Draw original to new bitmap
    $graphics.DrawImage($originalImage, 0, 0, $originalImage.Width, $originalImage.Height)
    $graphics.Dispose()
    $originalImage.Dispose() # Release file lock

    # Iterate pixels to replace black with transparent
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            $pixel = $bmp.GetPixel($x, $y)
            
            # Check for black or near-black pixels
            # R, G, B < 15 is a safe threshold for "pure" black artifacts in JPG
            if ($pixel.R -lt 15 -and $pixel.G -lt 15 -and $pixel.B -lt 15) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            }
        }
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Successfully converted to transparent PNG: $outputPath"
} catch {
    Write-Error "An error occurred: $_"
    exit 1
}
