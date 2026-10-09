// The rest of the Yosef case study: people, the narrative document's content, patterns, open questions,
// the user's intellectual history, and earlier interpretations (from conversations held outside Oracle).
//
// Provenance is explicit on every item. "narrative document" = "The Narrative: Yosef, Desire, Recurrence,
// and Meaning" (uploaded 2026-10-09). Its exact writing date is unknown; it describes the 2026-09-27
// visit and a subsequent "agreed to see him the next day", so it was most likely written around
// 2026-10-05 (inferred).

import { EVENTS } from './yosef-events.js';

const Y = 'p_yosef';
const ME = 'p_self';
const DOC = 'narrative document (uploaded 2026-10-09)';
const SPEC = 'Oracle product brief, §2 (2026-10-09)';

// Who initiated each event, where the original wording says so. Missing = unknown.
const INITIATORS = {
  e_2024_11_fruitz: 'mutual', e_2024_12_yubo: ME, e_2025_03_story: Y, e_2025_05_13_yubo: Y,
  e_2025_05_23_face: Y, e_2025_06_02_field: Y, e_2025_06_10_house: Y, e_2025_07_06_rain: 'mutual',
  e_2025_07_10_joke: ME, e_2025_07_13_apology: ME, e_2025_07_26_airbnb: ME, e_2025_08_24_snap: Y,
  e_2025_09_05_return: Y, e_2025_09_19_love: ME, e_2025_10_05_now: ME, e_2025_10_10_street: Y,
  e_2025_10_unseen: Y, e_2025_10_29_whore: Y, e_2025_11_03_moveon: Y, e_2025_11_21_asleep: Y,
  e_2025_11_26_add: ME, e_2025_12_09_gift: Y, e_2025_12_10_jibril: Y, e_2025_12_11_delete: ME,
  e_2025_12_24_indifferent: ME, e_2025_12_26_block: Y, e_2026_01_14_add: Y, e_2026_02_09_end: ME,
  e_2026_02_11_back: ME, e_2026_02_13_final: Y, e_2026_03_03_contact: Y, e_2026_03_07_noairbnb: Y,
  e_2026_05_31_deleted: Y, e_2026_06_09_6am: Y, e_2026_06_13_ethiopia: Y, e_2026_06_18_witch: ME,
  e_2026_07_21_late: Y, e_2026_09_06_unblock: ME, e_2026_09_08_block: Y, e_2026_09_17_block: Y,
  e_2026_09_27_visit: ME, e_2026_10_05_mutual: Y, e_2026_10_06_keys: Y, e_2026_10_08_bac: ME,
};

// Effect of each event on contact, where the record shows it.
const CUT = ['e_2025_07_10_joke', 'e_2025_07_26_airbnb', 'e_2025_09_19_love', 'e_2025_10_10_street', 'e_2025_11_03_moveon',
  'e_2025_12_11_delete', 'e_2025_12_26_block', 'e_2026_02_09_end', 'e_2026_02_13_final', 'e_2026_05_31_deleted',
  'e_2026_09_08_block', 'e_2026_09_17_block', 'e_2026_09_27_visit'];
const REOPEN = ['e_2025_03_story', 'e_2025_05_13_yubo', 'e_2026_06_09_6am', 'e_2025_09_05_return', 'e_2025_10_05_now', 'e_2025_10_unseen',
  'e_2025_10_29_whore', 'e_2025_11_26_add', 'e_2025_12_24_indifferent', 'e_2026_01_sex', 'e_2026_02_11_back',
  'e_2026_03_03_contact', 'e_2026_04_05_talk', 'e_2026_07_21_late', 'e_2026_09_06_unblock', 'e_2026_09_15_inlove',
  'e_2026_09_21_yubo', 'e_2026_10_05_mutual'];
const REOPEN_THEN_CUT = ['e_2025_08_24_snap', 'e_2025_11_21_asleep', 'e_2026_01_14_add'];
// Whose action cut or reopened contact, where it differs from the initiator or needs stating.
const CONTACT_ACTOR = {
  e_2025_07_10_joke: null, e_2025_07_26_airbnb: Y, e_2025_09_19_love: ME, e_2025_10_10_street: ME,
  e_2026_09_27_visit: Y, e_2025_12_24_indifferent: ME, e_2026_06_09_6am: Y,
};
const contactEffect = (id) => (CUT.includes(id) ? 'cut' : REOPEN.includes(id) ? 'reopen' : REOPEN_THEN_CUT.includes(id) ? 'reopen_then_cut' : 'none');

