# This script prepares the extension files for packaging by copying them into a 'build' directory.

# Create the build directory if it doesn't exist, and clear it if it does.
if (-not (Test-Path -Path "build" -PathType Container)) {
    New-Item -ItemType Directory -Path "build"
} else {
    Remove-Item -Recurse -Force -Path "build/*"
}

# List of files and directories to be included in the package.
$packageFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "feather.min.js",
    "icons",
    "panel.html",
    "panel.js",
    "panel-styles.css",
    "panel-icons.js",
    "popup.html",
    "popup.js",
    "settings.html",
    "settings.js",
    "storage.js",
    "styles.css",
    "utils.js"
)

# Copy the files and directories to the build directory.
foreach ($file in $packageFiles) {
    Copy-Item -Path $file -Destination "build/" -Recurse
}

Write-Host "Extension files have been copied to the 'build' directory." 