@echo off
rem terra.pura launcher for Windows: double-click this file.
rem It uses the files in this folder (no download) and asks how you want to run terra.pura.
title terra.pura
set "TP_SOURCE=%~dp0"
set "TP_SOURCE=%TP_SOURCE:~0,-1%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
