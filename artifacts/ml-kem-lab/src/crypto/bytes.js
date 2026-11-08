export const concat = (...items) => {
  const arrays = items.map((x) => x instanceof Uint8Array ? x : new Uint8Array(x));
  const result = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  arrays.forEach((a) => { result.set(a, offset); offset += a.length; });
  return result;
};
export const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const same = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};
export function randomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('crypto');
  return crypto.getRandomValues(new Uint8Array(length));
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed'; area.style.opacity = '0'; area.setAttribute('readonly', '');
    document.body.appendChild(area); area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}
