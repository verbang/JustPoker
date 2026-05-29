@echo off
chcp 65001 >nul 2>&1
title JustPoker - Environment Switch

:menu
cls
echo.
echo  ================================
echo    JustPoker Environment Switch
echo  ================================
echo.
echo    1. Local   (localhost:3000)
echo    2. Prod    (justpoker-api.onrender.com)
echo    3. Show current status
echo    0. Exit
echo.
set /p choice="  Select: "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto prod
if "%choice%"=="3" goto status
if "%choice%"=="0" goto end
echo.
echo  Invalid choice, try again.
timeout /t 2 >nul
goto menu

:local
powershell -ExecutionPolicy Bypass -File "%~dp0switch-env.ps1" local
pause
goto menu

:prod
powershell -ExecutionPolicy Bypass -File "%~dp0switch-env.ps1" prod
pause
goto menu

:status
powershell -ExecutionPolicy Bypass -File "%~dp0switch-env.ps1"
pause
goto menu

:end
exit
