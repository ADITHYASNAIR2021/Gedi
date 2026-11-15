// All catches remain immediate. Personalities change assistance, never input timing.
export const PERSONALITIES = {
  gentle: { label: 'SAHAAYI', detail: 'Gentle catch', color: '#9fbfa7', pump: 0.88, speed: 8.2, cue: 'Steady hands. Easy swing.' },
  playful: { label: 'KURUMBI', detail: 'Playful swing', color: '#d3aa70', pump: 1.12, speed: 8.8, cue: 'Big ears. Playful energy.' },
  mighty: { label: 'VEERAN', detail: 'Powerful swing', color: '#c1945f', pump: 1.23, speed: 9.4, cue: 'Strong catch. Build your arc.' },
  sleepy: { label: 'URAKKAM', detail: 'Drooping trunk', color: '#a9b0ca', pump: 0.9, speed: 8.4, cue: 'Sleepy eyes. Trunk sinks slowly.' },
  sneezy: { label: 'THUMMAL', detail: 'Sneeze launch', color: '#c7a093', pump: 1, speed: 8.6, cue: 'Twitching ears. Sneeze coming!' },
};
export function personalityFor(variant, name = '') {
  if (PERSONALITIES[variant]) return PERSONALITIES[variant];
  const hash = [...name].reduce((n, char) => n + char.charCodeAt(0), 0);
  return PERSONALITIES[['gentle', 'playful', 'mighty'][hash % 3]];
}
