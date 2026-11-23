import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterArticles, findArticle } from './articles.ts';

const matchingIds = (query) => filterArticles(query).map(({ id }) => id);

test('an empty or whitespace-only query lists every article in order', () => {
  const all = ['start-line', 'read-the-curve', 'judge-height', 'next-ball', 'read-progress'];
  assert.deepEqual(matchingIds(''), all);
  assert.deepEqual(matchingIds(' \t '), all);
});

test('all query terms must match, regardless of order, case or accents', () => {
  assert.deepEqual(matchingIds('   RÈFÉRENCE   low  '), ['judge-height']);
  assert.deepEqual(matchingIds('reference nonexistent'), []);
});

test('search matches prefixes and ignores apostrophe and punctuation variations', () => {
  assert.deepEqual(matchingIds("what's differ"), ['read-the-curve']);
  assert.deepEqual(matchingIds('distant, trees!'), ['judge-height']);
  assert.deepEqual(matchingIds('?!'), []);
});

test('search covers titles, group names, summaries, paragraphs, try-it text and diagram captions', () => {
  assert.deepEqual(matchingIds('where'), ['start-line']);
  assert.deepEqual(matchingIds('practice purpose'), ['next-ball', 'read-progress']);
  assert.deepEqual(matchingIds('usual shot using'), ['judge-height']);
  assert.deepEqual(matchingIds('distant trees'), ['judge-height']);
  assert.deepEqual(matchingIds('finish sentence'), ['read-the-curve']);
  assert.deepEqual(matchingIds('bends peeled'), ['read-the-curve']);
});

test('article slugs resolve to the matching reader content', () => {
  assert.equal(findArticle('next-ball')?.title, 'What should I try on my next ball?');
  assert.equal(findArticle('not-an-article'), undefined);
});
