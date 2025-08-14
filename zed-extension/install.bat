@echo off
setlocal enabledelayedexpansion

REM MOJO Mustache Extension for Zed - Windows Installation Script
REM This script installs the MOJO Mustache language extension for Zed Editor

set "EXTENSION_ID=mojo-mustache"
set "EXTENSION_NAME=MOJO Mustache"

echo MOJO Mustache Extension Installer for Zed
echo ==========================================

REM Get the command (default to install)
set "COMMAND=%1"
if "%COMMAND%"=="" set "COMMAND=install"

REM Get Zed extensions directory
set "EXTENSIONS_DIR=%APPDATA%\Zed\extensions"
set "TARGET_DIR=%EXTENSIONS_DIR%\%EXTENSION_ID%"

REM Get script directory
set "SCRIPT_DIR=%~dp0"

goto %COMMAND% 2>nul || goto unknown_command

:install
echo [INFO] Installing %EXTENSION_NAME% extension...
echo [INFO] Target directory: %TARGET_DIR%

REM Check if Zed is installed
call :check_zed_installation

REM Create extensions directory if it doesn't exist
if not exist "%EXTENSIONS_DIR%" (
    echo [INFO] Creating Zed extensions directory: %EXTENSIONS_DIR%
    mkdir "%EXTENSIONS_DIR%"
)

REM Remove existing installation if it exists
if exist "%TARGET_DIR%" (
    echo [INFO] Removing existing installation...
    rmdir /s /q "%TARGET_DIR%"
)

REM Create target directory
mkdir "%TARGET_DIR%"
mkdir "%TARGET_DIR%\languages"
mkdir "%TARGET_DIR%\grammars"

REM Copy extension files
echo [INFO] Copying extension files...

copy "%SCRIPT_DIR%extension.json" "%TARGET_DIR%\extension.json" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to copy extension.json
    goto error_exit
)
echo [INFO] Copied: extension.json

copy "%SCRIPT_DIR%languages\mustache.json" "%TARGET_DIR%\languages\mustache.json" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to copy languages/mustache.json
    goto error_exit
)
echo [INFO] Copied: languages/mustache.json

copy "%SCRIPT_DIR%grammars\mustache.json" "%TARGET_DIR%\grammars\mustache.json" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to copy grammars/mustache.json
    goto error_exit
)
echo [INFO] Copied: grammars/mustache.json

copy "%SCRIPT_DIR%README.md" "%TARGET_DIR%\README.md" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to copy README.md
    goto error_exit
)
echo [INFO] Copied: README.md

call :verify_installation
if !errorlevel! equ 0 (
    echo.
    echo [SUCCESS] Installation complete!
    echo [INFO] Please restart Zed or reload the window to activate the extension.
    echo [INFO] The extension will provide syntax highlighting for .mst files.
) else (
    echo [ERROR] Installation verification failed
    goto error_exit
)

goto end

:uninstall
echo [INFO] Uninstalling %EXTENSION_NAME% extension...

if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
    echo [SUCCESS] Extension uninstalled successfully!
) else (
    echo [WARNING] Extension not found at: %TARGET_DIR%
)

goto end

:verify
call :verify_installation
if !errorlevel! equ 0 (
    echo Extension is properly installed.
) else (
    echo Extension is not installed or installation is corrupted.
    exit /b 1
)

goto end

:help
echo Usage: %0 [command]
echo.
echo Commands:
echo   install    Install the MOJO Mustache extension (default)
echo   uninstall  Remove the extension
echo   verify     Check if the extension is installed correctly
echo   help       Show this help message
echo.
echo Examples:
echo   %0              # Install the extension
echo   %0 install      # Install the extension
echo   %0 uninstall    # Remove the extension
echo   %0 verify       # Verify installation

goto end

:unknown_command
echo [ERROR] Unknown command: %1
echo [INFO] Use '%0 help' to see available commands
exit /b 1

:check_zed_installation
REM Check if Zed is in PATH
where zed >nul 2>&1
if !errorlevel! equ 0 (
    echo [SUCCESS] Zed editor found in PATH
    goto :eof
)

REM Check common Windows installation locations
set "ZED_PATHS[0]=%LOCALAPPDATA%\Programs\Zed\Zed.exe"
set "ZED_PATHS[1]=%PROGRAMFILES%\Zed\Zed.exe"
set "ZED_PATHS[2]=%PROGRAMFILES(X86)%\Zed\Zed.exe"

for /l %%i in (0,1,2) do (
    if exist "!ZED_PATHS[%%i]!" (
        echo [SUCCESS] Zed editor found at !ZED_PATHS[%%i]!
        goto :eof
    )
)

echo [WARNING] Zed editor not found. Please ensure Zed is installed.
echo [INFO] You can download Zed from: https://zed.dev
set /p "REPLY=Continue with installation anyway? (y/N): "
if /i not "!REPLY!"=="y" exit /b 1

goto :eof

:verify_installation
if exist "%TARGET_DIR%\extension.json" (
    echo [SUCCESS] Installation verified: extension.json found
    exit /b 0
) else (
    echo [ERROR] Installation verification failed: extension.json not found
    exit /b 1
)

:error_exit
echo [ERROR] Installation failed
exit /b 1

:end
endlocal
