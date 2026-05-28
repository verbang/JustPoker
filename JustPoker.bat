@echo off
start "" powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0service-manager.ps1"
exit