export const PEOPLE = [
  {
    id: ME, name: 'Me', aliases: ['self', 'I', 'me'], isSelf: true,
    context: 'The person Oracle works with.',
    explicitStatements: [
      'Does not want children or marriage (told Yosef 2025-06-02; consistent in the narrative document).',
      'Does not want a male life partner as a general goal (narrative document §11).',
      'Is Malian (2024-11).',
    ],
    observations: [],
    unknowns: [],
    notes: '',
  },
  {
    id: Y, name: 'Yosef', aliases: ['yosef', 'joseph', 'him', 'Y'],
    context: 'The first major case study. Romantic and sexual connection, on and off since late 2024.',
    howMet: 'Matched on Fruitz in November 2024. Matched again on Yubo in December 2024. Reconnected March to May 2025.',
    explicitStatements: [
      'Is Ethiopian (2024-11).',
      'Is adopted (2025-07-10, as reported by the user).',
      'Not looking for anything serious (2024-12; said by both).',
      'Liked her "a lot" in response to "I love you" (2025-10-05).',
      'Was "indifferent" and "just wanted to fuck" her (2025-12-24).',
      'Ending things "definitively" (2026-02-13).',
      'Wants to "change after Ethiopia" (2026-06-13).',
      'Cannot give her love in return; "doesn’t even have an ex" (2026-09-15).',
      'Liked her, but not as much as she liked him, and did not want more (narrative document; date unknown).',
    ],
    observations: [
      'Has blocked or deleted her many times, and has contacted her again many times (see the timeline).',
      'Ignored her in the street on 2025-10-10; later said he had seen her and apologised.',
      'Hung up when he learned about Jibril, after pushing for details (2025-12-10).',
      'Came to her home unannounced after a bank-app note (2026-09-27).',
    ],
    unknowns: [
      'Why he returns on any particular occasion.',
      'Whether he loves her, and in what sense.',
      'Whether he will act differently in future.',
      'How he would respond to her fuller inner world.',
      'Whether his trip to Ethiopia (mentioned 2026-06-13) happened, and when.',
    ],
    notes: 'His own account of his feelings is only available through what the user reports.',
  },
  {
    id: 'p_jibril', name: 'Jibril', aliases: ['jibril'],
    context: 'A man the user had some involvement with. Learning about him led Yosef to hang up on 2025-12-10.',
    unknowns: ['Nature and dates of the user’s connection with Jibril (not recorded).'],
  },
];

