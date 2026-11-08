export interface KeyPair {
  ek: Uint8Array;
  dk: Uint8Array;
  d: Uint8Array;
  z: Uint8Array;
  rho: Uint8Array;
  sigma: Uint8Array;
  h: Uint8Array;
}
export interface Encapsulation {
  c: Uint8Array;
  K: Uint8Array;
  m: Uint8Array;
  h: Uint8Array;
  r: Uint8Array;
  c1: Uint8Array;
  c2: Uint8Array;
}
export interface Decapsulation {
  Kprime: Uint8Array;
  kbar: Uint8Array;
  accepted: boolean;
  parts: { dkPke: Uint8Array; ek: Uint8Array; h: Uint8Array; z: Uint8Array };
}
export function keyGen(paramSet: string): KeyPair;
export function encaps(paramSet: string, ek: Uint8Array): Encapsulation;
export function decaps(paramSet: string, dk: Uint8Array, c: Uint8Array, z: Uint8Array, expected?: Uint8Array): Decapsulation;
