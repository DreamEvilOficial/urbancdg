# 🔒 GUÍA DE IMPLEMENTACIÓN DE SEGURIDAD Y OPTIMIZACIÓN

# URBAN CDG - Tienda de Ropa

## 📋 RESUMEN

Esta implementación incluye dos componentes principales:

1. **🔐 SEGURIDAD Y OFUSCACIÓN**

   - Ofuscación de código JavaScript
   - Protección contra DevTools
   - Headers de seguridad avanzados
   - Middleware de protección
   - Encriptación de datos sensibles

2. **⚡ OPTIMIZACIÓN DE RENDIMIENTO**
   - Sistema de caché inteligente
   - Revalidación automática
   - Server Actions optimizadas
   - Code splitting avanzado

---

## 🚀 PASO 1: CONFIGURAR VARIABLES DE ENTORNO

### 1.1 Copiar `.env.example` a `.env.local`

```bash
cp .env.example .env.local
```

### 1.2 Generar claves secretas

```bash
# Para WEBHOOK_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Para REVALIDATE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Para ENCRYPTION_PASSWORD (usar una frase larga y compleja)
```

### 1.3 Actualizar `.env.local` con los valores generados

```env
WEBHOOK_SECRET=tu-clave-generada-aqui
REVALIDATE_SECRET=tu-otra-clave-generada-aqui
ENCRYPTION_PASSWORD=tu-password-super-seguro-aqui
NEXT_PUBLIC_DOMAIN_LOCK=levit.vercel.app,www.levit.com
NODE_ENV=production
```

---

## 🔧 PASO 2: ACTIVAR LA CONFIGURACIÓN DE SEGURIDAD

### 2.1 Reemplazar `next.config.js` actual

```bash
# Hacer backup del archivo actual
cp next.config.js next.config.js.backup

# Usar la nueva configuración con seguridad
cp next.config.security.js next.config.js
```

### 2.2 Verificar que todo compile correctamente

```bash
npm run build
```

---

## 🛡️ PASO 3: INTEGRAR PROTECCIÓN CONTRA DEVTOOLS

### 3.1 Agregar el componente a tu layout principal

Edita `src/app/layout.tsx` y agrega:

```tsx
import DevToolsProtection from "@/components/DevToolsProtection";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {process.env.NODE_ENV === "production" && <DevToolsProtection />}
        {children}
      </body>
    </html>
  );
}
```

---

## ⚡ PASO 4: ACTIVAR APIS OPTIMIZADAS

### 4.1 Reemplazar API de productos

```bash
# Backup del archivo actual
cp src/app/api/products/route.ts src/app/api/products/route.backup.ts

# Usar la versión optimizada
cp src/app/api/products/route.optimized.ts src/app/api/products/route.ts
```

### 4.2 Verificar que las APIs funcionan

```bash
npm run dev
# Probar: http://localhost:3000/api/products
```

---

## 🔄 PASO 5: CONFIGURAR WEBHOOKS DE SUPABASE (Opcional pero Recomendado)

### 5.1 Ir al panel de Supabase

1. Ve a tu proyecto en Supabase
2. Database → Webhooks → Create a new hook

### 5.2 Configurar webhook para tabla `productos`

- **Name**: Revalidate Products
- **Table**: productos
- **Events**: INSERT, UPDATE, DELETE
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://tu-dominio.vercel.app/api/revalidate`
- **HTTP Headers**:
  ```
  Authorization: Bearer TU_WEBHOOK_SECRET
  Content-Type: application/json
  ```

### 5.3 Repetir para tabla `categorias`

Misma configuración pero para la tabla `categorias`.

---

## 📊 PASO 6: INTEGRAR SERVER ACTIONS EN EL ADMIN

### 6.1 Actualizar componentes del admin

En tus componentes del panel admin, reemplaza las llamadas API tradicionales con Server Actions:

**Antes:**

```tsx
const createProduct = async (data) => {
  const res = await fetch("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  // Recargar manualmente
  router.refresh();
};
```

**Después:**

```tsx
import { createProduct } from "@/app/admin/actions";

const handleCreate = async (formData: FormData) => {
  const result = await createProduct(formData);
  if (result.success) {
    // La página se revalida automáticamente
    toast.success("Producto creado");
  }
};
```

---

## 🔐 PASO 7: USAR ENCRIPTACIÓN PARA DATOS SENSIBLES

### 7.1 Importar las utilidades de encriptación

```tsx
import {
  encryptData,
  decryptData,
  setSecureStorage,
  getSecureStorage,
} from "@/lib/security/encryption";
```