// Narrative-document material that is event-like but undated. Kept as events with unknown dates
// so they remain separate from the dated timeline and are clearly provenance-tagged.
const DOC_EVENTS = [
  {
    id: 'e_doc_disclosure', date: null, datePrecision: 'unknown', category: 'disclosure',
    title: 'She tells him about sex work and sugar daddies',
    original: 'The user disclosed to Yosef that she had tried prostitution and had sugar daddies. She said she had not wanted to tell him before, but that given how badly he had treated her she no longer cared. She perceived him as sexually excited by the disclosure and interested in seeing her.',
    personIds: [ME, Y], initiatorId: ME, source: DOC, label: 'recorded',
    interpretationAtTime: 'She perceived him as sexually excited by it.',
    themes: ['disclosure', 'sexual autonomy', 'other partners', 'shame', 'arousal'],
    dateNote: 'Date not recorded in any source.',
  },
  {
    id: 'e_doc_less', date: null, datePrecision: 'unknown', category: 'statement',
    title: 'He says he likes her less than she likes him',
    original: 'At one point, he said that he liked her but not as much as she liked him and that he did not want more.',
    personIds: [ME, Y], initiatorId: Y, source: DOC, label: 'recorded',
    themes: ['asymmetry', 'declarations', 'limits'],
    dateNote: 'Date not recorded. It may coincide with 2025-10-05 ("he liked me a lot") or 2026-09-15 ("he cannot give me that"); this is not established.',
  },
  {
    id: 'e_doc_relationship_ask', date: null, datePrecision: 'unknown', category: 'conversation',
    title: 'She says she wants a relationship (family, clubs); he will "think about it"',
    original: 'At one point, she told him that she wanted a relationship partly to get her family off her back and to be able to go to clubs with him. He said he would think about it.',
    personIds: [ME, Y], initiatorId: ME, source: DOC, label: 'recorded',
    themes: ['relationship framing', 'family', 'relationship goals'],
    dateNote: 'Date not recorded. Possibly connected to the "kind of fake relationship" mentioned on 2026-09-06 (not established).',
  },
  {
    id: 'e_doc_agree_sex', date: '2026-10', datePrecision: 'approximate', sortKey: '2026-10-05b', category: 'reflection',
    title: 'She agrees to see him the next day: "sex"',
    original: 'After another return, the user initially said no to seeing Yosef and then agreed to see him the following day. When asked why, she answered simply: “sex.”',
    personIds: [ME, Y], initiatorId: null, source: DOC, label: 'recorded',
    relatedEventIds: ['e_2026_10_05_mutual', 'e_2026_10_06_keys'],
    themes: ['desire', 'sexual autonomy'],
    dateNote: 'Inferred to be 2026-10-05 (she couldn’t that day), with the meeting on 2026-10-06. The match is an inference.',
  },
  {
    id: 'e_doc_face', date: '2024-11', datePrecision: 'approximate', sortKey: '2024-11-01b', category: 'reflection',
    title: 'The face: mystery and an imagined tortured soul',
    original: 'She saw Yosef’s face on a dating app and experienced a kind of immediate recognition: a modern version of love at first sight mediated by a profile. His eye bags and drooping eyelids became signs in her imagination, suggesting a tortured soul or a history she could not yet know. She described the prospect of being hurt as something like lemon on a fresh bruise.',
    personIds: [ME, Y], source: DOC, label: 'recorded',
    relatedEventIds: ['e_2024_11_fruitz'],
    themes: ['attraction', 'projection', 'mystery', 'narrative'],
    dateNote: 'A retrospective account of the first encounter. When she wrote it is not recorded.',
  },
];

// Narrative-document detail for the 2026-09-27 visit, attached as annotations so that both accounts
// (timeline and document) stay readable side by side.
const VISIT_DOC_ACCOUNT = `Narrative document account: she sent a bank transfer of €0.01 with the note “débloque moi juste pour ce soir” (“unblock me just for tonight”) and later jokingly asked for €500, referring to her sexual past. About thirty minutes after the first message he contacted her on Instagram, and she replied “god exists”. The conversation became sexual. He said he was coming; she understood this as a call or sexting, but he arrived at her home without warning. She went outside. He began touching her; she was aroused but resisted, said no, and gradually disentangled herself. He implied that because she had come outside she should admit she was horny and continue. She said she had never done this before. Her younger sister was at the door and her parents were awake. She told him to leave. She later sent “be m’en veux pas” (“don’t be mad at me”). He blocked her, which she had anticipated. She briefly feared he might expose private information to her family and cried, then felt some pride, a “small revenge”, given past Airbnb plans he had cancelled.`;

