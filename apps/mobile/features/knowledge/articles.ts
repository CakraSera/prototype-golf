export const articleGroups = ['Read your ball flight', 'Practice with a purpose'] as const;

export type FlightDiagram = 'start' | 'curve' | 'height';

type Article = {
  id: string;
  group: (typeof articleGroups)[number];
  symbol: FlightDiagram | 'flag' | 'history';
  title: string;
  summary: string;
  paragraphs: readonly [string, string];
  tryIt: string;
  paths?: readonly { kind: FlightDiagram; caption: string }[];
  destination?: 'progress';
};

const articles: readonly Article[] = [
  {
    id: 'start-line', group: 'Read your ball flight', symbol: 'start',
    title: 'Where did my shot start?',
    summary: 'Use your target to call the first part of the flight.',
    paragraphs: [
      'Pick a flag or range marker before you hit. Imagine a line from your ball to that target. The start line is the direction the ball takes as it leaves the club.',
      'Suppose the ball takes off to the left of the flag, bends back and lands beside it. In Today, choose Left for the start line. The landing spot tells you where the trip ended. You’re recording where it began.',
    ],
    tryIt: 'Watch one ball. Say “left,” “straight” or “right” as soon as you see its starting direction. If you missed the start, tap Not sure and watch the next one.',
  },
  {
    id: 'read-the-curve', group: 'Read your ball flight', symbol: 'curve',
    title: 'Two shots finish right. What’s different?',
    summary: 'Separate the starting direction from the bend.',
    paragraphs: [
      'Imagine two balls landing beside the same range marker, to the right of your flag. One flew in a straight line the whole way. The other flew toward the flag at first, then peeled away.',
      'Describe each flight in two parts. For the first ball, the start was right and the curve was straight. For the second, the start was straight and the curve was right. Dial uses those two observations when it looks for a drill.',
    ],
    paths: [
      { kind: 'start', caption: 'Starts right, stays straight' },
      { kind: 'curve', caption: 'Starts straight, bends right' },
    ],
    tryIt: 'Finish this sentence about one shot before you enter it in Today. “It started ___, then it ___.”',
  },
  {
    id: 'judge-height', group: 'Read your ball flight', symbol: 'height',
    title: 'Was that shot low for me?',
    summary: 'Compare the height with your usual shot using the same club.',
    paragraphs: [
      'In Dial, “normal” means the height you usually see with the club you just used. Picture a familiar shot with that club, then watch how high the new ball climbs.',
      'If you usually see your 7-iron climb above a distant row of trees and this one stays well below it from the same bay, Low may describe what you saw. A partner hitting a different club gives you a different reference.',
    ],
    tryIt: 'Keep the same club and target for the next ball. Call low, normal or high. If you’re still learning what normal looks like, use Not sure.',
  },
  {
    id: 'next-ball', group: 'Practice with a purpose', symbol: 'flag',
    title: 'What should I try on my next ball?',
    summary: 'Turn the drill instruction into one thing you can do.',
    paragraphs: [
      'After an unexpected shot, enter what you saw in Today and open the matching drill. Read “Your next shot,” then put the instruction in your own words before another ball is on the tee.',
      'For a start-line check, that might sound like, “I’ll aim at the blue flag and call which side the ball starts on.” After the shot, ask yourself whether you managed to make that call. If your report has no matching drill yet, keep the observations you actually saw.',
    ],
    tryIt: 'Tell a practice partner your one action. Have them watch one attempt and tell you whether you explained it and tried it on your own.',
  },
  {
    id: 'read-progress', group: 'Practice with a purpose', symbol: 'history',
    title: 'What changed after my drill?',
    summary: 'Read a confidence change alongside your shot-reading score.',
    paragraphs: [
      'Before your drill, rate how sure you feel about what to try on the next ball. Answer the same question afterward. Going from 2/5 to 4/5 means you felt two points more certain about your next move.',
      'Shot reading answers a different question. A partner checks whether you named both the start and the curve on five paths. Your first set gives you a baseline. On another day, try a new set and compare the results in Progress.',
    ],
    tryIt: 'Open Skill stats. Pick one result you want to check next time, such as calling one more flight correctly or explaining your next action without help.',
    destination: 'progress',
  },
];

function normalizeSearch(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const searchIndex = articles.map(article => ({
  article,
  text: normalizeSearch([
    article.title, article.group, article.summary, ...article.paragraphs, article.tryIt,
    ...(article.paths ?? []).map(({ caption }) => caption),
  ].join(' ')),
}));

export function filterArticles(query: string): readonly Article[] {
  if (!query.trim()) return articles;
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const words = normalized.split(' ');
  const matches: Article[] = [];
  for (const { article, text } of searchIndex) {
    if (words.every(word => text.includes(word))) matches.push(article);
  }
  return matches;
}

export function findArticle(id: string) {
  return articles.find(article => article.id === id);
}
