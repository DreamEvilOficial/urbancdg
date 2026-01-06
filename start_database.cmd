@echo off
setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ========================================
echo   URBAN CDG - Inicializar Base de Datos
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :missingNode

if not exist "node_modules" goto :installDeps
goto :depsReady

:installDeps
echo Instalando dependencias de Node (una sola vez)...
call npm install
if errorlevel 1 goto :npmFail

:depsReady
echo Ejecutando migraciones de base de datos...
node scripts\init-sqlite.js
if errorlevel 1 goto :migrationFail

echo.
echo Base de datos lista. Puedes cerrar esta ventana.
echo.
pause
exit /b 0

:missingNode
echo No se encontro Node.js en el PATH. Instala Node 18 o superior e intentalo nuevamente.
pause
exit /b 1

:npmFail
echo Ocurrio un error instalando dependencias.
pause
exit /b 1

:migrationFail
echo No se pudo preparar la base de datos. Revisa los mensajes anteriores.
pause
exit /b 1