export const PATTERNS = [
  {
    id: 'pat_cycle', title: 'Rupture and return',
    description: 'Contact repeatedly ends (a block, a deletion, a declared ending) and then resumes. No ending in the record has held.',
    supportingEventIds: ['e_2025_07_10_joke', 'e_2025_07_26_airbnb', 'e_2025_08_24_snap', 'e_2025_09_05_return', 'e_2025_10_10_street', 'e_2025_10_29_whore', 'e_2025_11_03_moveon', 'e_2025_11_21_asleep', 'e_2025_11_26_add', 'e_2025_12_26_block', 'e_2026_01_14_add', 'e_2026_02_13_final', 'e_2026_03_03_contact', 'e_2026_05_31_deleted', 'e_2026_06_09_6am', 'e_2026_07_21_late', 'e_2026_09_08_block', 'e_2026_09_15_inlove', 'e_2026_09_27_visit', 'e_2026_10_05_mutual'],
    counterEventIds: [],
    evidenceNotes: 'The recurrence itself is observed. Why it happens is not established.',
    alternatives: ['Continued attraction on both sides', 'Unfinished emotional business', 'Convenience or sexual access', 'Habit', 'Curiosity', 'Unresolved conflict', 'A combination that changes from one episode to the next'],
    confidence: 'high', label: 'observed', personIds: [ME, Y], origin: 'document',
    revisionConditions: 'A sustained absence well beyond the longest recorded gap (about 2.5 months, December 2024 to March 2025), or an explicitly negotiated change in how contact works.',
  },
  {
    id: 'pat_both_end', title: 'Both of them end things, not only him',
    description: 'The narrative document frames the asymmetry as him withdrawing and blocking while she waits. The timeline also shows her ending, deleting, blocking or asking him to leave or block her, several times.',
    supportingEventIds: ['e_2025_07_10_joke', 'e_2025_09_19_love', 'e_2025_10_10_street', 'e_2025_11_03_moveon', 'e_2025_12_11_delete', 'e_2026_02_09_end', 'e_2026_09_06_unblock', 'e_2026_10_06_keys'],
    counterEventIds: ['e_2025_07_26_airbnb', 'e_2025_11_21_asleep', 'e_2025_12_26_block', 'e_2026_05_31_deleted', 'e_2026_09_08_block', 'e_2026_09_17_block', 'e_2026_09_27_visit'],
    evidenceNotes: 'Her endings tend to follow a hurt (ignored in the street, the Jibril hang-up, the way he spoke to her). His blocks tend to follow a refusal, a non-response or a disclosure. Recorded blocks and deletions by him still outnumber hers. This refines the asymmetry hypothesis rather than refuting it.',
    alternatives: ['Her endings respond to his behaviour, so the asymmetry framing still holds', 'Both use exit as leverage or self-protection', 'Exits are how this pair handles conflict in general'],
    confidence: 'moderate', label: 'inferred', personIds: [ME, Y], origin: 'oracle',
    revisionConditions: 'Clarification of who blocked whom on 2025-07-10, 2025-09-19 and in the July to September 2026 gap.',
  },
  {
    id: 'pat_block_after_refusal', title: 'His blocks often follow a refusal, a non-response or news of another man',
    description: 'Several of his blocks or exits come right after he did not get sexual access or attention, or after learning about another man.',
    supportingEventIds: ['e_2025_07_26_airbnb', 'e_2025_11_21_asleep', 'e_2025_12_10_jibril', 'e_2026_09_27_visit'],
    counterEventIds: ['e_2026_09_08_block', 'e_2026_05_31_deleted', 'e_2026_09_17_block', 'e_2025_07_06_rain'],
    evidenceNotes: 'On 2025-07-06 she refused and he apologised instead of leaving. The causes of the 2026-05-31, 2026-09-08 and 2026-09-17 blocks are not recorded. The correlation is suggestive, but four cases do not establish a cause.',
    alternatives: ['Wounded pride or a sense of rejection', 'Frustrated sexual expectation', 'Jealousy', 'Self-protection when he feels he cares more than he says', 'Coincidence with other pressures in his life'],
    confidence: 'low', label: 'contested', personIds: [Y], origin: 'oracle',
    revisionConditions: 'Learning what preceded the uncaused blocks; a future refusal that is not followed by a block, or a block with no preceding refusal.',
  },
  {
    id: 'pat_three_weeks', title: '“He comes back after about three weeks”',
    description: 'Her observation (narrative document §3): if she does not initiate, he tends to return after roughly three weeks.',
    supportingEventIds: ['e_2025_10_29_whore', 'e_2025_11_21_asleep', 'e_2026_01_14_add', 'e_2026_03_03_contact'],
    counterEventIds: ['e_2026_06_09_6am', 'e_2026_07_21_late', 'e_2026_10_05_mutual', 'e_2025_08_24_snap'],
    evidenceNotes: 'Measured on the timeline, his returns came 18 to 19 days after a rupture four times between October 2025 and March 2026 (Oct 10 → Oct 29, though an unseen message came earlier in October; Nov 3 → Nov 21; Dec 26 → Jan 14; Feb 13 → Mar 3). Other gaps: 29 days (Jul 26 → Aug 24 2025), 9 days (May 31 → Jun 9 2026), 8 days (Sep 27 → Oct 5 2026), and 33 days between the June 18 exchange and his July 21 return, although no cut is recorded there. In September and October 2026 the gaps were shorter. "About three weeks" fits the winter of 2025–26 well and recent behaviour less well.',
    alternatives: ['A real rhythm in his behaviour', 'Coincidence: a handful of gaps happen to cluster', 'A rhythm that has changed in autumn 2026'],
    confidence: 'moderate', label: 'contested', personIds: [Y], origin: 'document',
    revisionConditions: 'The next few return intervals. Use the interval analysis in the Patterns view.',
  },
  {
    id: 'pat_plans_collapse', title: 'Planned meetings (Airbnbs, the birthday gift) often collapse',
    description: 'Arranged meetings, especially ones she booked or that were framed as special, often fall through, while unplanned encounters (the field, late meetings) happen.',
    supportingEventIds: ['e_2025_07_26_airbnb', 'e_2025_09_05_return', 'e_2025_12_09_gift', 'e_2025_12_24_indifferent', 'e_2026_03_07_noairbnb'],
    counterEventIds: ['e_2025_05_28_first', 'e_2025_07_06_rain'],
    evidenceNotes: 'The first meeting (an Airbnb) did happen. The field encounters are spontaneous or local.',
    alternatives: ['Commitment avoidance: planning signals seriousness', 'Practical constraints', 'Ruptures happen to fall before plans', 'Spontaneity is part of what he finds exciting'],
    confidence: 'low', label: 'inferred', personIds: [ME, Y], origin: 'oracle',
    revisionConditions: 'Plans that are kept, or collapses with clearly unrelated causes.',
  },
  {
    id: 'pat_other_men', title: 'His reactions to her other partners point in opposite directions',
    description: 'Learning about Jibril led to a hang-up and a rupture. Learning about sex work and sugar daddies appeared to excite him. The product brief also notes apparent arousal or fascination in some of his reactions.',
    supportingEventIds: ['e_doc_disclosure'],
    counterEventIds: ['e_2025_12_10_jibril'],
    evidenceNotes: 'Two disclosures, two different reactions. The difference may be between a specific rival (Jibril) and an abstract sexual past, or it may depend on timing and framing. The record does not say.',
    alternatives: ['A specific rival threatens; a past is erotic', 'Arousal and jealousy coexist', 'Different circumstances: the Jibril news came during a birthday plan', 'Her perception of his arousal may be partly projection (unknown)'],
    confidence: 'low', label: 'contested', personIds: [Y], origin: 'document',
    revisionConditions: 'Any further disclosure and his reaction; the date of the sex-work disclosure.',
  },
  {
    id: 'pat_declare_then_return', title: 'Stated limits sit alongside continued pursuit',
    description: 'He has repeatedly stated limits ("indifferent", "ending definitively", "can’t give you that", likes her less) and has continued to seek contact and sex.',
    supportingEventIds: ['e_2025_12_24_indifferent', 'e_2026_02_13_final', 'e_2026_09_15_inlove', 'e_doc_less', 'e_2026_03_03_contact', 'e_2026_10_05_mutual'],
    counterEventIds: [],
    evidenceNotes: 'The narrative document: “His stated limits and his recurring returns can coexist.” The statements and the returns do not contradict each other unless one assumes that returning implies wanting more.',
    alternatives: ['He means the limits; the returns are about sex or company', 'The limits are defensive and understate what he feels', 'His feelings vary over time'],
    confidence: 'high', label: 'observed', personIds: [Y], origin: 'document',
    revisionConditions: 'A statement or action from him that changes what he offers.',
  },
];

