// Story, chapter table, Kerala flavour text and the theri dictionary.

export const CHAPTERS = [
  {
    name: 'Pooram Morning', place: 'Thrissur · Thekkinkadu Maidan', end: 300, bpm: 108,
    sky: ['#5799a5', '#f5dfb4'], fog: '#d8d9ba', ground: '#b99861', water: false, night: false,
    gap: [3, 6], pedestal: 0, parasol: 0.55, monkey: 0, coconut: 0, bus: 0.12, auto: 0.3, boat: 0,
    sleepy: 0, sneezy: 0, baby: 0.12, sway: 0, anjaam: 0.85, kthrow: 0,
    props: ['temple', 'palm', 'crowd', 'pulikali', 'flex', 'pookalam', 'pandal'],
  },
  {
    name: 'Athirappilly Chase', place: 'Athirappilly Falls', end: 650, bpm: 116,
    sky: ['#2f8fb8', '#cfe9d0'], fog: '#b9dcc0', ground: '#5a8a3c', water: false, night: false,
    gap: [4, 7.5], pedestal: 1.6, parasol: 0.15, monkey: 0.35, coconut: 0.3, bus: 0.1, auto: 0.3, boat: 0,
    sleepy: 0, sneezy: 0.08, baby: 0.15, sway: 0.3, anjaam: 0.7, kthrow: 0.5,
    props: ['jungle', 'palm', 'waterfall', 'chayakada'],
  },
  {
    name: 'Backwater Bedlam', place: 'Alappuzha · Vembanad Kayal', end: 1050, bpm: 122,
    sky: ['#ff9a6b', '#ffe9c4'], fog: '#f6cfa5', ground: '#2e8a9a', water: true, night: false,
    gap: [4.5, 8.5], pedestal: 0.7, parasol: 0.2, monkey: 0.25, coconut: 0.4, bus: 0, auto: 0, boat: 0.65,
    sleepy: 0.08, sneezy: 0.12, baby: 0.15, sway: 0.5, anjaam: 0.6, kthrow: 0.6,
    props: ['palm', 'houseboat', 'cheenavala', 'lily'],
  },
  {
    name: 'Munnar Mist', place: 'Munnar · Tea Country', end: 1500, bpm: 128,
    sky: ['#7fa8c9', '#e6eef2'], fog: '#dfe8ec', ground: '#4a9450', water: false, night: false,
    gap: [5, 9], pedestal: 2.2, parasol: 0.15, monkey: 0.25, coconut: 0.1, bus: 0.1, auto: 0.3, boat: 0,
    sleepy: 0.3, sneezy: 0.22, baby: 0.18, sway: 0.7, anjaam: 0.55, kthrow: 0.7,
    props: ['teahill', 'kurinji', 'chayakada', 'jungle'],
  },
  {
    name: 'Pooram Night', place: 'Thrissur · Vedikettu', end: 2000, bpm: 136,
    sky: ['#0b0b2e', '#4a2a5e'], fog: '#2b1d44', ground: '#5a4632', water: false, night: true,
    gap: [5.5, 9.5], pedestal: 1.2, parasol: 0.5, monkey: 0.3, coconut: 0.2, bus: 0.12, auto: 0.35, boat: 0,
    sleepy: 0.15, sneezy: 0.22, baby: 0.15, sway: 0.9, anjaam: 0.6, kthrow: 0.9,
    props: ['temple', 'crowd', 'pulikali', 'pandal', 'flex', 'palm'],
  },
];

export const ENCORE_LENGTH = 500;
const LAST = CHAPTERS.length - 1;

// Story state that outlives a single frame: Encore only starts once the Nettipattam is recovered.
export const progress = { victory: false, victoryX: 0 };

export function chapterStart(index) {
  return index <= 0 ? 0 : CHAPTERS[Math.min(index, CHAPTERS.length) - 1].end;
}

