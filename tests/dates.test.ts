import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, toDateOnly } from '../src/core/dates';

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
