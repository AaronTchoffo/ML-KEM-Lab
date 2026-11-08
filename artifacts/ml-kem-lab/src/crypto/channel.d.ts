export interface EncryptedMessage {
  iv: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
  combined: Uint8Array;
}
export function deriveAesKey(K: Uint8Array): Promise<Uint8Array>;
export function aesEncrypt(keyBytes: Uint8Array, text: string): Promise<EncryptedMessage>;
export function aesDecrypt(keyBytes: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array): Promise<string>;
