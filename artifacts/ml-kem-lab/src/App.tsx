import { useEffect, useMemo, useState } from 'react';
import { PARAMS, PARAM_KEYS } from './crypto/params.js';
import { concat, copyText, hex, same } from './crypto/bytes.js';
import { keyGen, encaps, decaps } from './crypto/mlkem.js';
import { aesDecrypt, aesEncrypt, deriveAesKey } from './crypto/channel.js';
import './index.css';

const stages = [
  { label: 'Clés', at: 2 }, { label: 'Encapsulation', at: 5 },
  { label: 'Décapsulation', at: 8 }, { label: 'Canal chiffré', at: 9 },
];
const messages = {
  alice: "Vous êtes dans la peau d'Alice. Vous souhaitez établir une communication sécurisée avec Bob. Pour commencer, vous allez générer votre paire de clés grâce à ML-KEM.",
  oscarKey: "Vous êtes maintenant dans la peau d'Oscar. Vous avez intercepté la clé publique d'Alice. Votre objectif est de retrouver sa clé privée afin de compromettre leurs futures communications.",
  bob: "Vous êtes maintenant dans la peau de Bob. Vous avez reçu la clé publique d'Alice. Vous allez l'utiliser pour générer un secret partagé que seule Alice pourra retrouver grâce à sa clé privée.",
  oscarSecret: "Vous êtes de nouveau dans la peau d'Oscar. Vous avez intercepté le ciphertext envoyé par Bob. Vous connaissez également la clé publique d'Alice. Votre objectif est maintenant de retrouver le secret partagé.",
  aliceBack: "Vous êtes de retour dans la peau d'Alice. Bob vous a envoyé le ciphertext. Vous allez maintenant utiliser votre clé privée pour retrouver le secret partagé.",
};
const safeError = 'Une vérification interne a échoué, relancez la simulation';

function Character({ name, dashed = false }: { name: string; dashed?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photoUrls: Record<string, string> = {
    Alice: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alice%20la%20fille-YqNiJb7KBtY2okt0QPEMMGTN7p7b9c.jpg',
    Bob: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bob-DsCQV4oq49ggOmYvX0v48SeXaqFqMj.jpg',
    Oscar: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/oscar-UEj0j6vt9sIbGUbbsBHUcRkfHcgkqZ.jpg',
  };
  return <div className="character">
    {failed ? <div className={`initial ${dashed ? 'oscar' : ''}`}>{name[0]}</div> :
      <img className={`portrait ${dashed ? 'oscar' : ''}`} src={photoUrls[name]} alt={`Portrait de ${name}`} onError={() => setFailed(true)} />}
    <strong>{name}</strong>
  </div>;
}

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const click = async () => { setDone(await copyText(value)); window.setTimeout(() => setDone(false), 1500); };
  return <button className="text-button" data-testid="button-copy-value" onClick={click}>{done ? 'Copié' : 'Copier'}</button>;
}

