@echo off
setlocal

rem & "\\wsl.localhost\Ubuntu-26.04\root\github\tabby-sftp-xp\start-tabby-dev.cmd"
rem Development plugins must be supplied through TABBY_PLUGINS. Do not create
rem links inside data\plugins\node_modules because Tabby's plugin manager owns it.
set "TABBY_PLUGINS=\\wsl.localhost\Ubuntu-26.04\root\github\tabby-sftp-xp"

start "" "D:\Software\tabby-portable-x64\Tabby.exe" --debug
