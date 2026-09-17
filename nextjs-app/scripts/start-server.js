#!/usr/bin/env node
/**
 * Arrancador de servidor multiplataforma (Windows, macOS, Linux).
 * Libera el puerto 3000 si está ocupado, limpia el cache si se pide
 * y levanta "next dev".
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const isWindows = process.platform === 'win32';
const shouldClean = process.argv.includes('clean');

function freePort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      output.split('\n').forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      });
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`🔧 Proceso ${pid} liberado del puerto ${port}`);
        } catch (e) {}
      });
    } else {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { shell: '/bin/sh' });
    }
  } catch (e) {
    // Si no hay nada corriendo en el puerto, no hay nada que liberar.
  }
}

console.log('🚀 Iniciando servidor Levit...');
console.log(`🔧 Liberando puerto ${PORT}...`);
freePort(PORT);

if (shouldClean) {
  console.log('🧹 Limpiando cache (.next)...');
  fs.rmSync(path.join(__dirname, '..', '.next'), { recursive: true, force: true });
}

console.log(`✅ Iniciando Next.js en el puerto ${PORT}...`);

const child = spawn(
  'npm',
  ['run', 'dev'],
  { stdio: 'inherit', cwd: path.join(__dirname, '..'), shell: isWindows }
);

child.on('exit', (code) => process.exit(code ?? 0));
