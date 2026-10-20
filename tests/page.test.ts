import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPage } from '../src/todoist/page';

test('accepts a page with a cursor or a null cursor', () => {
	assert.equal(isPage({ results: [], next_cursor: 'abc' }), true);
	assert.equal(isPage({ results: [{ id: '1' }], next_cursor: null }), true);
});

test('rejects non-objects', () => {
	assert.equal(isPage(null), false);
	assert.equal(isPage(undefined), false);
	assert.equal(isPage('<html>'), false);
	assert.equal(isPage([]), false);
});

test('rejects a missing or non-array results', () => {
	assert.equal(isPage({ next_cursor: null }), false);
	assert.equal(isPage({ results: {}, next_cursor: null }), false);
});

test('rejects a missing or non-string cursor', () => {
	assert.equal(isPage({ results: [] }), false);
	assert.equal(isPage({ results: [], next_cursor: 42 }), false);
});