// Chapter config for any distance. Index 5 is Encore: biomes cycle and get harder.
export function chapterAt(distance) {
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (distance < CHAPTERS[i].end) return { index: i, cfg: CHAPTERS[i], encore: false };
  }
  if (!progress.victory) return { index: LAST, cfg: CHAPTERS[LAST], encore: false };
  const loop = Math.floor(Math.max(0, distance - progress.victoryX) / ENCORE_LENGTH);
  const base = CHAPTERS[loop % CHAPTERS.length];
  const hard = Math.min(1 + loop * 0.06, 1.35);
  return {
    index: CHAPTERS.length,
    encore: true,
    cfg: {
      ...base,
      name: `Encore · ${base.name}`,
      bpm: Math.min(base.bpm + 10 + loop * 2, 150),
      gap: [base.gap[0] * hard, Math.min(base.gap[1] * hard, 11)],
      monkey: Math.min(base.monkey + 0.2, 0.6),
      sway: base.sway + 0.4,
      kthrow: 0,
    },
  };
}

// "[[spicy|clean]]" picks a side depending on the Theri toggle.
export const fmt = (text, theri) => text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (_, a, b) => (theri ? a : b));

export const INTRO = [
  {
    img: '/assets/gedi-boat.jpg',
    title: 'Thrissur. Pooram morning.',
    text: '30 caparisoned tuskers. A million people. Chenda melam warming up. And one certified <b>aanapremi</b> who knows every tusker by name, height and horoscope — <b>Adarshh S Kumar</b>. The gang just calls him <b>GEDI</b>.',
  },
  {
    emoji: '🐒👑',
    title: 'DISASTER!',
    text: '<b>Kurangan Kuttappan</b>, Kerala\'s most wanted banana bandit, just snatched the <b>Golden Nettipattam</b> off the forehead of the legendary tusker <b>Gajaveeran Ambadi Kannan</b>. No Nettipattam… no Pooram!',
  },
  {
    img: '/assets/gedi-thinking.jpg',
    title: '"[[Eda myre|Eda]] Kuttappa!!"',
    text: 'Gedi\'s chaya goes cold. The tuskers raise their trunks and look at the only man in Thrissur who speaks fluent Elephant.<br><i>"Gedi, pidicho!"</i> (Grab on!)',
  },
  {
    emoji: '🐘👆',
    title: 'How to be Tarzan',
    text: '<b>HOLD</b> to grab a trunk or tail · <b>LET GO</b> to fly.<br>Nose → tail → next nose. Watch the dotted arc, grab the gold rings.<br>Falling? If the aana likes you, his <b>ANJAAMKAAL</b> (the famous fifth leg 😏) drops down and slings you back up.',
  },
];

export const CHAPTER_CARDS = [
  null,
  {
    emoji: '🌴💦', title: 'Chapter 2 · Athirappilly Chase',
    text: 'Kuttappan: <i>"Hehehe! You only pulled my tail, Gedi-kutta. The Nettipattam is going on a Kerala tour!"</i><br>Gedi: <i>"[[Poda poori mone|Poda kuranga]]!"</i><br>Into the jungle — his cousins throw bananas and the coconuts are not friendly.',
  },
  {
    emoji: '🛶🌅', title: 'Chapter 3 · Backwater Bedlam',
    text: 'Kuttappan hijacked a kettuvallam into Vembanad Kayal! The ground is water now.<br>Snake boats will bounce you. And the aanas are bathing, so… the <b>anjaamkaal</b> is very relaxed. 😏',
  },
  {
    emoji: '🍵⛰️', title: 'Chapter 4 · Munnar Mist',
    text: 'Up in the tea hills it is cold. The elephants are <b>sleepy</b> (droopy trunks) and some are <b>sneezy</b> (AACHOO = free flight).<br>Gedi: <i>"[[Ee myru thanuppu|Enthoru thanuppu]]…"</i> Grab a chaya for a free save.',
  },
  {
    emoji: '🎆🐘', title: 'Chapter 5 · Pooram Night',
    text: 'Back in Thrissur. The vedikettu is about to start and Kannan still has a naked forehead.<br><b>Bonk Kuttappan 3 times</b> to make him drop the Nettipattam. All of Thrissur is watching, Gedi!',
  },
];

