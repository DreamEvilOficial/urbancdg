'use client';

import { useEffect } from 'react';

/**
 * Componente de protección contra DevTools y console
 * Este componente detecta si las DevTools están abiertas y toma medidas
 */
export default function DevToolsProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // No aplicar protecciones en desarrollo
      return;
    }

    // ===== 1. DESHABILITAR CLICK DERECHO =====
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // ===== 2. DESHABILITAR TECLAS DE ACCESO RÁPIDO =====
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I (Abrir DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J (Consola)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }

      // Ctrl+U (Ver código fuente)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C (Inspeccionar elemento)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S (Guardar página)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // ===== 3. DETECTAR SI DEVTOOLS ESTÁ ABIERTO =====
    let devtoolsOpen = false;
    const threshold = 170;

    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          handleDevToolsOpened();
        }
      } else {
        devtoolsOpen = false;
      }
    };

    const handleDevToolsOpened = () => {
      // Notificar al servidor (opcional)
      try {
        fetch('/api/security/devtools-detected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        }).catch(() => {});
      } catch (error) {
        // Silencioso
      }

      // Recargar la página o redirigir
      // window.location.reload();
    };

    // ===== 4. PROTECCIÓN CONTRA DEBUGGER =====
    const debuggerProtection = () => {
      setInterval(() => {
        debugger; // Esto pausará si las DevTools están abiertas
      }, 1000);
    };

    // ===== 5. OFUSCAR CÓDIGO EN CONSOLA =====
    const obfuscateConsole = () => {
      const noop = () => {};
      const methods = [
        'log',
        'debug',
        'info',
        'warn',
        'error',
        'table',
        'trace',
        'dir',
        'dirxml',
        'group',
        'groupCollapsed',
        'groupEnd',
        'clear',
        'count',
        'countReset',
        'assert',
        'profile',
        'profileEnd',
        'time',
        'timeLog',
        'timeEnd',
        'timeStamp',
      ];

      methods.forEach((method) => {
        // @ts-ignore
        if (console[method]) {
          // @ts-ignore
          console[method] = noop;
        }
      });
    };

    // ===== 6. DETECTAR HERRAMIENTAS DE DEBUGGING =====
    const detectDebugger = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();

      if (end - start > 100) {
        handleDevToolsOpened();
      }
    };

    // ===== 7. PREVENIR SELECCIÓN DE TEXTO =====
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // ===== 8. DETECTAR HERRAMIENTAS DE SCRAPING =====
    const detectAutomation = () => {
      // @ts-ignore
      if (navigator.webdriver) {
        console.warn('Automation detected');
        // Tomar acción si se detecta automatización
      }
    };

    // Aplicar protecciones
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('copy', preventSelection);

    // Ejecutar detecciones
    const detectInterval = setInterval(detectDevTools, 1000);
    const debugInterval = setInterval(detectDebugger, 5000);

    // Aplicar ofuscación de consola
    obfuscateConsole();

    // Aplicar debugger protection
    debuggerProtection();

    // Detectar automatización
    detectAutomation();

    // ===== 9. WATERMARK INVISIBLE =====
    const addInvisibleWatermark = () => {
      const watermark = document.createElement('div');
      watermark.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
      `;
      watermark.setAttribute('data-owner', 'URBAN-CDG-PROTECTED');
      watermark.setAttribute('data-timestamp', new Date().toISOString());
      document.body.appendChild(watermark);
    };

    addInvisibleWatermark();

    // ===== 10. DETECCIÓN DE CAMBIOS EN DOM =====
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Detectar si se están eliminando scripts de protección
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const element = node as Element;
              if (element.hasAttribute('data-protection')) {
                // Restaurar protección
                console.warn('Protection bypass attempt detected');
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('copy', preventSelection);
      clearInterval(detectInterval);
      clearInterval(debugInterval);
      observer.disconnect();
    };
  }, []);

  // Este componente no renderiza nada visible
  return null;
}
