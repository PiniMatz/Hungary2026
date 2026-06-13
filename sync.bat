@echo off
title Hungary 2026 Sync Helper
echo ====================================================
echo Hungary 2026: Pulling Kids Travel Ideas from Cloud...
echo ====================================================
echo.

:: Run git pull to fetch and merge cloud submissions
git pull origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to pull changes.
    echo Please make sure Git is installed and you have internet access.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo SUCCESS! New ideas and photos have been downloaded.
echo.
echo Google Drive Desktop will sync these files to the
echo cloud shortly. You can then open NotebookLM and
echo click "Sync" to update the travel notebook.
echo ====================================================
echo.
pause
