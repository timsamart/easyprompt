param(
    [Parameter(Mandatory=$true)]
    [string]$SourceImage,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDirectory = (Split-Path -Parent $SourceImage),
    
    [Parameter(Mandatory=$false)]
    [int[]]$Sizes = @(16, 32, 64, 128, 256, 512)
)

# Check if the source image exists
if (-not (Test-Path $SourceImage)) {
    Write-Error "Source image not found: $SourceImage"
    exit 1
}

# Ensure output directory exists
if (-not (Test-Path $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
    Write-Host "Created output directory: $OutputDirectory"
}

# Load System.Drawing assembly for image manipulation
Add-Type -AssemblyName System.Drawing

try {
    # Load the source image
    $sourceFileName = [System.IO.Path]::GetFileNameWithoutExtension($SourceImage)
    $img = [System.Drawing.Image]::FromFile($SourceImage)
    
    foreach ($size in $Sizes) {
        # Create a new bitmap with the specified size
        $newImg = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        
        # Set high quality scaling
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw the source image on the new canvas
        $graphics.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
        
        # Generate output path
        $outputPath = Join-Path $OutputDirectory "$sourceFileName-$($size)x$($size).png"
        
        # Save the resized image
        $newImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        Write-Host "Created: $outputPath"
        
        # Clean up resources
        $graphics.Dispose()
        $newImg.Dispose()
    }
    
    Write-Host "All images resized successfully!"
}
catch {
    Write-Error "An error occurred: $_"
}
finally {
    # Always dispose the source image
    if ($img) { $img.Dispose() }
}