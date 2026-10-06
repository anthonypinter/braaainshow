// Each template: blanks the user fills in, and lines read one at a time on camera.
// Each line has `text` (what they read) and `how` (the reading direction shown with it).
// Use {key} in a line's text to drop in that blank's answer. A key can be reused.

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

/** Split a template line into segments, marking which parts came from the user. */
export function fillLine(line, words) {
  const segs = [];
  let last = 0;
  for (const m of line.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), filled: false });
    segs.push({ text: (words[m[1]] ?? '').trim(), filled: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), filled: false });
  return segs;
}

export const segsToText = (segs) => segs.map((s) => s.text).join('');

/** How long a line stays on screen: scaled by word count. */
export function lineDurationMs(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(9000, Math.max(2500, 1500 + words * 350));
}
