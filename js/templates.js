// Each template: blanks the user fills in, and lines read one at a time on camera.
// Each line has `text` (what they read) and `how` (the reading direction shown with it).
// Use {key} in a line's text to drop in that blank's answer. A key can be reused.

// Warm-up prompts, answered one at a time on the welcome screen.
export const WARMUP = ['Noun', 'Action verb', 'Cute Animal', 'Human name', 'Horrible Food'];

// The real test: these blanks are asked one at a time (like the warm-up), then fill the madlib.
export const MAIN_MADLIB = {
  id: 'braaainshow',
  title: 'BRAAAINSHOW!?',
  blanks: [
    { key: 'adj1', label: 'Adjective' },
    { key: 'sound', label: 'Sound' },
    { key: 'geo', label: 'Geographic Feature' },
    { key: 'message', label: 'Type of Message' },
    { key: 'bodypart', label: 'Body Part' },
    { key: 'verb1', label: 'Action Verb' },
    { key: 'verb2', label: 'Different Action Verb' },
    { key: 'valuable', label: 'Something Valuable' },
    { key: 'gross', label: 'Something Gross' },
    { key: 'attribute', label: 'Human Attribute' },
    { key: 'food', label: 'Food' },
    { key: 'person', label: 'Type of person' },
    { key: 'verbing', label: 'Verb ending in ing' },
    { key: 'fear', label: 'Rational fear' },
    { key: 'pets', label: 'Weird pets' },
    { key: 'adj2', label: 'Adjective' },
    { key: 'pluralnoun', label: 'Plural noun' },
  ],
  // A line with `how` starts a new section: its direction pops up first. Lines without `how`
  // continue the same section straight away, with the direction still shown.
  // The whole theme as shown on the final screen: stanzas of lines, with the same {key} blanks.
  fullText: [
    [
      'The {adj1} {sound} erupts from {geo} of brain',
      'The {message} is issued, your {bodypart} in the chain!',
      '{verb1} the piñata! {verb2} treasures insane!',
      '{valuable} or {gross}? Your pleasure? Your pain?',
    ],
    ['BRAAAINSHOW!?', 'Human {attribute} tested! Opponents all bested!'],
    ['BRAAAINSHOW!?', '{food} digested! {person} arrested!'],
    [
      'Braaainshow!',
      '{verbing} and {fear} and {pets} and prizes and',
      '{adj2} {pluralnoun} in all shapes and sizes on',
    ],
    ['BRAAAINSHOW!?'],
    ['(explosion sound)'],
  ],
  lines: [
    { text: 'We Like it!', how: 'happy' },
    { text: 'The {adj1} {sound} erupts from {geo} of brain', how: 'Healthy Enthusiasm' },
    { text: 'The {message} is issued, your {bodypart} in the chain!' },
    { text: '{verb1} the piñata! {verb2} treasures insane!', how: 'MORE ENTHUSIASM' },
    { text: '{valuable} or {gross}? Your pleasure? Your pain?' },
    { text: 'BRAAAINSHOW!?', how: 'IN A MUSICAL' },
    { text: 'Human {attribute} tested! Opponents all bested!' },
    { text: 'BRAAAINSHOW!?', how: 'ANGRY OLD MAN' },
    { text: '{food} digested! {person} arrested!' },
    { text: 'Braaainshow!', how: 'CHILDREN’S TV SHOW HOST' },
    { text: '{verbing} and {fear} and {pets} and prizes and' },
    { text: '{adj2} {pluralnoun} in all shapes and sizes on' },
    { text: 'Braaainshow', how: 'whispered like a secret' },
    { text: 'BRAAAINSHOW!?', how: 'SHOUTED IN TRIUMPH' },
    { text: 'Braaainshow', how: 'As normal as possible' },
    { text: 'make a funny explosion sound effect', how: 'with your mouth' },
  ],
};

