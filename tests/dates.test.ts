import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, toDateOnly, toSortKey } from '../src/core/dates';

test('handles the three Todoist date formats', () => {
	assert.equal(toDateOnly('2026-09-19'), '2026-09-19');
	assert.equal(toDateOnly('2026-09-19T15:30:00'), '2026-09-19');
	assert.match(toDateOnly('2026-09-19T12:00:00Z'), /^\d{4}-\d{2}-\d{2}$/);
});

test('dateRange returns first and last', () => {
	assert.deepEqual(dateRange(['2026-03-01', '2026-01-15', '2026-02-10']), {
		first: '2026-01-15',
		last: '2026-03-01',
	});
	assert.deepEqual(dateRange([]), { first: null, last: null });
});

test('toSortKey orders timed values before date-only values of the same day', () => {
	assert.equal(toSortKey('2026-09-19T15:30:00'), '2026-09-19T15:30:00');
	assert.equal(toSortKey('2026-09-19'), '2026-09-19T24:00:00');
	assert.match(toSortKey('2026-09-19T12:00:00Z'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
	assert.ok(toSortKey('2026-09-19T23:59:59') < toSortKey('2026-09-19'));
	assert.ok(toSortKey('2026-09-19') < toSortKey('2026-09-20T00:00:00'));
});
