import { describe, expect, it } from 'vitest';
import { PARAMS, PARAM_KEYS } from './params.js';
import { concat, same } from './bytes.js';
import { decaps, encaps, keyGen } from './mlkem.js';
import { sha3_256, sha3_512, shake256 } from '@noble/hashes/sha3.js';

describe('ML-KEM · paramètres, cohérence et rejet implicite', () => {
  for (const name of PARAM_KEYS) {
    it(`${name} produit des tailles conformes et réussit 50 aller-retours`, () => {
      const p = PARAMS[name];
      for (let i = 0; i < 50; i += 1) {
        const pair = keyGen(name);
        const encapsulated = encaps(name, pair.ek);
        const recovered = decaps(name, pair.dk, encapsulated.c, pair.z, encapsulated.K);
        expect(pair.ek.length).toBe(p.ek);
        expect(pair.dk.length).toBe(p.dk);
        expect(encapsulated.c.length).toBe(p.c);
        expect(encapsulated.K.length).toBe(p.K);
        expect(same(encapsulated.K, recovered.Kprime)).toBe(true);
      }
    });

    it(`${name} respecte les composants et contrôles dérivés`, () => {
      const p = PARAMS[name];
      const pair = keyGen(name);
      const encapsulated = encaps(name, pair.ek);
      const pkeLength = 384 * p.k;
      expect(same(pair.dk.slice(pkeLength, pkeLength + p.ek), pair.ek)).toBe(true);
      expect(same(pair.dk.slice(768 * p.k + 32, 768 * p.k + 64), sha3_256(pair.ek))).toBe(true);
      expect(same(pair.dk.slice(-32), pair.z)).toBe(true);
      expect(same(pair.ek.slice(-32), sha3_512(concat(pair.d, new Uint8Array([p.k]))).slice(0, 32))).toBe(true);
      expect(same(sha3_512(concat(encapsulated.m, sha3_256(pair.ek))).slice(0, 32), encapsulated.K)).toBe(true);
    });

    it(`${name} applique le rejet implicite sans erreur sur un ciphertext altéré`, () => {
      const pair = keyGen(name);
      const encapsulated = encaps(name, pair.ek);
      const altered = encapsulated.c.slice();
      altered[0] ^= 1;
      const rejected = decaps(name, pair.dk, altered, pair.z, encapsulated.K);
      expect(rejected.accepted).toBe(false);
      expect(same(rejected.Kprime, encapsulated.K)).toBe(false);
      expect(same(rejected.Kprime, shake256(concat(pair.z, altered), { dkLen: 32 }))).toBe(true);
    });
  }
});
