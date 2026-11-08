# ML-KEM Lab

Application pédagogique en français : toutes les opérations sont exécutées localement dans le navigateur. Aucune clé, aucun secret ni ciphertext n'est envoyé à un service.

## Dépendances cryptographiques

- `@noble/post-quantum` fournit les primitives ML-KEM conformes à FIPS 203 (512, 768 et 1024). Le projet n'implémente pas ML-KEM.
- `@noble/hashes` fournit SHA3-256, SHA3-512 et SHAKE256 pour les contrôles et valeurs intermédiaires affichés.
- Web Crypto (`crypto.subtle`) fournit HKDF-SHA-256 et AES-256-GCM. L'application affiche une erreur explicite lorsque `crypto.subtle` est indisponible.

Les graines et autres valeurs aléatoires viennent de `crypto.getRandomValues`. L'état de simulation reste en mémoire et le bouton Recommencer efface les tableaux d'octets des secrets.

## Commandes

- `npm run dev` : développement Vite
- `npm run build` : build statique vers `dist/public`
- `npm test` : tests Vitest du moteur ML-KEM

Outil pédagogique : ne protège pas de vraies communications.
