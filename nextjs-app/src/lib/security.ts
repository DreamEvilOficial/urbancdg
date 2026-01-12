import crypto from 'crypto';

// Use a consistent secret or fallback. In production, this MUST be in .env
// This key handles the requirement for "AES-256" encryption of sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'urban-cdg-secure-key-256-bit-v1'; 
const IV_LENGTH = 16; // AES block size

// Helper to ensure key is correct length (32 bytes for AES-256)
function getKey(): Buffer {
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
}

/**
 * Cifra un texto usando AES-256-CBC
 * @param text Texto plano a cifrar
 * @returns Texto cifrado en formato IV:Encrypted (Hex)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key as any, iv as any);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()] as any);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    // En caso de error, devolvemos el original o lanzamos error según criticidad
    // Para seguridad, mejor fallar que guardar plano
    throw new Error('Encryption failed');
  }
}

/**
 * Descifra un texto cifrado con encrypt()
 * @param text Texto cifrado (IV:Encrypted)
 * @returns Texto plano
 */
export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const ivString = textParts.shift();
    if (!ivString) throw new Error('Invalid IV');
    
    const iv = Buffer.from(ivString, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getKey();
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key as any, iv as any);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()] as any);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return text; // Return original if fail (might be already plain)
  }
}

/**
 * Sanitiza entradas de usuario para prevenir XSS y Script Injection
 * Modo estricto: Elimina TODAS las etiquetas HTML
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "") // Eliminar scripts
    .replace(/<[^>]+>/g, '') // Eliminar tags HTML (strip tags)
    .replace(/javascript:/gi, '') // Eliminar protocolo javascript
    .replace(/on\w+=/gi, '') // Eliminar eventos (onclick, etc)
    .trim();
}

/**
 * Sanitiza texto enriquecido (permite HTML seguro, elimina scripts/eventos)
 */
export function sanitizeRichText(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "") // Eliminar scripts
    .replace(/javascript:/gi, '') // Eliminar protocolo javascript
    .replace(/on\w+=/gi, '') // Eliminar eventos (onclick, etc)
    .trim();
}

/**
 * Sanitiza URLs para evitar javascript: y otros protocolos peligrosos
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) return '#';
  if (trimmed.toLowerCase().startsWith('data:')) return '#';
  if (trimmed.toLowerCase().startsWith('vbscript:')) return '#';
  return trimmed;
}

/**
 * Valida inputs contra patrones comunes de ataque
 */
export function validateSecurityInput(input: string): { valid: boolean; error?: string } {
  // SQL Injection basics (aunque usamos query params, esto ayuda)
  if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i.test(input)) {
    return { valid: false, error: 'SQL Keywords detected' };
  }
  
  // XSS basics
  if (/[<>]/.test(input)) {
    return { valid: false, error: 'HTML Tags detected' };
  }

  return { valid: true };
}
