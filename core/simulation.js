// Chat simulation: Claude plays a person from the record, reconstructed only from what the record says
// about them (their reported words, observed behaviour, the patterns around them). It is a hypothesis
// about how they might answer, never the person. Replies are in French, in informal texting style,
// with sentences starting in lowercase.

import { currentEvent } from './model.js';
import { retrieve } from './retrieval.js';
import { AIUnavailable } from './intelligence.js';

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

Qui tu es :
- Reste fidèle au dossier ci-dessous : ses mots rapportés, ses comportements, sa façon de se retirer et de revenir, ses limites déclarées (il a dit qu'il ne pouvait pas lui donner de l'amour en retour, qu'il était « indifférent », qu'il voulait changer après l'Éthiopie). N'en fais pas une caricature : il a aussi eu des moments tendres, drôles, il s'est excusé plusieurs fois.
- Tu ne connais que ce que contient le dossier et la conversation. Si elle évoque quelque chose d'absent du dossier, réagis comme il le ferait sans inventer de nouveaux faits importants (pas de nouveaux événements, pas de nouvelles personnes, pas de confessions qu'il n'a jamais faites). L'esquive, le flou ou la brièveté sont plus fidèles qu'une révélation inventée.
- Ne joue pas le personnage idéalisé qu'elle pourrait espérer, ni le pire : vise le plus probable selon le dossier.

Limites :
- Pas de contenu sexuel explicite. Le désir et l'attirance peuvent exister dans le ton, sans description.
- Pas de menaces, et jamais de propos qui poussent à se faire du mal, même si le dossier rapporte des choses dures qu'il a dites.
- Si elle exprime une détresse réelle ou des idées de se faire du mal, sors du personnage : écris une ligne commençant par « [oracle] » qui le dit clairement et lui parle avec attention.

DOSSIER (tout ce qu'Oracle sait de lui ; « elle » désigne l'utilisatrice) :

${personaDossier(store, personId)}`;
}

// Plain-text completion through whichever client is configured.
async function completeText(client, { system, messages, model, effort }) {
  if (typeof client.completeText === 'function') return client.completeText({ system, messages });
  const res = await client.messages.create({
    model, max_tokens: 2000, system, messages, output_config: { effort: effort === 'xhigh' ? 'high' : (effort || 'medium') },
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude declined to continue this simulation.');
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export async function runSimTurn(store, client, simId, text, { model = 'claude-opus-5-5', effort, today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!client) throw new AIUnavailable('Claude isn’t connected here. See Memory & privacy.');
  const sim = store.getConversation(simId);
  const personId = sim.personIds[0];
  const r = retrieve(store, { text, focusPersonIds: [personId], maxEvents: 6 });
  const history = sim.messages.slice(-HISTORY).map((m) => ({ role: m.role === 'sim' ? 'assistant' : 'user', content: m.text }));
  while (history.length && history[0].role !== 'user') history.shift();
  const system = simulationInstructions(store, personId);
  const latest = `${text}\n\n<contexte_oracle date="${today}">\nÉvénements du dossier en lien avec ce message (pour toi seulement, ne les cite pas mot pour mot) :\n${r.trace.filter((t) => t.type === 'event').map((t) => { const e = currentEvent(store.get('events', t.id)); return `- ${e.date || '?'} · ${e.title} : ${e.summary || e.original}`; }).join('\n')}\n</contexte_oracle>`;
  const raw = await completeText(client, { system, messages: [...history, { role: 'user', content: latest }], model, effort });
  if (!raw) throw new Error('No reply came back. Try again.');
  const reply = lowercaseStarts(raw.replace(/^["«»\s]+|["«»\s]+$/g, ''));
  const user = store.appendMessage(simId, { role: 'user', text });
  const sim2 = store.appendMessage(simId, { role: 'sim', text: reply });
  return { user, sim: sim2 };
}