export const TEMPLATES = [
  {
    id: 'space-chef',
    title: 'The Space Chef',
    blurb: 'Dinner service at the galaxy’s strangest restaurant.',
    blanks: [
      { key: 'adj1', label: 'Adjective' },
      { key: 'food', label: 'Food (plural)' },
      { key: 'planet', label: 'Made-up planet name' },
      { key: 'verbing', label: 'Verb ending in -ing' },
      { key: 'animal', label: 'Animal' },
      { key: 'noise', label: 'Silly noise' },
      { key: 'number', label: 'Number' },
      { key: 'adj2', label: 'Adjective' },
      { key: 'bodypart', label: 'Body part' },
      { key: 'exclaim', label: 'Exclamation' },
    ],
    lines: [
      { text: 'Welcome aboard the most {adj1} restaurant in the galaxy.', how: 'Like a fancy waiter' },
      { text: 'I am the Space Chef, and tonight we are serving {food}.', how: 'Proudly, chest out' },
      { text: 'We grow them ourselves on the planet {planet}.', how: 'Dreamy, like you miss home' },
      { text: 'Our secret? We cook everything while {verbing}.', how: 'Lean in and whisper it' },
      { text: 'My assistant is a {animal} named Gerald.', how: 'Point off-camera at Gerald' },
      { text: 'Every time an order is ready, Gerald yells "{noise}!"', how: 'Yell the noise as loud as you can' },
      { text: 'Last night we served {number} hungry astronauts.', how: 'Exhausted, wipe your brow' },
      { text: 'One of them said the soup tasted {adj2}.', how: 'Offended' },
      { text: 'Another one got it all over his {bodypart}.', how: 'Trying not to laugh' },
      { text: '{exclaim}! That is why we now serve everything in zero gravity.', how: 'Throw your hands up' },
    ],
  },
  {
    id: 'weather-report',
    title: 'Tonight’s Weather',
    blurb: 'You are the evening forecaster. It is not going well.',
    blanks: [
      { key: 'place', label: 'A place' },
      { key: 'adj1', label: 'Adjective' },
      { key: 'plural', label: 'Plural noun' },
      { key: 'color', label: 'Color' },
      { key: 'verb', label: 'Verb' },
      { key: 'person', label: 'Someone you know' },
      { key: 'clothing', label: 'Article of clothing' },
      { key: 'number', label: 'Number' },
      { key: 'adj2', label: 'Adjective' },
      { key: 'snack', label: 'Snack food' },
    ],
    lines: [
      { text: 'Good evening, I’m your weather reporter, live from {place}.', how: 'Big TV-anchor voice' },
      { text: 'Today’s forecast is extremely {adj1}.', how: 'Very serious' },
      { text: 'This morning it rained {plural} for almost an hour.', how: 'Getting nervous' },
      { text: 'By lunchtime the whole sky had turned {color}.', how: 'Panicking a little' },
      { text: 'Experts recommend that you {verb} indoors until further notice.', how: 'Calm and slow, like everything is fine' },
      { text: 'I just spoke with {person}, who has never seen anything like it.', how: 'Shocked, hand on your cheek' },
      { text: 'If you go outside, please wear a {clothing}.', how: 'Pleading with the audience' },
      { text: 'Tomorrow we expect a high of {number} degrees.', how: 'Like a game-show host' },
      { text: 'The weekend looks {adj2}, with a chance of {snack}.', how: 'Sing it' },
      { text: 'That’s the weather. Back to you in the studio!', how: 'Way too cheerful' },
    ],
  },
  {
    id: 'nature-doc',
    title: 'Into the Wild',
    blurb: 'Narrate a nature documentary about a very rare creature.',
    blanks: [
      { key: 'place', label: 'A place' },
      { key: 'adj1', label: 'Adjective' },
      { key: 'animal', label: 'Animal' },
      { key: 'food', label: 'Food' },
      { key: 'verbing', label: 'Verb ending in -ing' },
      { key: 'bodyparts', label: 'Body part (plural)' },
      { key: 'sound', label: 'Sound' },
      { key: 'number', label: 'Number' },
      { key: 'name', label: 'Funny name' },
      { key: 'adj2', label: 'Adjective' },
    ],
    lines: [
      { text: 'Here, deep in the wilds of {place}, lives the rare {adj1} {animal}.', how: 'Hushed, nature-documentary voice' },
      { text: 'Few humans have ever seen one up close.', how: 'Whisper it' },
      { text: 'Every morning, it searches for its favorite meal: {food}.', how: 'Slowly, full of wonder' },
      { text: 'Watch closely as it begins {verbing}.', how: 'Barely holding in excitement' },
      { text: 'This is how it attracts a mate.', how: 'Very seriously' },
      { text: 'Look at those magnificent {bodyparts}.', how: 'In awe, like it’s beautiful' },
      { text: 'Listen. That {sound} means it has spotted us.', how: 'Freeze, then whisper it fast' },
      { text: 'Scientists believe there are only {number} left in the world.', how: 'Sad and dramatic' },
      { text: 'This one, we have named {name}.', how: 'Lovingly' },
      { text: 'Truly, nature is {adj2}.', how: 'Slowly, like the final line of a movie' },
    ],
  },
];

/** The full text as <p> stanzas, with the reader's words highlighted (final screen + watch page). */
export function fullTextNodes(stanzas, words) {
  return stanzas.map((stanza) => {
    const p = document.createElement('p');
    stanza.forEach((line, i) => {
      if (i) p.append(document.createElement('br'));
      for (const seg of fillLine(line, words)) {
        p.append(seg.filled ? Object.assign(document.createElement('span'), { className: 'hl', textContent: seg.text }) : seg.text);
      }
    });
    return p;
  });
}

/** Split a template line into segments, marking which parts came from the user. */
export function fillLine(line, words) {
  const segs = [];
  let last = 0;
  for (const m of line.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), filled: false });
    let word = (words[m[1]] ?? '').trim();
    // capitalize an answer that starts the line or a new sentence
    if (/^\s*$|[.!?]\s+$/.test(line.slice(0, m.index))) word = word.charAt(0).toUpperCase() + word.slice(1);
    segs.push({ text: word, filled: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), filled: false });
  return segs;
}

export const segsToText = (segs) => segs.map((s) => s.text).join('');

/** How long a line's reading direction is shown, alone, before the line itself appears. */
export const CUE_MS = 2000;

/** How long a line stays on screen: scaled by word count. */
export function lineDurationMs(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(9000, Math.max(2500, 1500 + words * 350));
}