### 7.2 Ejemplo de uso

```tsx
// Encriptar datos antes de guardar
const sensitiveData = { creditCard: "1234-5678-9012-3456" };
const encrypted = await encryptData(
  JSON.stringify(sensitiveData),
  "mi-password-seguro"
);
localStorage.setItem("payment", encrypted);

// Desencriptar al leer
const encrypted = localStorage.getItem("payment");
const decrypted = await decryptData(encrypted, "mi-password-seguro");
const data = JSON.parse(decrypted);
```

---

## 🧪 PASO 8: TESTING Y VALIDACIÓN

### 8.1 Verificar ofuscación de código

1. Hacer build de producción:

   ```bash
   npm run build
   ```

2. Iniciar en modo producción:

   ```bash
   npm start
   ```

3. Abrir DevTools y verificar:
   - El código JavaScript debe verse ofuscado
   - La consola debe estar deshabilitada
   - F12 debe estar bloqueado

### 8.2 Verificar headers de seguridad

Usar herramientas como:

- https://securityheaders.com
- https://observatory.mozilla.org

### 8.3 Verificar rendimiento

1. Probar actualizaciones desde el admin
2. Verificar que las páginas se revalidan automáticamente
3. Revisar los headers de caché en las respuestas

---

## 🚢 PASO 9: DESPLIEGUE EN VERCEL

### 9.1 Configurar variables de entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agregar todas las variables del `.env.local`

### 9.2 Configurar dominios permitidos

En las variables de entorno de Vercel:

```
NEXT_PUBLIC_DOMAIN_LOCK=tudominio.vercel.app,www.tudominio.com
```

### 9.3 Deploy

```bash
git add .
git commit -m "feat: add security and optimization"
git push origin main
```

Vercel detectará el push y hará el deploy automáticamente.

---

## 📈 PASO 10: MONITOREAR Y MANTENER

### 10.1 Revisar logs de seguridad

Los intentos de acceso a DevTools se registran en:

- Console logs del servidor
- Opcional: Configurar tabla `security_logs` en Supabase

### 10.2 Invalidar caché manualmente (si es necesario)

```bash
# Revalidar todo
curl "https://tudominio.com/api/revalidate?secret=TU_REVALIDATE_SECRET"

# Revalidar path específico
curl "https://tudominio.com/api/revalidate?secret=TU_REVALIDATE_SECRET&path=/productos"

# Revalidar tag específico
curl "https://tudominio.com/api/revalidate?secret=TU_REVALIDATE_SECRET&tag=products"
```

### 10.3 Actualizar dependencias regularmente

```bash
npm audit
npm audit fix
npm update
```

---

## ⚠️ NOTAS IMPORTANTES

### Seguridad

1. **NUNCA** commitear `.env.local` al repositorio
2. Rotar las claves secretas periódicamente
3. Monitorear logs de seguridad
4. Mantener Next.js actualizado

### Rendimiento

1. El caché se invalida automáticamente con los cambios
2. Puedes ajustar el TTL del caché en `route.optimized.ts`
3. Para sitios con mucho tráfico, considerar usar Redis

### Ofuscación

1. Solo se aplica en producción (`NODE_ENV=production`)
2. Puede aumentar el tamaño del bundle
3. Puede ralentizar ligeramente el tiempo de build

---

## 🆘 TROUBLESHOOTING

### "Build failed" después de implementar

1. Verificar que todas las dependencias estén instaladas
2. Revisar errores de TypeScript
3. Verificar que las rutas de import sean correctas

### Las actualizaciones no se reflejan inmediatamente

1. Verificar que los webhooks de Supabase estén configurados
2. Revisar logs del endpoint `/api/revalidate`
3. Invalidar caché manualmente

### DevTools sigue funcionando

1. Verificar que `NODE_ENV=production`
2. Verificar que el componente `DevToolsProtection` esté importado
3. Hacer hard refresh (Ctrl+Shift+R)

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisar los logs del servidor
2. Verificar la configuración de variables de entorno
3. Probar en modo desarrollo primero (`npm run dev`)

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno configuradas
- [ ] `next.config.js` actualizado
- [ ] `DevToolsProtection` integrado
- [ ] APIs optimizadas implementadas
- [ ] Webhooks de Supabase configurados
- [ ] Server Actions integradas en admin
- [ ] Build de producción exitoso
- [ ] Headers de seguridad verificados
- [ ] Deploy en Vercel completado
- [ ] Pruebas de seguridad realizadas
- [ ] Pruebas de rendimiento realizadas

---

**¡Tu tienda ahora está optimizada y protegida! 🎉**
