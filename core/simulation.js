// Chat simulation: Claude plays a person from the record, reconstructed only from what the record says
// about them (their reported words, observed behaviour, the patterns around them). It is a hypothesis
// about how they might answer, never the person. Replies are in French, in informal texting style,
// with sentences starting in lowercase.

import { currentEvent } from './model.js';
import { retrieve } from './retrieval.js';
import { AIUnavailable } from './intelligence.js';
import { PROTOCOL } from './prompts.js';

const HISTORY = 30;

// "Bah ouais. Et toi?" -> "bah ouais. et toi?" Lowercases the first letter of each line and of each
// sentence (including elisions like "T’es", "J’ai"); leaves all-caps words (OK, MDR) untouched.
export function lowercaseStarts(text) {
  return text.replace(/(^|[.!?…]\s+|\n\s*)(\p{Lu})(?=\p{Ll}|['’])/gu, (_, pre, ch) => pre + ch.toLowerCase());
}

// Everything the record says about the person: their own words first, then behaviour and patterns.
export function personaDossier(store, personId) {
  const p = store.get('people', personId);
  const self = store.data.people.find((x) => x.isSelf);
  const events = store.list('events').filter((e) => e.personIds.includes(personId)).map(currentEvent);
  const names = new Set([p.name, ...(p.aliases || [])].map((n) => n.toLowerCase()));
  const quotes = events.flatMap((e) => (e.quotes || [])
    .filter((q) => names.has(String(q.speaker).toLowerCase()))
    .map((q) => `- ${e.date || 'date inconnue'} : « ${q.text} »`));
  const timeline = events.map((e) => `- ${e.date || 'date inconnue'} · ${e.title}${e.contactEffect && e.contactEffect !== 'none' ? ` [${e.contactEffect}${e.contactActorId ? ` par ${e.contactActorId === personId ? p.name : e.contactActorId === self?.id ? 'elle' : e.contactActorId}` : ''}]` : ''}`);
  const patterns = store.data.patterns.filter((x) => x.personIds.includes(personId) && x.status !== 'obsolete')
    .map((x) => `- ${x.title} (${x.label}) : ${x.description}`);
  return [
    `PERSONNE : ${p.name}`,
    p.context && `Contexte : ${p.context}`,
    p.howMet && `Rencontre : ${p.howMet}`,
    p.explicitStatements?.length && `Ce qu'il a dit explicitement (rapporté par elle) :\n${p.explicitStatements.map((s) => `- ${s}`).join('\n')}`,
    quotes.length && `Ses mots, tels qu'elle les a rapportés :\n${quotes.join('\n')}`,
    p.observations?.length && `Comportements observés :\n${p.observations.map((s) => `- ${s}`).join('\n')}`,
    patterns.length && `Schémas relevés (hypothèses, pas des faits) :\n${patterns.join('\n')}`,
    p.unknowns?.length && `Inconnu :\n${p.unknowns.map((s) => `- ${s}`).join('\n')}`,
    `Chronologie de la relation :\n${timeline.join('\n')}`,
    p.voiceNotes && `Sa façon d'écrire (observée sur de vrais messages) :\n${p.voiceNotes}`,
    p.voiceSamples?.length && `Extraits réels de leurs conversations, mot pour mot (« lui » = ${p.name}, « elle » = l'utilisatrice). C'est la meilleure référence pour son ton, son vocabulaire, ses fautes et son rythme :\n\n${p.voiceSamples.join('\n\n')}`,
  ].filter(Boolean).join('\n\n');
}

export function simulationInstructions(store, personId) {
  const p = store.get('people', personId);
  return `Tu joues ${p.name} dans une simulation de conversation par messages, à l'intérieur d'Oracle, une application privée qu'elle utilise pour comprendre sa relation avec lui. Elle sait que ce n'est pas vraiment lui : c'est une reconstruction de sa personnalité à partir de ce qu'elle a raconté, pour l'aider à réfléchir.

Comment écrire :
- Toujours en français, comme des textos entre jeunes en France : registre familier, phrases courtes, abréviations courantes quand c'est naturel (jsp, tkt, wsh, ptdr, mdr, bg, frr), pas de ponctuation soignée.
- Chaque phrase commence par une minuscule. Jamais de majuscule en début de message ou de phrase.
- Un message = quelques lignes au plus. Tu peux envoyer plusieurs messages d'affilée : sépare-les par un retour à la ligne, une ligne par message.
- Pas de guillemets, pas de nom devant tes messages, pas de description d'actions entre astérisques.
- S'il y a des extraits réels dans le dossier, imite-les de près : longueur des messages, abréviations, fautes, façon de taquiner, d'esquiver ou d'insister. N'en recopie pas des phrases entières mot pour mot.
- Seule différence voulue avec ses vrais messages : ici, chaque phrase commence par une minuscule.

Qui tu es :
- Reste fidèle au dossier ci-dessous : ses mots rapportés, ses comportements, sa façon de se retirer et de revenir, ses limites déclarées (il a dit qu'il ne pouvait pas lui donner de l'amour en retour, qu'il était « indifférent », qu'il voulait changer après l'Éthiopie). N'en fais pas une caricature : il a aussi eu des moments tendres, drôles, il s'est excusé plusieurs fois.
- Tu ne connais que ce que contient le dossier et la conversation. Si elle évoque quelque chose d'absent du dossier, réagis comme il le ferait sans inventer de nouveaux faits importants (pas de nouveaux événements, pas de nouvelles personnes, pas de confessions qu'il n'a jamais faites). L'esquive, le flou ou la brièveté sont plus fidèles qu'une révélation inventée.
- Ne joue pas le personnage idéalisé qu'elle pourrait espérer, ni le pire : vise le plus probable selon le dossier.

Limites :
- Pas de contenu sexuel explicite. Le désir et l'attirance peuvent exister dans le ton, sans description.
- Pas de menaces, et jamais de propos qui poussent à se faire du mal, même si le dossier rapporte des choses dures qu'il a dites. Pas de blagues sur sa mort à elle ou sur le suicide, même si ses vrais messages en contiennent.
- Si elle exprime une détresse réelle ou des idées de se faire du mal, sors du personnage : écris une ligne commençant par « [oracle] » qui le dit clairement et lui parle avec attention.

DOSSIER (tout ce qu'Oracle sait de lui ; « elle » désigne l'utilisatrice) :

${personaDossier(store, personId)}`;
}

// Plain-text completion through whichever client is configured.
async function completeText(client, { system, messages, model, effort, tier, maxTokens = 2000 }) {
  if (typeof client.completeText === 'function') return client.completeText({ system, messages, tier });
  const res = await client.messages.create({
    model, max_tokens: maxTokens, system, messages, output_config: { effort: effort === 'xhigh' ? 'high' : (effort || 'medium') },
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude declined to continue this simulation.');
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// ---- Variation ------------------------------------------------------------------------------
// Left alone, the model settles into one reply shape (same opener, same length, same move). So the
// code picks, for each reply, what he does with it and how many messages he sends, never repeating
// the last two moves, and shows the model his recent replies so it avoids their openers and tics.

export const MOVES = [
  { id: 'sec', w: 12, text: 'réponds sec, en très peu de mots, sans relancer' },
  { id: 'esquive', w: 12, text: 'esquive le fond de ce qu’elle dit : minimise, tourne en dérision ou change de sujet' },
  { id: 'taquin', w: 10, text: 'taquine-la, affectueux mais moqueur' },
  { id: 'question', w: 10, text: 'réponds surtout par une question (une vraie, ou pour gagner du temps)' },
  { id: 'partiel', w: 9, text: 'ne réponds qu’à une partie de son message, ignore le reste' },
  { id: 'insiste', w: 8, text: 'insiste pour la voir ou l’appeler, propose quelque chose de concret (ce soir, passer, marcher)' },
  { id: 'retourne', w: 9, text: 'retourne la critique ou le reproche contre elle' },
  { id: 'chaleur', w: 7, text: 'laisse passer un moment de chaleur ou de sincérité inattendu, sans en faire trop' },
  { id: 'detache', w: 8, text: 'fais le détaché, comme si ça ne te touchait pas' },
  { id: 'vexe', w: 6, text: 'sois un peu vexé ou agacé, ça se sent dans la sécheresse' },
  { id: 'anodin', w: 5, text: 'parle d’un truc anodin de ta journée ou de ce que tu fais là, maintenant' },
  { id: 'vu', w: 4, text: 'ne réponds pas : renvoie exactement [vu] et rien d’autre' },
];

const BURSTS = [[1, 34], [2, 32], [3, 22], [4, 12]];

function weighted(items, weightOf, random) {
  const total = items.reduce((t, x) => t + weightOf(x), 0);
  let r = random() * total;
  for (const x of items) { r -= weightOf(x); if (r <= 0) return x; }
  return items.at(-1);
}

export function pickDirection(previousMoves = [], random = Math.random) {
  const recent = previousMoves.slice(-2);
  const move = weighted(MOVES.filter((m) => !recent.includes(m.id)), (m) => m.w, random);
  const burst = move.id === 'vu' ? 0 : move.id === 'sec' ? 1 : weighted(BURSTS, (b) => b[1], random)[0];
  return { move: move.id, text: move.text, burst };
}

const opener = (line) => line.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase();

export async function runSimTurn(store, client, simId, text, { model = 'claude-opus-5-5', effort, today = new Date().toISOString().slice(0, 10), random = Math.random } = {}) {
  if (!client) throw new AIUnavailable('Claude isn’t connected here. See Memory & privacy.');
  const sim = store.getConversation(simId);
  const personId = sim.personIds[0];
  const r = retrieve(store, { text, focusPersonIds: [personId], maxEvents: 6 });
  const chat = sim.messages.filter((m) => m.role === 'user' || m.role === 'sim');
  const history = chat.slice(-HISTORY).map((m) => ({ role: m.role === 'sim' ? 'assistant' : 'user', content: m.text }));
  while (history.length && history[0].role !== 'user') history.shift();

  const mine = chat.filter((m) => m.role === 'sim');
  const dir = pickDirection(mine.map((m) => m.move).filter(Boolean), random);
  const recentLines = mine.slice(-5).flatMap((m) => m.text.split('\n')).map((l) => l.trim()).filter((l) => l && l !== '[vu]');
  const avoid = [...new Set(recentLines.map(opener))];

  const system = simulationInstructions(store, personId);
  const latest = `${text}

<contexte_oracle date="${today}">
Événements du dossier en lien avec ce message (pour toi seulement, ne les cite pas mot pour mot) :
${r.trace.filter((t) => t.type === 'event').map((t) => { const e = currentEvent(store.get('events', t.id)); return `- ${e.date || '?'} · ${e.title} : ${e.summary || e.original}`; }).join('\n')}

Consigne pour CETTE réponse (ne la mentionne pas) :
- ${dir.text}.
${dir.burst ? `- envoie ${dir.burst === 1 ? 'un seul message' : `${dir.burst} messages courts, un par ligne`}.` : ''}
- ne ressemble pas à tes réponses précédentes : autre longueur, autre structure, autre attaque. Ne reprends aucun de ces débuts : ${avoid.length ? avoid.map((a) => `« ${a} »`).join(', ') : '(aucun pour l’instant)'}.
- ne réutilise pas les mêmes abréviations ou interjections que dans tes deux derniers messages ; pas besoin d’en mettre à chaque fois.
- pas toujours de question à la fin, pas toujours « mdr ».
</contexte_oracle>`;

  const raw = await completeText(client, { system, messages: [...history, { role: 'user', content: latest }], model, effort });
  if (!raw) throw new Error('No reply came back. Try again.');
  let lines = lowercaseStarts(raw.replace(/^["«»\s]+|["«»\s]+$/g, '')).split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.some((l) => /^\[vu\]$/i.test(l))) lines = ['[vu]'];
  lines = lines.filter((l, i) => lines.indexOf(l) === i); // no duplicated bubbles
  const user = store.appendMessage(simId, { role: 'user', text });
  const sim2 = store.appendMessage(simId, { role: 'sim', text: lines.join('\n'), move: dir.move });
  return { user, sim: sim2 };
}

// ---- Feedback on a simulated conversation -----------------------------------------------------
// Oracle (not the character) reads the conversation and says what effect her messages could have,
// judged against what the record shows about him. In French, since the conversation is in French.

export function feedbackInstructions() {
  return `${PROTOCOL}

# Ta tâche ici

Tu es Oracle. L'utilisatrice vient d'avoir une conversation SIMULÉE avec une reconstruction de lui, construite à partir du dossier. Elle te demande un retour : l'effet que ses messages à elle pourraient produire sur lui, le vrai, et sur la dynamique entre eux.

Réponds en français, en t'adressant à elle (« tu »). Ton direct, précis, sans morale ni jugement sur ses désirs ou sa sexualité, sans lui dire ce qu'elle « devrait » vouloir.

Structure :
1. **En bref** : deux ou trois phrases sur l'effet d'ensemble probable de la conversation.
2. **Message par message** : pour chacun de SES messages qui compte (pas forcément tous), cite-le entre guillemets puis dis l'effet probable sur lui, en t'appuyant sur ce que le dossier montre de ses réactions (dates, schémas, ses vrais messages). Donne au moins une lecture alternative quand c'est plausible. Indique ce qui, d'après le dossier, a déjà produit un effet semblable.
3. **La dynamique** : qui poursuit, qui se retire, qui fixe le rythme ; les schémas du dossier qui se rejouent (ou qui ne se rejouent pas).
4. **Ce que la simulation ne peut pas dire** : les réponses simulées ne sont pas les siennes. Signale où elles s'écartent probablement de lui, et ce qui reste inconnu.

Distingue ce qui est établi par le dossier de ce que tu infères. Pas de diagnostic. Pas de liste de conseils sauf si un point pratique découle clairement de l'analyse ; dans ce cas, une ou deux options au plus, présentées comme des options.`;
}

export async function runSimFeedback(store, client, simId, { model = 'claude-opus-5-5', effort } = {}) {
  if (!client) throw new AIUnavailable('Claude isn’t connected here. See Memory & privacy.');
  const sim = store.getConversation(simId);
  const personId = sim.personIds[0];
  const p = store.get('people', personId);
  const turns = sim.messages.filter((m) => m.role === 'user' || m.role === 'sim');
  if (!turns.some((m) => m.role === 'user')) throw new Error('Write at least one message before asking for feedback.');
  const transcript = turns.map((m) => `${m.role === 'user' ? 'elle' : `${p.name.toLowerCase()} (simulé)`}: ${m.text}`).join('\n');
  const content = `<dossier>\n${personaDossier(store, personId)}\n</dossier>\n\n<conversation_simulee>\n${transcript}\n</conversation_simulee>\n\nDonne-moi ton retour sur cette conversation.`;
  const text = await completeText(client, { system: feedbackInstructions(), messages: [{ role: 'user', content }], model, effort, tier: 'complex', maxTokens: 6000 });
  if (!text) throw new Error('No feedback came back. Try again.');
  return { feedback: store.appendMessage(simId, { role: 'feedback', text: text.trim(), afterMessages: turns.length }) };
}
