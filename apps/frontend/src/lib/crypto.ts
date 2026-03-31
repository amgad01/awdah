/**
 * Secure encryption utility using the Web Crypto API.
 * This implementation uses AES-GCM for authenticated encryption.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;
const HASH = 'SHA-256';

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    KEY_ALGORITHM,
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: KEY_ALGORITHM,
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: HASH,
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts a string using a password-derived key.
 * Returns a base64 string containing [salt(16b)][iv(12b)][ciphertext].
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    data,
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string using a password-derived key.
 */
export async function decrypt(encryptedBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
