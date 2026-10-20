import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatImportResult, type ImportResult } from '../src/core/import-result';

function result(overrides: Partial<ImportResult> = {}): ImportResult {
	return { created: 0, updated: 0, renamed: 0, deleted: 0, skipped: 0, ...overrides };
}

test('shows "No changes" when all counts are zero', () => {
	assert.equal(formatImportResult(result()), 'Todoist import finished\nNo changes');
});

test('lists only non-zero counts, in fixed order', () => {
	assert.equal(
		formatImportResult(result({ skipped: 1, created: 2, deleted: 3 })),
		'Todoist import finished\nCreated: 2\nMarked deleted: 3\nSkipped (name conflict): 1',
	);
});

test('lists every count when all are non-zero', () => {
	assert.equal(
		formatImportResult(result({ created: 1, updated: 2, renamed: 3, deleted: 4, skipped: 5 })),
		[
			'Todoist import finished',
			'Created: 1',
			'Updated: 2',
			'Renamed: 3',
			'Marked deleted: 4',
			'Skipped (name conflict): 5',
		].join('\n'),
	);
});
