#!/bin/bash
# Script robusto para mantener Next.js corriendo en puerto 3000

echo "🚀 Iniciando servidor Next.js de Levit de forma robusta..."

# Terminar cualquier proceso en el puerto 3000
echo "🔧 Liberando puerto 3000..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# Limpiar cache si es necesario
if [ "$1" == "clean" ]; then
    echo "🧹 Limpiando cache..."
    rm -rf .next
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    exit 1
fi

echo "✅ Iniciando Next.js (Levit) en puerto 3000..."

# Usar nohup para mantener el proceso corriendo
nohup npm run dev > server.log 2>&1 &
SERVER_PID=$!

echo "📋 Servidor iniciado con PID: $SERVER_PID"
echo "📄 Logs disponibles en: server.log"
echo "🌐 Aplicación disponible en: http://localhost:3000"

# Esperar un momento y verificar que el servidor esté corriendo
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ Error: El servidor falló al iniciar"
    cat server.log
    exit 1
fi

echo "🔥 Para detener el servidor: kill $SERVER_PID"
echo "📊 Para ver logs en tiempo real: tail -f server.log"