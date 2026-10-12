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

export async function runSimTurn(store, client, simId, text, { model = 'claude-opus-5-5', effort, today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!client) throw new AIUnavailable('Claude isn’t connected here. See Memory & privacy.');
  const sim = store.getConversation(simId);
  const personId = sim.personIds[0];
  const r = retrieve(store, { text, focusPersonIds: [personId], maxEvents: 6 });
  const history = sim.messages.filter((m) => m.role === 'user' || m.role === 'sim').slice(-HISTORY).map((m) => ({ role: m.role === 'sim' ? 'assistant' : 'user', content: m.text }));
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
