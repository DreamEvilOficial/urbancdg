@echo off
echo ========================================
echo  LEVIT - Servidor de Desarrollo
echo ========================================
echo.

cd nextjs-app

if not exist node_modules (
    echo Instalando dependencias, esto puede tardar unos minutos...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

echo.
echo Iniciando servidor en http://localhost:3000
echo.
echo Panel Admin: http://localhost:3000/panel
echo.
echo Presiona Ctrl+C para detener el servidor
echo ========================================
echo.

call npm run dev