export const QUESTIONS = [
  { id: 'q_why_return', text: 'Why does he come back?', whyItMatters: 'It is the question the relationship keeps raising, and the one most prone to being answered by a satisfying story.',
    evidenceEventIds: ['e_2025_09_05_return', 'e_2025_10_29_whore', 'e_2026_03_03_contact', 'e_2026_07_21_late', 'e_2026_10_05_mutual'],
    possibleAnswers: ['Attraction and sex', 'Attachment he does not name', 'Habit or convenience', 'Unfinished conflict', 'Different reasons each time'],
    discriminatingEvidence: 'What he says unprompted when he returns; whether returns without a sexual frame occur; whether he returns when sex is off the table.',
    personIds: [Y] },
  { id: 'q_love', text: 'Does he love her, and if so, in what sense?', whyItMatters: 'His words point one way ("indifferent", "can’t give you that") and some of his actions another (apologies, returns, "love of his now"?).',
    evidenceEventIds: ['e_2025_10_05_now', 'e_2025_12_24_indifferent', 'e_2026_09_15_inlove', 'e_doc_less'],
    possibleAnswers: ['No, and he says so', 'Partly, in a way he will not or cannot commit to', 'It varies', 'Unknowable from the outside'],
    discriminatingEvidence: 'Consistency between what he says and does over time. There may be no decisive evidence.',
    personIds: [Y] },
  { id: 'q_change', text: 'Will he act differently, as he said after Ethiopia?', whyItMatters: 'A stated intention to change (2026-06-13) and a promise not to block (January 2026) are both on record.',
    evidenceEventIds: ['e_2026_01_sex', 'e_2026_06_13_ethiopia', 'e_2026_09_08_block', 'e_2026_09_17_block', 'e_2026_09_27_visit'],
    possibleAnswers: ['No change so far: blocks continued after both promises', 'Change in some respects not captured by the timeline'],
    discriminatingEvidence: 'Behaviour after the trip; whether the trip happened.',
    personIds: [Y] },
  { id: 'q_inner_world', text: 'Would he understand her fuller inner world if she showed it?', whyItMatters: 'She hides behind complex humour; the mystery runs both ways.',
    evidenceEventIds: [], possibleAnswers: ['Yes', 'No', 'Partly', 'He has not been given the chance'],
    discriminatingEvidence: 'Only a different kind of conversation, if she chooses to have one.', personIds: [Y] },
  { id: 'q_vessel', text: 'What is the relationship a vessel for?', whyItMatters: 'She has said that Yosef may be a vessel through which she is trying to understand something more fundamental than attachment.',
    evidenceEventIds: ['e_doc_face'], possibleAnswers: ['Meaning and cruelty in life', 'Desire as a peak-and-flatness cycle', 'Power and gendered scripts', 'Her own limits', 'Something not yet named'],
    discriminatingEvidence: 'Which questions persist when Yosef is absent from the conversation.', personIds: [ME] },
  { id: 'q_narrative_stance', text: 'Will the "let the narrative run" stance last?', whyItMatters: 'It is her current organising idea; it may hold, change, or coexist with renewed intensity.',
    evidenceEventIds: ['e_2026_10_06_keys', 'e_2026_10_08_bac'], possibleAnswers: ['It holds', 'It gives way to intense attachment', 'Both coexist'],
    discriminatingEvidence: 'How she describes the next return and its aftermath.', personIds: [ME] },
  { id: 'q_other_men', text: 'What does his reaction to her other partners mean?', whyItMatters: 'The two recorded reactions point in opposite directions.',
    evidenceEventIds: ['e_2025_12_10_jibril', 'e_doc_disclosure'], possibleAnswers: ['Jealousy', 'Arousal or fascination', 'Both', 'Depends on the rival'],
    discriminatingEvidence: 'Further reactions; when the sex-work disclosure happened relative to Jibril.', personIds: [Y] },
  { id: 'q_gaps', text: 'What happened in the unrecorded gaps?', whyItMatters: 'Several transitions are missing: who blocked whom on 2025-07-10, how contact resumed before 2025-07-26, and when and why she blocked him between 2026-07-21 and 2026-09-06.',
    evidenceEventIds: ['e_2025_07_10_joke', 'e_2025_07_26_airbnb', 'e_2026_09_06_unblock'], possibleAnswers: [],
    discriminatingEvidence: 'Her memory or saved messages.', personIds: [ME, Y] },
  { id: 'q_bac', text: 'What changes if the man who called her dumb lied about his own education?', whyItMatters: 'A new event (2026-10-08) about intelligence, honesty and power. She has said that being called dumb does not particularly hurt her. That she raised it herself may mean it mattered more than that (inferred).',
    evidenceEventIds: ['e_2026_10_08_bac'], possibleAnswers: ['It reframes "dumb" as projection on his part', 'It is about the lie more than the insult', 'It is a way to regain footing after October 6'],
    discriminatingEvidence: 'What she felt making the call; his response.', personIds: [ME, Y] },
];