export const VICTORY = {
  img: '/assets/gedi-dance.jpg',
  title: 'GEDI GOT THE NETTIPATTAM!',
  text: 'Ambadi Kannan trumpets. The melam explodes. Kuttappan gets a lifetime ban from all bananas. Thrissur goes wild and Gedi does <b>THE dance</b>.<br>But the elephants are not done playing… <b>ENCORE MODE</b> — how far can you go?',
};

export const TAUNTS = [
  'Too slow, Gedi!', 'Banana venamo? 🍌', 'Catch me, aanapremi!', 'Nettipattam is MINE! 👑', 'Hehehe!',
  'Ninte aana is slow!', 'Gedi = thoppi!', 'Go home, Gedi-kutta!', 'Nice anjaamkaal ride? 😏',
];

// Adarshh's vocabulary. Shown when the Theri toggle is on (default).
export const THERI = [
  'ANDI!', 'MYRE!', 'POORI!', 'KOPP!', 'THENDI!', 'PANNI!', 'NAARI!', 'OOLA!', 'KUNNA!', 'POTTAN!',
  'ENTE ANDI!', 'PODA MYRE!', 'ENTHU MYRU!', 'POORI MONE!', 'ANDI KUTTAPPA!',
];
export const CLEAN = ['AIYYO!', 'SHEDA!', 'ENTAMMO!', 'AYYE!', 'CHE!', 'ENTE DEIVAME!', 'PODA!'];

export const CALLOUTS = {
  perfect: ['PWOLI!', 'KIDU!', 'ADIPOLI!', 'THAKARTHU!', 'MASS!', 'POLI SAANAM!'],
  beat: ['THAALAM!', 'MELAM BOOST!'],
  combo: ['ISHTAA!', 'ENTE GEDI!', 'THEE!'],
  bounce: ['BOING!', 'SAVED!'],
  anjaam: ['ANJAAMKAAL!', 'FIFTH LEG SAVE!', 'ANJAAMKAAL RESCUE!', 'AANA POWER! 🍆'],
  anjaamSaved: ['ENTAMMO!', 'NANNI AANE!', 'ATH KOLLAM!', 'ENTE PONNU AANE!', 'WHAT A LEG!'],
  boss: ['GOTCHA KUTTAPPA!', 'BONK!'],
};

export const GAME_OVER_LINES = [
  'Aiyyo Gedi! The elephants are disappointed.',
  'Paappan chettan says: more trunk, less ground.',
  'Even the kuttiyaana is laughing at you.',
  'Kuttappan is eating your bananas right now.',
  'The chenda drummers stopped. Awkward.',
  'Ambadi Kannan believes in you. Try again!',
  'Not even the anjaamkaal could save you this time.',
];

export const ELEPHANT_HOMES = [
  'Thiruvambadi', 'Paramekkavu', 'Guruvayur', 'Pambadi', 'Mangalamkunnu', 'Chirakkal', 'Puthuppally',
  'Cherpulassery', 'Ollukkara', 'Kuttankulangara', 'Thrikkadavoor', 'Chulliparambil',
];
export const ELEPHANT_NAMES = [
  'Kannan', 'Kesavan', 'Raman', 'Rajan', 'Karnan', 'Arjunan', 'Sivan', 'Ayyappan', 'Padmanabhan', 'Vishnu',
  'Sankaran', 'Gopalan', 'Chandran', 'Balaraman', 'Nandan', 'Madhavan', 'Ganapathi', 'Sivasundar', 'Vinayakan',
];

export const FLEX_LINES = [
  ['GEDI FANS', 'ASSOCIATION', 'Thrissur Unit'],
  ['AANAPREMI', 'OF THE YEAR', 'Gedi Annan'],
  ['MASS ENTRY', 'GEDI', 'coming soon'],
  ['HAPPY POORAM', 'wishes from', 'GEDI & 30 aanas'],
];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
