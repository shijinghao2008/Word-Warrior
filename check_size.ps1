$path = "c:\Users\isaac\Documents\wordwarrior\Word-Warrior\public\assets\ui\menu_panel.png"
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($path)
Write-Output "Width: $($img.Width) Height: $($img.Height)"
$img.Dispose()
