Copy-Item .\src\server.js .\src\server.js.bak -Force
Get-Clipboard | Set-Content -Path .\src\server.js -Encoding UTF8

