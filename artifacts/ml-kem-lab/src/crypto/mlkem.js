import { ml_kem512, ml_kem768, ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { sha3_256, sha3_512, shake256 } from '@noble/hashes/sha3.js';
import { concat, randomBytes, same } from './bytes.js';
import { PARAMS } from './params.js';

const implementations = { 'ML-KEM-512': ml_kem512, 'ML-KEM-768': ml_kem768, 'ML-KEM-1024': ml_kem1024 };
function checkSizes(paramSet, ek, dk) {
  const p = PARAMS[paramSet];
  if (ek.length !== p.ek || dk.length !== p.dk) throw new Error('Une vérification interne a échoué, relancez la simulation');
}
export function keyGen(paramSet) {
  const p = PARAMS[paramSet];
  const d = randomBytes(32);
  const z = randomBytes(32);
  const { publicKey: ek, secretKey: dk } = implementations[paramSet].keygen(concat(d, z));
  checkSizes(paramSet, ek, dk);
  const derived = sha3_512(concat(d, new Uint8Array([p.k])));
  const rho = derived.slice(0, 32);
  const sigma = derived.slice(32);
  const h = sha3_256(ek);
  if (!same(ek.slice(-32), rho) || !same(dk.slice(p.dk - 64, p.dk - 32), h) || !same(dk.slice(-32), z)) {
    throw new Error('Une vérification interne a échoué, relancez la simulation');
  }
  return { ek, dk, d, z, rho, sigma, h };
}
export function encaps(paramSet, ek) {
  const m = randomBytes(32);
  const h = sha3_256(ek);
  const { cipherText: c, sharedSecret: K } = implementations[paramSet].encapsulate(ek, m);
  const kr = sha3_512(concat(m, h));
  const derivedK = kr.slice(0, 32);
  if (!same(derivedK, K)) throw new Error('Une vérification interne a échoué, relancez la simulation');
  const p = PARAMS[paramSet];
  if (c.length !== p.c || K.length !== 32) throw new Error('Une vérification interne a échoué, relancez la simulation');
  const cut = 32 * p.du * p.k;
  return { c, K, m, h, r: kr.slice(32), c1: c.slice(0, cut), c2: c.slice(cut) };
}
export function decaps(paramSet, dk, c, z, expected) {
  const Kprime = implementations[paramSet].decapsulate(c, dk);
  const kbar = shake256(concat(z, c), { dkLen: 32 });
  const accepted = expected ? same(Kprime, expected) : !same(Kprime, kbar);
  const p = PARAMS[paramSet];
  const ekStart = 384 * p.k;
  return {
    Kprime,
    kbar,
    accepted,
    parts: {
      dkPke: dk.slice(0, ekStart),
      ek: dk.slice(ekStart, 768 * p.k + 32),
      h: dk.slice(768 * p.k + 32, 768 * p.k + 64),
      z: dk.slice(768 * p.k + 64, 768 * p.k + 96),
    },
  };
}