function DataCard({ title, value, secret = false, bytes }: { title: string; value: Uint8Array; secret?: boolean; bytes?: number }) {
  const [expanded, setExpanded] = useState(false);
  const text = hex(value);
  const preview = text.length > 88 ? `${text.slice(0, 88)}…` : text;
  return <article className="card" data-testid={`data-${title.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="data-title"><h3>{title}</h3><span className={`badge ${secret ? 'private' : ''}`}>{secret && <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}{secret ? 'Doit rester confidentielle' : 'Peut être transmise'}</span></div>
    <p className="muted">{bytes ?? value.length} octets</p>
    <div className="data-preview hex">{expanded ? text : preview}</div>
    <button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Réduire' : 'Afficher tout'}</button>
    <Copy value={text} />
  </article>;
}

function Value({ label, value }: { label: string; value: Uint8Array | string }) {
  return <div className="op-value"><div className="op-label">{label}</div><div className="hex">{typeof value === 'string' ? value : hex(value)}</div></div>;
}

function OperationFlow({ blocks, all = false, onSkip }: { blocks: { title: string; body: string; input?: string; output?: string; value?: Uint8Array | string; valueLabel?: string; values?: { label: string; value: Uint8Array | string }[] }[]; all?: boolean; onSkip?: () => void }) {
  const [revealed, setRevealed] = useState(all ? blocks.length : 1);
  useEffect(() => {
    setRevealed(all ? blocks.length : 1);
    if (all) return undefined;
    const timer = window.setInterval(() => setRevealed((n) => Math.min(n + 1, blocks.length)), 600);
    return () => window.clearInterval(timer);
  }, [blocks, all]);
  useEffect(() => {
    if (revealed > 1) document.querySelector(`[data-operation-index="${revealed - 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [revealed]);
  return <>
    {!all && revealed < blocks.length && <button className="btn secondary" onClick={() => { setRevealed(blocks.length); onSkip?.(); }}>Passer l’animation</button>}
    <div className="operation-list">{blocks.slice(0, revealed).map((b, i) => <article className="card operation" key={b.title} data-operation-index={i}>
      <div className="op-label">Étape {i + 1}</div><h3>{b.title}</h3><p>{b.body}</p>
      {b.input && <p className="op-meta"><strong>Entrées :</strong> {b.input}</p>}
      {b.output && <p className="op-meta"><strong>Sorties :</strong> {b.output}</p>}
      {b.title === 'Tentative de lecture par Oscar' && <div className="badge private"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>Échec du déchiffrement</div>}
      {b.value && <Value label={b.valueLabel || 'Valeur réelle'} value={b.value} />}
      {b.values?.map((entry) => <Value key={entry.label} label={entry.label} value={entry.value} />)}
    </article>)}</div>
  </>;
}

function ParamTable({ selected }: { selected: string }) {
  const rows: [string, keyof import('./crypto/params.js').ParameterSet][] = [['k','k'], ['du','du'], ['dv','dv'], ['Clé publique ek','ek'], ['Clé privée dk','dk'], ['Ciphertext c','c'], ['Secret partagé','K'], ['Catégorie NIST','nist']];
  return <div className="table-scroll"><table className="param-table"><thead><tr><th>Paramètre</th>{PARAM_KEYS.map(k => <th key={k} className={selected === k ? 'selected-col' : ''}>{k}</th>)}</tr></thead>
    <tbody>{rows.map(([label, prop]) => <tr key={prop}><th>{label}</th>{PARAM_KEYS.map(k => <td key={k} className={selected === k ? 'selected-col' : ''}>{['ek','dk','c','K'].includes(prop) ? `${PARAMS[k][prop]} octets` : prop === 'nist' ? `Catégorie ${PARAMS[k][prop]}` : PARAMS[k][prop]}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Progress({ step, max, onMove }: { step: number; max: number; onMove: (step: number) => void }) {
  const segment = (n: number) => step >= stages[n].at || (n === 3 && step === 9);
  return <nav className="progress" aria-label="Progression de l’expérience">
    <div className="progress-list">{stages.map((s, i) => {
      const reached = max >= s.at || (i === 3 && max === 9);
      return <button className={`progress-item ${reached ? 'reached' : ''}`} key={s.label} disabled={!reached} onClick={() => onMove(s.at)}>
        <span className="progress-top"><span className="progress-dot">{i + 1}</span>{s.label}</span><span className="progress-line" />
      </button>;
    })}</div>
    <div className="progress-foot"><span className="oscar-marker">Oscar · interception</span><span className="oscar-marker">Oscar · interception</span></div>
  </nav>;
}

function Transfer({ from, to, description, packet }: { from: string; to: string; description: string; packet: string }) {
  const forward = from === 'Alice';
  return <div className="card transfer">
    <div className="stage-name">Transfert intercepté</div>
    <div className="transfer-people"><Character name="Alice" /><div className="transfer-mid"><Character name="Oscar" dashed /><div className={`packet-motion ${forward ? '' : 'reverse'}`} aria-label={`Paquet transmis de ${from} vers ${to}`}><svg width="30" height="24" viewBox="0 0 30 24" aria-hidden="true"><rect x="2" y="3" width="26" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="m3 5 12 9L27 5" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg><span>{packet}</span></div></div><Character name="Bob" /></div>
    <p className="transfer-copy">{description}</p>
  </div>;
}

function App() {
  const [param, setParam] = useState('ML-KEM-768');
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [keys, setKeys] = useState<any>(null);
  const [enc, setEnc] = useState<any>(null);
  const [oscarKey, setOscarKey] = useState<any>(null);
  const [oscarSecret, setOscarSecret] = useState<any>(null);
  const [dec, setDec] = useState<any>(null);
  const [aes, setAes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [altered, setAltered] = useState<any>(null);
  const p = PARAMS[param];
  const hasSubtle = typeof crypto !== 'undefined' && !!crypto.subtle;
  const go = (n: number) => { setStep(n); setMaxStep((m) => Math.max(m, n)); setError(''); };
  const release = (value: any) => {
    if (!value) return;
    if (value instanceof Uint8Array) value.fill(0);
    else if (typeof value === 'object') Object.values(value).forEach(release);
  };
  const restart = () => {
    [keys, enc, oscarKey, oscarSecret, dec, aes, altered].forEach(release);
    setKeys(null); setEnc(null); setOscarKey(null); setOscarSecret(null); setDec(null);
    setAes(null); setAltered(null); setAttempt(0); setStep(0); setMaxStep(0); setError(''); setParam('ML-KEM-768');
  };
  const changeParam = (next: string) => {
    if (next === param) return;
    if (maxStep > 1 && !window.confirm('Changer de jeu de paramètres recommence la simulation. Continuer ?')) return;
    restart(); setParam(next);
  };
  const run = async (fn: () => void | Promise<void>) => {
    if (!hasSubtle) { setError('Web Crypto indisponible. Ouvrez cette application en HTTPS ou sur localhost pour utiliser crypto.subtle.'); return; }
    setBusy(true); setError('');
    try { await fn(); } catch { setError(safeError); } finally { setBusy(false); }
  };
  const generate = () => run(() => { const result = keyGen(param); setKeys(result); go(2); });
  const encapsulate = () => run(() => { const result = encaps(param, keys.ek); setEnc(result); go(5); });
  const letOscarTryKey = async () => {
    await run(async () => {
      setAttempt(0);
      for (let i = 1; i <= 4; i += 1) { await new Promise((resolve) => window.setTimeout(resolve, 230)); setAttempt(i); }
      go(4);
    });
  };
  const letOscarTrySecret = () => run(async () => {
    setAttempt(0);
    for (let i = 1; i <= 4; i += 1) { await new Promise((resolve) => window.setTimeout(resolve, 230)); setAttempt(i); }
    const privatePair = keyGen(param);
    const result = decaps(param, privatePair.dk, enc.c, privatePair.z, enc.K);
    if (same(result.Kprime, enc.K)) throw new Error(safeError);
    setOscarKey(privatePair); setOscarSecret(result); go(7);
  });
  const decapsulate = () => run(() => {
    const result = decaps(param, keys.dk, enc.c, keys.z, enc.K);
    if (!result.accepted || !same(result.Kprime, enc.K)) throw new Error(safeError);
    setDec(result); go(8);
  });
  const testAltered = () => run(() => {
    const changed = enc.c.slice(); changed[0] ^= 1;
    const result = decaps(param, keys.dk, changed, keys.z, enc.K);
    setAltered({ ...result, c: changed }); 
  });
  const sendText = () => run(async () => {
    const aliceKey = await deriveAesKey(enc.K);
    const original = await aesEncrypt(aliceKey, "Bob, j'ai peur d'Oscar, je pense qu'il m'espionne.");
    const bobReceived = await aesDecrypt(aliceKey, original.iv, original.ciphertext, original.tag);
    const oscarAes = await deriveAesKey(oscarSecret.Kprime);
    let oscarFailed = false;
    try { await aesDecrypt(oscarAes, original.iv, original.ciphertext, original.tag); } catch { oscarFailed = true; }
    if (!oscarFailed) throw new Error(safeError);
    const bobReply = "J'ai bien compris Alice. Ne t'inquiète pas, notre communication est protégée.";
    const response = await aesEncrypt(aliceKey, bobReply);
    const received = await aesDecrypt(aliceKey, response.iv, response.ciphertext, response.tag);
    setAes({ key: aliceKey, original, bobReceived, oscarFailed, response, received }); go(9);
  });
  const fullHex = (v: Uint8Array) => hex(v);
  const keyBlocks = useMemo(() => keys ? [
    { title: 'Graines aléatoires d et z', body: 'Alice tire deux graines indépendantes de 32 octets avec l’aléa cryptographique du navigateur.', output: 'd, z', value: concat(keys.d, keys.z), valueLabel: 'd ‖ z (64 octets)' },
    { title: 'K-PKE.KeyGen(d)', body: 'À partir de d, SHA3-512 produit ρ et σ. ML-KEM utilise ensuite ces graines pour construire les éléments internes de K-PKE.', input: 'd et k', output: 'ρ, σ et clés internes K-PKE', values: [{ label: 'ρ — SHA3-512(d ‖ k)', value: keys.rho }, { label: 'σ — SHA3-512(d ‖ k)', value: keys.sigma }] },
    { title: 'Construction de la clé publique ek', body: 'La clé publique est la clé publique K-PKE. Ses 32 derniers octets correspondent à ρ.', output: `ek — ${keys.ek.length} octets`, value: keys.ek.slice(-32), valueLabel: 'Fin de ek — ρ' },
    { title: 'Construction de la clé privée dk', body: 'La clé privée rassemble la clé K-PKE, ek, SHA3-256(ek) et la graine z.', output: 'dk_PKE ‖ ek ‖ SHA3-256(ek) ‖ z', values: [{ label: 'dk_PKE', value: keys.dk.subarray(0, 384 * p.k) }, { label: 'ek intégré dans dk', value: keys.dk.subarray(384 * p.k, 768 * p.k + 32) }, { label: 'SHA3-256(ek)', value: keys.h }, { label: 'z', value: keys.z }] },
  ] : [], [keys]);
  const encBlocks = useMemo(() => enc ? [
    { title: 'Génération du message aléatoire m', body: 'Bob tire un message aléatoire de 32 octets, utilisé par l’encapsulation.', output: 'm', value: enc.m },
    { title: 'Calcul de SHA3-256(ek)', body: 'Bob calcule l’empreinte de la clé publique reçue.', input: 'ek', output: 'h = SHA3-256(ek)', value: enc.h },
    { title: 'Calcul de (K ‖ r)', body: 'SHA3-512 associe le message et l’empreinte. Les 32 premiers octets sont K, les 32 suivants sont r.', input: 'm ‖ SHA3-256(ek)', output: 'K ‖ r', value: concat(enc.K, enc.r) },
    { title: 'K-PKE.Encrypt(ek, m, r)', body: 'La bibliothèque ML-KEM chiffre le message à partir de la clé publique et de r.', input: 'ek, m, r', output: 'Ciphertext c' },
    { title: 'Valeurs nécessaires à K-PKE.Encrypt', body: 'Dans FIPS 203, les valeurs aléatoires utilisées par le chiffrement sont dérivées de r via SHAKE256 ; elles ne sont pas tirées indépendamment.', input: 'r', output: 'Valeurs dérivées par ML-KEM' },
    { title: 'Construction du ciphertext c = c1 ‖ c2', body: 'Le ciphertext est séparé en c1 et c2 selon les paramètres du jeu sélectionné.', output: `c1 : ${enc.c1.length} octets · c2 : ${enc.c2.length} octets`, values: [{ label: 'c1', value: enc.c1 }, { label: 'c2', value: enc.c2 }] },
    { title: 'Obtention du secret partagé K', body: 'K est calculé pendant l’encapsulation par Bob. Il reste confidentiel et n’est jamais envoyé à Alice.', output: 'Secret partagé K — 32 octets', value: enc.K, valueLabel: 'K — confidentiel' },
  ] : [], [enc, param]);
  const decBlocks = useMemo(() => dec ? [
    { title: 'Extraction des composants de dk', body: 'Alice découpe sa clé privée suivant les longueurs définies par ML-KEM.', output: 'dk_PKE, ek, SHA3-256(ek), z', values: [{ label: 'dk_PKE', value: dec.parts.dkPke }, { label: 'ek extrait', value: dec.parts.ek }, { label: 'SHA3-256(ek)', value: dec.parts.h }, { label: 'z', value: dec.parts.z }] },
    { title: 'Décomposition du ciphertext', body: 'Alice sépare c en ses deux composants c1 et c2.', output: `c1 : ${enc.c1.length} octets · c2 : ${enc.c2.length} octets`, values: [{ label: 'c1', value: enc.c1 }, { label: 'c2', value: enc.c2 }] },
    { title: 'Décodage et décompression', body: 'ML-KEM décode les composants chiffrés selon les paramètres du jeu.', input: 'c1, c2', output: 'Données décodées' },
    { title: 'Déchiffrement à l’aide de la clé privée', body: 'La clé privée d’Alice permet à la bibliothèque de retrouver le message encapsulé.', input: 'dk_PKE, c', output: 'Message récupéré' },
    { title: 'Récupération du message m′', body: 'Pour ce ciphertext valide, m′ correspond au message aléatoire utilisé par Bob.', output: 'm′', value: enc.m },
    { title: 'Recalcul de (K′ ‖ r′)', body: 'SHA3-512(m′ ‖ SHA3-256(ek)) redonne les valeurs utilisées pour l’encapsulation.', output: 'K′ ‖ r′', value: concat(dec.Kprime, enc.r) },
    { title: 'Réencapsulation interne', body: 'ML-KEM reconstruit un ciphertext de vérification c′ à partir de m′.', output: 'c′', value: enc.c },
    { title: 'Comparaison du ciphertext', body: 'La bibliothèque vérifie c′ = c. Le résultat est accepté ; en cas de différence, ML-KEM restituerait K̄ sans signaler d’erreur.', output: 'c′ = c', value: 'c′ = c' },
    { title: 'Restitution de K′', body: 'La vérification réussit : Alice récupère K′, identique au secret partagé de Bob.', output: 'K′ — 32 octets', value: dec.Kprime },
  ] : [], [dec, enc]);

  const Role = ({ person, text, button, action, disabled, reason }: { person: string; text: string; button: string; action: () => void; disabled?: boolean; reason?: string }) => <div className="card role-card">
    <Character name={person} dashed={person === 'Oscar'} />
    <div className="role-text"><p>{text}</p>{reason && <p className="muted">{reason}</p>}<button className="btn" onClick={action} disabled={disabled || busy}>{button}</button></div>
  </div>;
  const DataSummary = () => <div className="data-grid"><DataCard title="Clé publique ek" value={keys.ek} /><DataCard title="Clé privée dk" value={keys.dk} secret /></div>;
  const OscarIllustration = () => <div className="attempt card"><div className="stage-name">Illustration</div><h3>Analyse en cours</h3><div className="attempt-track">Essais illustratifs : {attempt} / 4　{attempt === 4 ? 'Analyse interrompue' : '…'}</div></div>;
  const titleForStep: Record<number, string> = { 2: 'Étape 1 · Génération des clés', 3: 'Étape 1 · Transfert de la clé publique', 4: 'Oscar · Tentative sur la clé privée', 5: 'Étape 2 · Encapsulation', 6: 'Étape 2 · Transfert du ciphertext', 7: 'Oscar · Tentative sur le secret partagé', 8: 'Étape 3 · Décapsulation', 9: 'Étape 4 · Canal chiffré' };

  return <div className="app">
    <header className="topbar"><div className="wrap top-inner"><div className="brand"><img src="/images/logo-ml-kem.png" alt="ML-KEM Lab" /><div className="brand-label"><small>Laboratoire interactif</small>Comprendre la cryptographie post-quantique</div></div><div className="header-actions"><select aria-label="Jeu de paramètres" data-testid="select-header-parameters" value={param} onChange={(e) => changeParam(e.target.value)}>{PARAM_KEYS.map(k => <option key={k}>{k}</option>)}</select><button className="restart" data-testid="button-restart" onClick={restart}>Recommencer</button></div></div></header>
    <main className="wrap main">
      <Progress step={step} max={maxStep} onMove={(n) => go(n)} />
      {!hasSubtle && <div className="error" role="alert">Web Crypto indisponible. Ouvrez cette application en HTTPS ou sur localhost pour utiliser crypto.subtle.</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {step === 0 && <><section className="hero"><div><div className="eyebrow">Un laboratoire, trois personnages, un secret</div><h1>Et si Oscar écoutait toute la conversation&nbsp;?</h1><p>Suivez Alice et Bob : établissez ensemble un secret partagé avec ML-KEM, puis échangez un message chiffré. Oscar observe les échanges sans retrouver le secret.</p></div><div className="hero-mark" role="img" aria-label="Illustration d’un cadenas numérique représentant la sécurité post-quantique"><div className="hero-core" aria-hidden="true" /></div></section><div className="intro-grid"><section className="card"><div className="eyebrow">Avant de commencer</div><h2>Choisissez un jeu de paramètres</h2><p>ML-KEM-768 est sélectionné par défaut. Chaque variante définit des tailles de clés et un niveau de sécurité NIST différents.</p><div className="form-row"><label htmlFor="params-select">Jeu de paramètres</label><select id="params-select" data-testid="select-parameters" value={param} onChange={(e) => changeParam(e.target.value)}>{PARAM_KEYS.map(k => <option key={k}>{k}</option>)}</select></div><button className="btn" onClick={() => go(1)}>Commencer l’expérience</button></section><section className="card"><h3>Le parcours</h3><p>1. Alice génère ses clés　·　2. Bob encapsule un secret　·　3. Alice le retrouve　·　4. Un message est chiffré avec AES-GCM.</p><div className="role-badges"><span className="badge">ML-KEM · secret partagé</span><span className="badge">HKDF · dérivation</span><span className="badge">AES-GCM · messages</span></div><p className="muted">Toutes les opérations cryptographiques sont exécutées localement dans ce navigateur.</p></section></div><section className="card param-home"><h3>Tailles et catégorie NIST</h3><ParamTable selected={param} /></section></>}
      {step === 1 && <><div className="screen-head"><div><div className="eyebrow">Configuration</div><h1>Choisissez vos paramètres</h1></div></div><section className="card"><p>Le changement de paramètres recommence la simulation. ML-KEM-768 est sélectionné par défaut.</p><div className="form-row"><label htmlFor="params-select-2">Jeu de paramètres</label><select id="params-select-2" value={param} onChange={(e) => changeParam(e.target.value)}>{PARAM_KEYS.map(k => <option key={k}>{k}</option>)}</select></div><ParamTable selected={param} /><div className="btn-row"><button className="btn" onClick={() => go(2)}>Continuer avec {param}</button></div></section></>}
      {step >= 2 && <><div className="screen-head"><div><div className="eyebrow">Expérience · {param}</div><h1>{titleForStep[step]}</h1></div></div>
        {step === 2 && !keys && <Role person="Alice" text={messages.alice} button="Lancer la génération des clés" action={generate} />}
        {step === 2 && keys && <><div className="card role-card"><Character name="Alice" /><p className="role-text">{messages.alice}</p></div><OperationFlow blocks={keyBlocks} /><DataSummary /><div className="btn-row"><button className="btn" onClick={() => go(3)}>Envoyer la clé publique à Bob</button></div></>}
        {step === 3 && keys && <><Transfer from="Alice" to="Bob" packet="Clé publique ek" description="La clé publique n'est pas secrète. Oscar peut l'intercepter et l'observer. Cependant, connaître cette clé ne lui permet pas de retrouver la clé privée d'Alice." /><DataCard title="Clé publique ek" value={keys.ek} /><button className="btn" onClick={() => go(4)}>Continuer</button></>}
        {step === 4 && keys && <><Role person="Oscar" text={messages.oscarKey} button="Essayer de retrouver la clé privée d’Alice" action={letOscarTryKey} disabled={busy} /><OscarIllustration />{attempt === 4 && <><div className="success"><p>La récupération de la clé privée nécessiterait de résoudre un problème mathématique considéré comme difficile. Les attaques connues, y compris quantiques, ne permettent pas de retrouver cette clé de manière réaliste avec les paramètres sélectionnés.</p><strong>Catégorie NIST {p.nist}</strong></div><button className="btn" onClick={() => go(5)}>Laisser tomber et attendre Bob</button></>}</>}
        {step === 5 && !enc && <Role person="Bob" text={messages.bob} button="Lancer l’encapsulation" action={encapsulate} disabled={!keys} reason={!keys ? 'Alice doit d’abord générer ses clés.' : ''} />}
        {step === 5 && enc && <><div className="card role-card"><Character name="Bob" /><p className="role-text">{messages.bob}</p></div><OperationFlow blocks={encBlocks} /><div className="data-grid"><DataCard title="Ciphertext c" value={enc.c} /><DataCard title="Secret partagé K" value={enc.K} secret /></div><div className="btn-row"><button className="btn" onClick={() => go(6)}>Envoyer le ciphertext à Alice</button></div></>}
        {step === 6 && enc && <><Transfer from="Bob" to="Alice" packet="Ciphertext c" description="Le ciphertext peut être observé par un espion sans que cela lui permette de retrouver automatiquement le secret partagé." /><DataCard title="Ciphertext c" value={enc.c} /><button className="btn" onClick={() => go(7)}>Continuer</button></>}
        {step === 7 && enc && <><Role person="Oscar" text={messages.oscarSecret} button="Essayer de retrouver le secret partagé" action={letOscarTrySecret} disabled={busy} reason={!enc ? 'Bob doit d’abord encapsuler le secret.' : ''} /><OscarIllustration />{oscarSecret && <><div className="data-grid"><DataCard title="K Oscar" value={oscarSecret.Kprime} secret /><div className="card"><h3>K : confidentiel</h3><p>Le secret de Bob n’est pas affiché à Oscar.</p><span className="badge private">Les secrets ne correspondent pas</span></div></div><div className="success"><p>Malgré les informations interceptées, Oscar ne parvient pas à retrouver le secret partagé. Les problèmes mathématiques sur lesquels repose ML-KEM rendent cette récupération computationnellement irréalisable avec les moyens connus pour les paramètres choisis.</p></div><button className="btn" onClick={() => go(8)}>Abandonner</button></>}</>}
        {step === 8 && enc && keys && <>{!dec && <Role person="Alice" text={messages.aliceBack} button="Décapsuler le ciphertext" action={decapsulate} disabled={!enc || !keys} reason="Le ciphertext reçu et la clé privée d’Alice sont nécessaires." />}
          {dec && <><div className="card role-card"><Character name="Alice" /><p className="role-text">{messages.aliceBack}</p></div><OperationFlow blocks={decBlocks} />
            <details className="drawer"><summary>Transformation de Fujisaki-Okamoto</summary><div className="drawer-content">Cette transformation convertit un chiffrement de base (K-PKE, sûr contre les attaques passives, IND-CPA) en un mécanisme d'encapsulation sûr contre les attaques actives, notamment les ciphertexts choisis par l'attaquant (IND-CCA2). Pour cela, Alice rechiffre le message qu'elle a retrouvé et vérifie que le résultat est identique au ciphertext reçu ; en cas de différence, elle renvoie une valeur pseudo-aléatoire (rejet implicite) au lieu d'une erreur, ce qui ne révèle rien à l'attaquant.</div></details>
            <div className="data-grid"><DataCard title="Secret partagé de Bob · K" value={enc.K} secret /><DataCard title="Secret partagé récupéré par Alice · K′" value={dec.Kprime} secret /></div>
            <div className="success"><p>Secret partagé établi avec succès ! Alice et Bob possèdent maintenant le même secret partagé, sans l'avoir directement transmis sur le réseau. Oscar a pu observer les échanges, mais il n'a pas pu retrouver ce secret.</p></div>
            <div className="btn-row"><button className="btn secondary" onClick={testAltered}>Tester avec un ciphertext altéré</button><button className="btn" onClick={() => go(9)}>Continuer vers le canal chiffré</button></div>
            {altered && <div className="error"><h3>Rejet implicite réel</h3><p>Le ciphertext recalculé ne correspond pas au ciphertext reçu. ML-KEM renvoie K̄, sans signaler d’erreur. Le résultat n’écrase pas la décapsulation principale.</p><p className="op-value hex">c′ ≠ c · K̄ = {fullHex(altered.kbar)}</p><p className="op-value hex">Secret de rejet : {fullHex(altered.Kprime)}</p></div>}</>}
        </>}
      {step === 9 && enc && oscarSecret && <><section className="card"><div className="stage-name">Établissement de la clé · chiffrement des messages</div><div className="role-badges"><span className="badge">ML-KEM : établissement du secret partagé</span><span className="badge">HKDF : dérivation de la clé de chiffrement</span><span className="badge">AES-GCM : chiffrement authentifié des messages</span></div><div className="chat"><div><Character name="Alice" /><div className="bubble">Bob, j'ai peur d'Oscar, je pense qu'il m'espionne.</div>{aes && <div className="bubble right">{aes.received}</div>}</div><div><Character name="Bob" />{aes ? <><div className="bubble">Bob reçoit : {aes.bobReceived}</div><div className="bubble right">{aes.received}</div></> : <div className="bubble">Le message de Bob apparaîtra après le chiffrement.</div>}</div></div><p>Le secret partagé obtenu grâce à ML-KEM sert à dériver une clé AES avec HKDF-SHA-256, puis à chiffrer le message avec AES-GCM.</p>
            {!aes && <button className="btn" onClick={sendText} disabled={!hasSubtle}>Envoyer le message</button>}
            {aes && <><OperationFlow all blocks={[
              { title: 'Message original', body: 'Alice prépare son message avant le chiffrement.', output: 'Texte clair', value: 'Bob, j’ai peur d’Oscar, je pense qu’il m’espionne.' },
              { title: 'Dérivation de la clé avec HKDF-SHA-256', body: 'IKM = K, sel = 32 octets à zéro, info = « ML-KEM-Lab AES-256-GCM », sortie = 32 octets.', input: 'Secret partagé K', output: 'Clé AES-256', value: aes.key },
              { title: 'Chiffrement AES-GCM', body: 'AES-256-GCM utilise un IV aléatoire de 12 octets et un tag d’authentification de 128 bits.', output: 'IV, ciphertext et tag', values: [{ label: 'IV (12 octets)', value: aes.original.iv }, { label: 'Ciphertext', value: aes.original.ciphertext }, { label: 'Tag (128 bits)', value: aes.original.tag }] },
              { title: 'Transmission du ciphertext', body: 'Le ciphertext circule entre Alice et Bob ; Oscar peut en obtenir une copie.', output: 'Ciphertext transmis', value: aes.original.ciphertext },
              { title: 'Interception par Oscar', body: 'Oscar observe le ciphertext chiffré.', output: 'Copie interceptée', value: aes.original.ciphertext },
              { title: 'Tentative de lecture par Oscar', body: 'Oscar tente réellement le déchiffrement avec une clé dérivée de son K Oscar.', output: 'Échec du déchiffrement', value: 'Échec du déchiffrement' },
              { title: 'Déchiffrement par Bob', body: 'Bob utilise la même clé dérivée du secret partagé et retrouve le message.', output: 'Message reçu', value: aes.bobReceived },
            ]} />
              <div className="card"><h3>Réponse de Bob</h3><p>Bob répond avec un nouvel IV. Le message est chiffré avec AES-GCM puis déchiffré par Alice.</p><div className="bubble right">{aes.received}</div><Value label="Nouvel IV de réponse" value={aes.response.iv} /><Value label="Ciphertext de la réponse" value={aes.response.ciphertext} /><Value label="Tag de la réponse" value={aes.response.tag} /></div>
              <div className="btn-row"><button className="btn" onClick={restart}>Recommencer l'expérience</button></div></>}
          </section></>}
      </>}
    </main>
    <footer className="footer">Outil pédagogique : ne protège pas de vraies communications.</footer>
  </div>;
}

export default App;
