// The Yosef case study: the user's documented timeline, imported verbatim.
//
// `original` is the user's own wording, unchanged (including typos). Neutral `summary` lines and
// `ambiguities` were added at import time and are labelled as such. Years for entries the user
// wrote without a year are inferred from the order of the list (marked in `dateNote`).
// No event has been invented to fill a gap; gaps are recorded in seed/yosef-case.js as unknowns.

const Y = 'p_yosef';
const ME = 'p_self';
const SRC = 'user timeline (pasted 2026-10-09)';
const INFERRED_YEAR = 'Year not written in the original; inferred from the order of the timeline.';

const ev = (id, date, datePrecision, category, title, original, extra = {}) => ({
  id, date, datePrecision, category, title, original,
  personIds: [ME, Y], source: SRC, label: 'recorded', ...extra,
});

export const EVENTS = [
  ev('e_2024_11_fruitz', '2024-11', 'month', 'meeting', 'Match on Fruitz',
    'november 2024 :fruitz matching\nI saw him and I found him instantly attractive we talked I asked his ethnicity he told me ethiopian and asked for mine (malian) the convo didn’t continue',
    { summary: 'Matched on Fruitz. She found him instantly attractive. They exchanged ethnicities (he is Ethiopian, she is Malian). The conversation did not continue.',
      feelingAtTime: 'Instant attraction.', themes: ['attraction', 'first contact', 'identity'] }),

  ev('e_2024_12_yubo', '2024-12', 'month', 'contact', 'Match again on Yubo; talk all night',
    'december 2024: yubo matching\nwe matched again on yubo I told him I remembered him and we started talking it was fun and witty then he asked for my insta and we talked the whole night. we both said we weren’t looking for anything serious',
    { summary: 'Matched again on Yubo. She said she remembered him. Fun, witty conversation; he asked for her Instagram and they talked all night. Both said they were not looking for anything serious.',
      quotes: [{ speaker: 'both', text: 'not looking for anything serious (paraphrase)' }],
      themes: ['attraction', 'expectations', 'humour'] }),

  ev('e_2024_12_13_cringe', '2024-12-13', 'day', 'conversation', '"Cringe" ratings; he says he has no time',
    'december 13 2024: told me I was cringe after a convo and I said not my beauty and my cringeyness he noted my beaut 7,5/10 and my cringiness an 8/10\nand I said do you still wanna pursue he said he had no time bc of work we stopped talking but kept eachother on social media',
    { summary: 'He called her cringe; she asked him to rate her beauty and her cringiness (7.5/10 and 8/10). She asked if he still wanted to pursue; he said he had no time because of work. They stopped talking but stayed connected on social media.',
      quotes: [{ speaker: 'Yosef', text: 'beauty 7.5/10, cringiness 8/10' }],
      themes: ['humour', 'withdrawal', 'evaluation'] }),

  ev('e_2025_03_story', '2025-03', 'month', 'contact', 'He replies to her story; she answers dryly',
    'march :talked to me again about a post I put on my story saying an artist had dumb lyrics I responded dryly',
    { dateNote: INFERRED_YEAR, summary: 'He messaged her about a story post (an artist with dumb lyrics). She responded dryly.',
      themes: ['return', 'initiative'] }),

  ev('e_2025_05_13_yubo', '2025-05-13', 'day', 'return', 'Matched again on Yubo; real start; sex mentioned',
    'may 13 2025: talked to me again as we matched on yubo again then that’s we really started talking and mentinned sec',
    { summary: 'They matched again on Yubo and "really started talking". Sex was mentioned.',
      ambiguities: ['"mentinned sec" read as "mentioned sex".'],
      themes: ['return', 'sexual chemistry'] }),

  ev('e_2025_05_23_face', '2025-05-23', 'day', 'conversation', 'He says he likes seeing her face in pleasure',
    'may 23 : told me he liked seeing my face in pleasure',
    { dateNote: INFERRED_YEAR, quotes: [{ speaker: 'Yosef', text: 'liked seeing my face in pleasure (as reported)' }],
      themes: ['sexual chemistry'] }),

  ev('e_2025_05_28_first', '2025-05-28', 'day', 'intimacy', 'First meeting: Airbnb, sex',
    'may 28: first time meeting airbnb we had sex that was so enjoyable I wet the whole bed after his fingering and the sex was amazing',
    { dateNote: INFERRED_YEAR, summary: 'First in-person meeting, at an Airbnb. Sex she describes as amazing and very enjoyable.',
      feelingAtTime: 'Intense pleasure; "amazing".', themes: ['sexual chemistry', 'pleasure', 'first meeting'] }),

  ev('e_2025_06_02_field', '2025-06-02', 'day', 'conversation', 'Glasses returned; field; no kids or marriage',
    'june 2: gave me my glasses back and we went to a field near my house we kissed and talked I told him I didn’t want kids nor marriage',
    { dateNote: INFERRED_YEAR, summary: 'He returned her glasses. They went to a field near her house, kissed and talked. She told him she did not want children or marriage.',
      themes: ['values', 'relationship goals', 'the field'] }),

  ev('e_2025_06_10_house', '2025-06-10', 'day', 'intimacy', 'At her house: smoking, sex, a long hug',
    'june 10: came to my house to smoke and have sex, the sex wasnt good because I was high but the hug after sex lasted for do',
    { dateNote: INFERRED_YEAR, summary: 'He came to her house to smoke and have sex. The sex was not good because she was high. The hug afterwards lasted a long time.',
      ambiguities: ['The end of the sentence ("lasted for do") is cut off or mistyped; the length of the hug is not recorded.'],
      themes: ['intimacy', 'tenderness'] }),

  ev('e_2025_06_19_field', '2025-06-19', 'day', 'intimacy', 'Field sex: "the best sex we ever had"',
    'june 19: field sex the best sex we ever had, again the field near my house we talked we hugge \niah”',
    { dateNote: INFERRED_YEAR, summary: 'Sex in the field near her house, which she calls the best they ever had. They talked and hugged.',
      ambiguities: ['The entry ends with garbled text ("iah”").'],
      themes: ['sexual chemistry', 'the field', 'tenderness'] }),

  ev('e_2025_07_06_rain', '2025-07-06', 'day', 'conflict', 'Rainy day: no place, parking-lot request, cinema, his apology',
    'july 6:  we just organuzed a meeting at like 10 am it was raining we were kissing desiring each other but didnt have anywhere to have sex, He said can you suvk me in the parking lit I was eww that’s gettho no then we we went to the cinema then tried to have sex but I was uncomfortable then we stopped and just slept and when we left I felt he was annoyed so my eyes got sad he asked what was wrong I said nothing then asked again he say he knows something is wrong , I said are you not happy to see me and he said yes he kissed when he left he sent me an apology  message',
    { dateNote: INFERRED_YEAR,
      summary: 'Morning meeting in the rain with nowhere to have sex. He asked for oral sex in the parking lot; she refused. They went to the cinema and tried to have sex, but she was uncomfortable and they stopped and slept. When they left she felt he was annoyed and became sad. He asked twice what was wrong. She asked if he was not happy to see her; he said he was, kissed her, and later sent an apology message.',
      quotes: [{ speaker: 'Yosef', text: 'can you suck me in the parking lot' }, { speaker: 'user', text: 'eww that’s ghetto, no' }, { speaker: 'user', text: 'are you not happy to see me' }],
      feelingAtTime: 'Uncomfortable; sad when she felt he was annoyed.',
      themes: ['boundaries', 'consent', 'plans', 'repair'] }),

  ev('e_2025_07_10_joke', '2025-07-10', 'day', 'rupture', 'Joke about his father; block',
    'july 10: blocked him a second time because I made a joke I said that’s your dad and it was a tiktok of a man in ethipia he is adopted and didnt find it funny',
    { dateNote: INFERRED_YEAR,
      summary: 'She joked "that’s your dad" about a TikTok of a man in Ethiopia. He is adopted and did not find it funny. A block followed.',
      ambiguities: [
        'Who blocked whom is unclear: the entry says "blocked him", but on July 13 she unblocked him and was "still blocked", which means he had also blocked her.',
        '"A second time" refers to an earlier block that is not in the timeline.',
      ],
      themes: ['conflict', 'adoption', 'humour', 'blocking'] }),

  ev('e_2025_07_13_apology', '2025-07-13', 'day', 'contact', 'She unblocks and apologises; she is still blocked',
    'july 13 : I unblocked him wrote an apology but  I was stil blocked',
    { dateNote: INFERRED_YEAR, themes: ['repair', 'blocking', 'initiative'] }),

  ev('e_2025_07_26_airbnb', '2025-07-26', 'day', 'plan', 'She rents an Airbnb; he asks for nudes, then blocks her',
    'july 26: I was sad that day and wanted to see him so I rented an airbnb he agreed to come then he asked me for nudes and blocked me',
    { dateNote: INFERRED_YEAR, summary: 'She was sad and rented an Airbnb to see him. He agreed to come, asked her for nudes, then blocked her.',
      feelingAtTime: 'Sad; wanted to see him.',
      ambiguities: ['Whether he ever came to the Airbnb is not stated.', 'How contact resumed between July 13 and July 26 is not recorded.'],
      themes: ['plans', 'blocking', 'sexual access'] }),

  ev('e_2025_08_24_snap', '2025-08-24', 'day', 'contact', 'He sends a Snapchat request, then deletes it',
    'august 24: made a snap request then deleted it',
    { dateNote: INFERRED_YEAR, themes: ['return', 'ambivalence'] }),

  ev('e_2025_09_05_return', '2025-09-05', 'day', 'return', 'He apologises; "next time, have sex before you block me"; distance',
    'september 5th: came back apologized for the last time we were talking I said next time you wanna block me let’s have sex before and we were supposed to see eachother in an airbnb but he started being distant',
    { dateNote: INFERRED_YEAR, summary: 'He came back and apologised for last time. She said that next time he wanted to block her they should have sex first. They planned to meet at an Airbnb, but he became distant.',
      quotes: [{ speaker: 'user', text: 'next time you wanna block me let’s have sex before' }],
      themes: ['return', 'repair', 'plans', 'blocking', 'humour'] }),

  ev('e_2025_09_19_love', '2025-09-19', 'day', 'rupture', '"The love of his life"; deletion',
    'september 19th: I asked if we were still gonna see eachother told me about the love of his life and deleted him',
    { dateNote: INFERRED_YEAR, summary: 'She asked whether they were still going to meet. He told her about "the love of his life". A deletion followed.',
      ambiguities: ['"deleted him": most likely she deleted him, which fits her coming back on October 5, but the sentence could also be read the other way.'],
      themes: ['love', 'rupture', 'plans'] }),

  ev('e_2025_10_05_now', '2025-10-05', 'day', 'return', '"Love of my now"; "I love you" / "I like you a lot"',
    'october 5: I came back to him after having a bad sexual experience, and asked why he talked about the love his life when he is the love of my now, he said it was about him not about me. I felt like he was rejecting me but then he repeated love of his now. I told him I loved him he said he liked me a lot.',
    { dateNote: INFERRED_YEAR, summary: 'After a bad sexual experience with someone else, she came back to him. She asked why he had talked about the love of his life when he is "the love of my now". He said it was about him, not her. She felt rejected, then he repeated "love of his now". She told him she loved him; he said he liked her a lot.',
      quotes: [{ speaker: 'user', text: 'the love of my now' }, { speaker: 'Yosef', text: 'it was about me, not about you (paraphrase)' }, { speaker: 'user', text: 'I love you (reported)' }, { speaker: 'Yosef', text: 'I like you a lot (reported)' }],
      feelingAtTime: 'Felt rejected, then partly reassured.',
      ambiguities: ['Whether "he repeated love of his now" means he described her as the love of his now, or echoed her phrase, is unclear.'],
      themes: ['love', 'asymmetry', 'return', 'declarations'] }),

  ev('e_2025_10_10_street', '2025-10-10', 'day', 'rupture', 'He ignores her in the street; she deletes him',
    'october 10: ignored me in the street so I deleted him',
    { dateNote: INFERRED_YEAR, themes: ['public recognition', 'rupture', 'shame'] }),

  ev('e_2025_10_unseen', '2025-10', 'month', 'contact', 'He sends a message she does not see',
    'october: he sent a message but I didn’t see it because I deleted',
    { dateNote: INFERRED_YEAR, sortKey: '2025-10-15', datePrecision: 'approximate', themes: ['return'] }),

  ev('e_2025_10_29_whore', '2025-10-29', 'day', 'return', '"I felt like a whore"; he says he noticed her and apologises',
    'october 29 : he came back to me, I told him I felt like a whore he told me he did realize he saw me when I started leaving and apologized',
    { dateNote: INFERRED_YEAR, summary: 'He came back. She told him she felt like a whore. He said he did realise; he saw her when she started leaving (refers to October 10) and apologised.',
      quotes: [{ speaker: 'user', text: 'I felt like a whore' }],
      feelingAtTime: 'Felt like a whore.',
      relatedEventIds: ['e_2025_10_10_street'],
      themes: ['shame', 'repair', 'public recognition', 'return'] }),

  ev('e_2025_11_03_moveon', '2025-11-03', 'day', 'rupture', 'He says it is not working; she asks him never to come back',
    'november 3: told me it wasnt working and to move on so I asked him to never come back',
    { dateNote: INFERRED_YEAR, quotes: [{ speaker: 'Yosef', text: 'it isn’t working, move on (paraphrase)' }, { speaker: 'user', text: 'never come back (paraphrase)' }],
      themes: ['ending', 'declarations'] }),

  ev('e_2025_11_21_asleep', '2025-11-21', 'day', 'rupture', 'He returns; she is asleep; he blocks her',
    'november 21: came back again then I didnt respond bc I was asleep so he blocked me',
    { dateNote: INFERRED_YEAR, themes: ['return', 'blocking', 'responsiveness'] }),

  ev('e_2025_11_26_add', '2025-11-26', 'day', 'contact', 'She adds him',
    'november 26: I added him', { dateNote: INFERRED_YEAR, themes: ['initiative', 'return'] }),

  ev('e_2025_11_27_nudes', '2025-11-27', 'day', 'intimacy', 'Talking again; she sends nudes from the day he ended things',
    'november 27 (today): we talked again and I sent him nudes I took the day he ended things',
    { dateNote: INFERRED_YEAR + ' "(today)" in the original shows this part of the timeline was written on this date.',
      summary: 'They talked again. She sent him nudes she had taken on the day he ended things (likely November 3).',
      relatedEventIds: ['e_2025_11_03_moveon'],
      themes: ['sexual chemistry', 'return', 'ending'] }),

  ev('e_2025_12_09_gift', '2025-12-09', 'day', 'plan', 'Birthday gift: sex and a vibrator',
    'decenber 9: he told me for my birthday gift we were gonna have sex and he was going to buy a vibrator',
    { dateNote: INFERRED_YEAR, themes: ['plans', 'sexual chemistry', 'birthday'] }),

  ev('e_2025_12_10_jibril', '2025-12-10', 'day', 'disclosure', 'He hangs up on learning about Jibril',
    'december 10: he hanged up the call upon knowing about jibril, when he was the one pushing for details while I intended not to say it',
    { dateNote: INFERRED_YEAR, personIds: [ME, Y, 'p_jibril'], summary: 'During a call he pushed for details. She had not intended to say it, but he learned about Jibril (another man) and hung up.',
      themes: ['jealousy', 'other partners', 'disclosure', 'rupture'] }),

  ev('e_2025_12_11_delete', '2025-12-11', 'day', 'rupture', 'She deletes him',
    'december 11: I deleted him', { dateNote: INFERRED_YEAR, themes: ['rupture'] }),

  ev('e_2025_12_24_indifferent', '2025-12-24', 'day', 'conversation', '"You don’t deserve it"; "indifferent"; "my whore" / "sometimes"',
    'december 24: I ask if the birthday gift still stands, he said I don’t deserve it I asked if he hated me or loved me and told me he was indifferent he just wanted to fuck me, I asked if he thought I was whore he said « no do you think you’re one » I said that mastered my sexuality and he said I was his whore (for context it was more sexual than disrespectful) I responded « sometimes »',
    { dateNote: INFERRED_YEAR,
      summary: 'She asked if the birthday gift still stood. He said she did not deserve it. She asked if he hated or loved her; he said he was indifferent and just wanted to have sex with her. She asked if he thought she was a whore; he said "no, do you think you’re one?" She said she had mastered her sexuality. He said she was his whore, which she reports as more sexual than disrespectful in context. She answered "sometimes".',
      quotes: [{ speaker: 'Yosef', text: 'you don’t deserve it' }, { speaker: 'Yosef', text: 'indifferent; just wanted to fuck me (reported)' }, { speaker: 'Yosef', text: 'no, do you think you’re one' }, { speaker: 'Yosef', text: 'you’re my whore (reported; sexual in context)' }, { speaker: 'user', text: 'sometimes' }],
      interpretationAtTime: '“My whore” was more sexual than disrespectful in context.',
      themes: ['sexual autonomy', 'shame', 'declarations', 'indifference', 'power'] }),

  ev('e_2025_12_26_block', '2025-12-26', 'day', 'rupture', 'He blocks her; she creates "nemeparlesplusjamais fdp"',
    'december 26: he blocks me I crate an account called « nemeparlesplusjamais fdp »',
    { dateNote: INFERRED_YEAR, summary: 'He blocked her. She created an account named "nemeparlesplusjamais fdp" (roughly: "never talk to me again, son of a bitch").',
      themes: ['blocking', 'anger', 'humour'] }),

  ev('e_2026_01_14_add', '2026-01-14', 'day', 'contact', 'Added for about two minutes, then deleted',
    'januray 14 added for like 2 min then deleted me',
    { dateNote: INFERRED_YEAR, summary: 'He added her for about two minutes, then deleted her.',
      ambiguities: ['The subject is implied; it reads as him adding her and then deleting her.'],
      themes: ['ambivalence', 'return'] }),

  ev('e_2026_01_sex', '2026-01', 'month', 'intimacy', 'Sex; "we’ll try to be more mature"',
    'junuary we had sex he said he wasn’t gonna block and that we would try to be more mature',
    { dateNote: INFERRED_YEAR + ' Day unknown; written after January 14 in the original, so it may be later in January.',
      sortKey: '2026-01-20', datePrecision: 'month',
      quotes: [{ speaker: 'Yosef', text: 'wasn’t going to block; we would try to be more mature (reported)' }],
      themes: ['promises', 'sexual chemistry', 'repair'] }),

  ev('e_2026_02_09_end', '2026-02-09', 'day', 'rupture', 'She ends things',
    'me ending things february 9', { dateNote: INFERRED_YEAR, themes: ['ending', 'initiative'] }),

  ev('e_2026_02_11_back', '2026-02-11', 'day', 'return', 'She comes back',
    'february 11 I came back to him', { dateNote: INFERRED_YEAR, themes: ['return', 'initiative'] }),

  ev('e_2026_02_13_final', '2026-02-13', 'day', 'rupture', 'He ends things "definitively"; she agrees',
    'february 13 he said he was ending things definetively I said itjanuary’s the best option',
    { dateNote: INFERRED_YEAR, quotes: [{ speaker: 'Yosef', text: 'ending things definitively (reported)' }, { speaker: 'user', text: 'it’s the best option' }],
      ambiguities: ['"itjanuary’s" is a typo, read as "it’s".'],
      themes: ['ending', 'declarations'] }),

  ev('e_2026_03_03_contact', '2026-03-03', 'day', 'return', 'He contacts her again',
    'march 3 he contacted me again', { dateNote: INFERRED_YEAR, themes: ['return'] }),

  ev('e_2026_03_07_noairbnb', '2026-03-07', 'day', 'plan', 'He does not want to come to the Airbnb',
    'march 7 he didn’t want to come to the airbnb', { dateNote: INFERRED_YEAR, themes: ['plans', 'withdrawal'] }),

  ev('e_2026_04_05_talk', '2026-04-05', 'day', 'return', 'Talking again',
    'april 5: we started talking again',
    { dateNote: INFERRED_YEAR, ambiguities: ['Who initiated is not recorded.'], themes: ['return'] }),

  ev('e_2026_05_31_deleted', '2026-05-31', 'day', 'rupture', 'He deletes her',
    'may 31: he deleted me', { dateNote: INFERRED_YEAR, ambiguities: ['No cause is recorded.'], themes: ['rupture'] }),

  ev('e_2026_06_09_6am', '2026-06-09', 'day', 'contact', '6 a.m. text, then a block within five minutes',
    'june 9: text at 6am blocks me five minutes',
    { dateNote: INFERRED_YEAR, summary: 'A text at 6 a.m., followed by a block within about five minutes.',
      ambiguities: ['Who texted is not explicit; it reads as him texting and then blocking her. "Five minutes" could be how long the block lasted or how long after the text it came.'],
      themes: ['ambivalence', 'blocking'] }),

  ev('e_2026_06_13_ethiopia', '2026-06-13', 'day', 'conversation', '"I’m going through a lot"; he wants to change after Ethiopia',
    'june 13: ask me why I don’t wanna talk and I say to him I feel bad im going trough a lot we can see eachother after his trip to ethipia he says he wants to change after ethiopa',
    { dateNote: INFERRED_YEAR, summary: 'He asked why she did not want to talk. She said she felt bad and was going through a lot, and that they could see each other after his trip to Ethiopia. He said he wanted to change after Ethiopia.',
      quotes: [{ speaker: 'Yosef', text: 'wants to change after Ethiopia (reported)' }],
      feelingAtTime: 'Feeling bad; going through a lot.',
      themes: ['promises', 'change', 'Ethiopia', 'self-protection'] }),

  ev('e_2026_06_18_witch', '2026-06-18', 'day', 'conflict', 'Hostile exchange: "witchcraft"; his remark about her killing herself',
    'june 18; I ask if he is okay and the conversation becomes antagonistis I ask him why he is so many  and tell him if he believes i’m a witch then i’m gonna make witchcraft to kill him he then proceeds to say that he is not scared because he knows ill kill myself because of how unstable I am',
    { dateNote: INFERRED_YEAR,
      summary: 'She asked if he was okay and the conversation turned hostile. She asked why he was so mean (likely meaning of "so many") and said that if he believed she was a witch, she would use witchcraft to kill him. He replied that he was not scared because he knew she would kill herself, given how unstable she is.',
      quotes: [{ speaker: 'user', text: 'if you believe I’m a witch then I’m gonna make witchcraft to kill you (reported)' }, { speaker: 'Yosef', text: 'not scared because you’ll kill yourself because of how unstable you are (reported)' }],
      ambiguities: ['"why he is so many" probably means "so mean".', 'The record implies he had called her a witch or suggested she was one; that exchange is not recorded.'],
      themes: ['conflict', 'cruelty', 'instability', 'witchcraft', 'power'] }),

  ev('e_2026_07_21_late', '2026-07-21', 'day', 'intimacy', 'He comes back; late meeting; talk and sex',
    'july 21: he came back and we saw eachother late talked and had sex',
    { dateNote: INFERRED_YEAR, ambiguities: ['Whether his trip to Ethiopia had happened by then is not recorded.'], themes: ['return', 'sexual chemistry'] }),

  ev('e_2026_09_06_unblock', '2026-09-06', 'day', 'contact', 'She unblocks him; mentions a "kind of fake relationship"',
    '6 september I unblocked home I mentioned a relationship kind of fake relationship ',
    { dateNote: INFERRED_YEAR, summary: 'She unblocked him and mentioned a relationship, a "kind of fake relationship".',
      ambiguities: ['When and why she had blocked him (between July 21 and September 6) is not recorded.', 'Whose relationship was "fake", and what that meant, is not recorded. It may relate to her telling him she wanted a relationship partly to get her family off her back (narrative document, §11).'],
      themes: ['return', 'relationship framing', 'family'] }),

  ev('e_2026_09_07_politics', '2026-09-07', 'day', 'intimacy', 'Field sex; politics comes up',
    'september 7: we had sex in the field again and politics came into the mix',
    { dateNote: INFERRED_YEAR, themes: ['the field', 'sexual chemistry', 'politics'] }),

  ev('e_2026_09_08_block', '2026-09-08', 'day', 'rupture', 'He blocks her',
    'september 8: he blocked me', { dateNote: INFERRED_YEAR, ambiguities: ['The cause is not recorded; it follows the political conversation of the previous day.'], themes: ['blocking'] }),

  ev('e_2026_09_15_inlove', '2026-09-15', 'day', 'intimacy', '"Are you in love?" "Yes." "I can’t give you that."',
    'september 15: we had sex he asked me if I was in love I said yes he said he cannot give me that and he desnt even have an ex',
    { dateNote: INFERRED_YEAR, summary: 'They had sex. He asked if she was in love; she said yes. He said he could not give her that, and that he does not even have an ex.',
      quotes: [{ speaker: 'Yosef', text: 'are you in love?' }, { speaker: 'user', text: 'yes' }, { speaker: 'Yosef', text: 'I cannot give you that; I don’t even have an ex (reported)' }],
      themes: ['love', 'asymmetry', 'declarations', 'limits'] }),

  ev('e_2026_09_17_block', '2026-09-17', 'day', 'rupture', 'He blocks again: "I’m not blocking you, you block me"',
    'september 17: he again blocked me I said i’m not blocking you you block me',
    { dateNote: INFERRED_YEAR, quotes: [{ speaker: 'user', text: 'I’m not blocking you, you block me' }], themes: ['blocking', 'agency'] }),

  ev('e_2026_09_21_yubo', '2026-09-21', 'day', 'contact', 'Brief talk on Yubo',
    '21 september : we talked on yubo briefly', { dateNote: INFERRED_YEAR, themes: ['return'] }),

  ev('e_2026_09_27_visit', '2026-09-27', 'day', 'conflict', 'Bank-app note; unexpected visit; she says no; he blocks her',
    'september 27: O sent him a note on the bank app saying I was horny and he came to my home but I said now is not the time so he blocked me',
    { dateNote: INFERRED_YEAR,
      summary: 'She sent him a note through a bank transfer saying she was horny. He came to her home. She said now was not the time, and he blocked her.',
      relatedEventIds: [],
      themes: ['consent', 'boundaries', 'family', 'blocking', 'providence'] }),

  ev('e_2026_10_05_mutual', '2026-10-05', 'day', 'return', 'He adds her; she can’t meet that day; they masturbate together',
    'october 5: he added me I said I couldn’t that day but we masturbated together',
    { dateNote: INFERRED_YEAR, themes: ['return', 'sexual chemistry'] }),

  ev('e_2026_10_06_keys', '2026-10-06', 'day', 'conflict', 'Picks her up from work; field sex; lost keys; "block me"',
    'october 6 : he came to see arch me to my work we fucked in the field then he lost his keys I didn’t like the way he talked to me so I told him to block me',
    { dateNote: INFERRED_YEAR, summary: 'He came to her work (to see or fetch her). They had sex in the field. He lost his keys. She did not like the way he talked to her and told him to block her.',
      ambiguities: ['"see arch me" probably means "search" (fetch) or "see".', 'What he said is not recorded.'],
      themes: ['the field', 'sexual chemistry', 'conflict', 'agency'] }),

  ev('e_2026_10_08_bac', '2026-10-08', 'day', 'conflict', 'Withheld-number call: "you called me dumb, but you lied about having the bac"',
    'October 8: I called him no caller id to say that he always called me dumb but he lied to me about having the bac ',
    { dateNote: INFERRED_YEAR, summary: 'She called him from a hidden number to say that he always called her dumb, yet he had lied to her about having the baccalauréat.',
      quotes: [{ speaker: 'user', text: 'you always called me dumb but you lied to me about having the bac (reported)' }],
      ambiguities: ['How she learned that he did not have the bac is not recorded.', 'His response is not recorded.'],
      themes: ['intelligence', 'deception', 'power', 'conflict'] }),
];
