import { concat, randomBytes } from './bytes.js';

function requireSubtle() {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto indisponible. Ouvrez cette application en HTTPS ou sur localhost pour utiliser crypto.subtle.');
}
export async function deriveAesKey(K) {
  requireSubtle();
  const material = await crypto.subtle.importKey('raw', K, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32),
    info: new TextEncoder().encode('ML-KEM-Lab AES-256-GCM'),
  }, material, 256);
  return new Uint8Array(bits);
}
export async function aesEncrypt(keyBytes, text) {
  requireSubtle();
  const iv = randomBytes(12);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, new TextEncoder().encode(text)));
  return { iv, ciphertext: encrypted.slice(0, -16), tag: encrypted.slice(-16), combined: encrypted };
}
export async function aesDecrypt(keyBytes, iv, ciphertext, tag) {
  requireSubtle();
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, concat(ciphertext, tag));
    return new TextDecoder().decode(plaintext);
  } catch { throw new Error('Échec du déchiffrement'); }
}