export const BELIEFS = [
  { id: 'b_mystery', subject: Y, asOf: '2024-11', datePrecision: 'approximate', label: 'recorded', source: DOC,
    text: 'He is a mystery to decode: a face containing a story, a tortured soul.', evidenceEventIds: ['e_doc_face'], supersededBy: 'b_narrative_runs' },
  { id: 'b_not_serious', subject: 'relationships', asOf: '2024-12', datePrecision: 'month', label: 'recorded', source: 'timeline',
    text: 'Not looking for anything serious (said by both).', evidenceEventIds: ['e_2024_12_yubo'] },
  { id: 'b_no_kids', subject: 'relationships', asOf: '2025-06-02', label: 'recorded', source: 'timeline',
    text: 'She does not want children or marriage.', evidenceEventIds: ['e_2025_06_02_field'] },
  { id: 'b_love_now', subject: Y, asOf: '2025-10-05', label: 'recorded', source: 'timeline',
    text: 'He is "the love of my now". She told him she loved him.', evidenceEventIds: ['e_2025_10_05_now'] },
  { id: 'b_whore', subject: 'self', asOf: '2025-10-29', label: 'recorded', source: 'timeline',
    text: 'After being ignored in the street, she felt like a whore.', evidenceEventIds: ['e_2025_10_29_whore'], supersededBy: 'b_mastered' },
  { id: 'b_mastered', subject: 'self', asOf: '2025-12-24', label: 'recorded', source: 'timeline',
    text: 'She has mastered her sexuality. Asked if she is his whore: "sometimes".', evidenceEventIds: ['e_2025_12_24_indifferent'] },
  { id: 'b_in_love', subject: Y, asOf: '2026-09-15', label: 'recorded', source: 'timeline',
    text: 'Asked whether she is in love with him: yes.', evidenceEventIds: ['e_2026_09_15_inlove'] },
  { id: 'b_no_partner', subject: 'relationships', asOf: '2026-10', datePrecision: 'approximate', label: 'recorded', source: DOC,
    text: 'She does not want a male life partner as a general goal. Yosef is an exception in her emotional life, not evidence of a secret wish for a conventional boyfriend.', evidenceEventIds: [] },
  { id: 'b_aim', subject: 'self', asOf: '2026-10', datePrecision: 'approximate', label: 'recorded', source: DOC,
    text: 'Her aim is not to stop wanting Yosef, but never again to let another man treat her this way. She is knowingly indulging in something like a "sin" in order to learn deeply.', evidenceEventIds: [] },
  { id: 'b_narrative_runs', subject: Y, asOf: '2026-10', datePrecision: 'approximate', label: 'recorded', source: DOC,
    text: '“Now the narrative is just me in life and him whatever; we don’t know why he comes back and I let the narrative run.”', evidenceEventIds: [] },
  { id: 'b_dumb', subject: 'self', asOf: '2026-10', datePrecision: 'approximate', label: 'recorded', source: DOC,
    text: 'Being called dumb does not particularly hurt her. Her central fear is revealing her inner world and finding no matching response.', evidenceEventIds: [] },
  { id: 'b_brief_origin', subject: Y, asOf: '2026-10-09', label: 'recorded', source: SPEC,
    text: 'His reaction to her sexual experiences has at times seemed to include a particular kind of arousal or fascination. This is an observation to investigate, not proof of a particular psychological explanation.', evidenceEventIds: ['e_doc_disclosure'] },
];

