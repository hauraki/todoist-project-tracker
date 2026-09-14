import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFileName } from '../src/core/filename';

test('replaces forbidden characters with a space', () => {
	assert.equal(normalizeFileName('foo/bar:baz'), 'foo bar baz');
	assert.equal(normalizeFileName('a\\b*c?d"e<f>g|h#i^j[k]l'), 'a b c d e f g h i j k l');
});

test('collapses whitespace and trims', () => {
	assert.equal(normalizeFileName('  Work / Life  '), 'Work Life');
});

test('keeps emojis and apostrophes', () => {
	assert.equal(normalizeFileName("Vietnam Trip '26 🎒"), "Vietnam Trip '26 🎒");
});

test('strips trailing dots', () => {
	assert.equal(normalizeFileName('Later...'), 'Later');
});

test('returns NFC form so names match files created by Obsidian', () => {
	const decomposed = 'ANÄS';
	assert.equal(normalizeFileName(decomposed), 'ANÄS');
	assert.equal(normalizeFileName(decomposed), 'Ä'.replace('Ä', 'ANÄS'));
});
