export const PARAMS = {
  'ML-KEM-512': { name: 'ML-KEM-512', k: 2, du: 10, dv: 4, ek: 800, dk: 1632, c: 768, K: 32, nist: 1 },
  'ML-KEM-768': { name: 'ML-KEM-768', k: 3, du: 10, dv: 4, ek: 1184, dk: 2400, c: 1088, K: 32, nist: 3 },
  'ML-KEM-1024': { name: 'ML-KEM-1024', k: 4, du: 11, dv: 5, ek: 1568, dk: 3168, c: 1568, K: 32, nist: 5 },
};
export const STEPS = ['Accueil', 'Paramètres', 'alice-keygen', 'transfer-ek', 'oscar-sk', 'bob-encaps', 'transfer-ct', 'oscar-ss', 'alice-decaps', 'aes-demo'];
export const PARAM_KEYS = Object.keys(PARAMS);