// Interpretations offered in conversations before Oracle existed (recorded in the narrative document).
// Stored in Oracle's interpretive history so that Oracle does not "rediscover" them as new.
export const INTERPRETATIONS = [
  { id: 'oi_reward_cycle', text: 'The cycle resembles a reward loop (longing, uncertainty, anticipation, contact, excitement, disappointment, aftermath). Absence may amplify the intensity of reunion. This does not make her feelings fake.',
    evidenceIds: ['pat_cycle', 'pat_three_weeks'], personIds: [ME, Y], source: 'earlier AI conversation (narrative document §3)', status: 'proposed', label: 'inferred' },
  { id: 'oi_return_repair', text: 'A return is not repair. An ending can be sincere in the moment without predicting future behaviour, and a return can be sincere without amounting to repair.',
    evidenceIds: ['pat_cycle'], personIds: [Y], source: 'earlier AI conversation (narrative document §3, §16)', status: 'proposed', label: 'inferred' },
  { id: 'oi_vessel', text: 'The relationship may compress larger questions (meaning, cruelty, anticipation, recurrence) into a repeatable sequence. Yosef may be a vessel for them.',
    evidenceIds: ['q_vessel'], personIds: [ME], source: 'earlier AI conversation (narrative document §4)', status: 'proposed', label: 'inferred' },
  { id: 'oi_gender_labour', text: 'A gendered asymmetry: he can withdraw, block and return while she does more of the waiting, interpreting and emotional processing. Re-entry can restore hope without requiring repair.',
    evidenceIds: ['pat_cycle', 'pat_both_end'], personIds: [ME, Y], source: 'earlier AI conversation (narrative document §13)', status: 'proposed', label: 'contested',
    userResponse: '' },
  { id: 'oi_providence', text: 'The move from "god exists" to "there was just Yosef" is the loss of a providential reading: a striking coincidence that guaranteed nothing.',
    evidenceIds: ['e_2026_09_27_visit'], personIds: [ME], source: 'earlier AI conversation (narrative document §7)', status: 'proposed', label: 'inferred' },
  { id: 'oi_scale', text: 'He was elevated to king or god while she is goddess or supernova. "Him whatever" may be an attempt to return him to human scale rather than a sign of indifference.',
    evidenceIds: ['b_narrative_runs'], personIds: [ME, Y], source: 'earlier AI conversation (narrative document §6)', status: 'proposed', label: 'inferred' },
];

export function buildCase() {
  const events = [...EVENTS, ...DOC_EVENTS].map((e) => ({
    ...e,
    initiatorId: e.initiatorId !== undefined ? e.initiatorId : (INITIATORS[e.id] ?? null),
    contactEffect: contactEffect(e.id),
    contactActorId: e.id in CONTACT_ACTOR ? CONTACT_ACTOR[e.id]
      : contactEffect(e.id) === 'none' ? null : (e.initiatorId ?? INITIATORS[e.id] ?? null),
  }));
  const annotations = [
    { eventId: 'e_2026_09_27_visit', kind: 'note', author: 'user', label: 'recorded', text: VISIT_DOC_ACCOUNT },
    { eventId: 'e_2026_09_27_visit', kind: 'note', author: 'oracle', label: 'observed',
      text: 'The two accounts differ in one detail. The timeline says the bank-app note said she was horny; the narrative document quotes it as “débloque moi juste pour ce soir”. There may have been several notes. This is not a contradiction about what happened.' },
    { eventId: 'e_2026_09_27_visit', kind: 'interpretation', author: 'oracle', label: 'recorded',
      text: 'Boundary sequence as recorded: she said no, resisted and disentangled herself. Arousal, going outside, and the earlier sexual messages did not amount to consent. This records what happened; it is not a verdict on how she should feel about it.' },
    { eventId: 'e_2026_10_08_bac', kind: 'link', author: 'oracle', label: 'inferred',
      text: 'Connects to the narrative document (§12): "she has clarified that being called dumb does not particularly hurt her." On 2026-10-08 she raised "you always called me dumb" herself. This is a possible tension worth examining, not a contradiction established.' },
  ];
  return { people: PEOPLE, events, patterns: PATTERNS, questions: QUESTIONS, beliefs: BELIEFS, interpretations: INTERPRETATIONS, annotations };
}
