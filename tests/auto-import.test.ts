import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	AUTO_IMPORT_SETTLE_MS,
	DEFAULT_AUTO_IMPORT_INTERVAL,
	isAutoImportDue,
	parseAutoImportInterval,
	type AutoImportState,
} from '../src/core/auto-import';

const minute = 60_000;

/** Obsidian open for an hour, visible, last import 20 minutes ago, 15-minute interval. */
function state(overrides: Partial<AutoImportState> = {}): AutoImportState {
	return {
		nowMs: 60 * minute,
		lastAttemptMs: 40 * minute,
		resumedAtMs: 0,
		intervalMinutes: 15,
		visible: true,
		...overrides,
	};
}

test('parseAutoImportInterval accepts the offered choices', () => {
	assert.equal(parseAutoImportInterval('0'), 0);
	assert.equal(parseAutoImportInterval('5'), 5);
	assert.equal(parseAutoImportInterval(' 60 '), 60);
});

test('parseAutoImportInterval falls back to the default for anything else', () => {
	for (const value of ['', 'abc', '7', '-15', '15.5']) {
		assert.equal(parseAutoImportInterval(value), DEFAULT_AUTO_IMPORT_INTERVAL, value);
	}
});

test('isAutoImportDue once the last import is older than the interval', () => {
	assert.equal(isAutoImportDue(state()), true);
	assert.equal(isAutoImportDue(state({ lastAttemptMs: 45 * minute })), true);
	assert.equal(isAutoImportDue(state({ lastAttemptMs: 46 * minute })), false);
});

test('isAutoImportDue right after opening, once settled, when nothing was imported yet', () => {
	const opened = { lastAttemptMs: 0, resumedAtMs: 1_000_000 };
	assert.equal(isAutoImportDue(state({ ...opened, nowMs: 1_000_000 + AUTO_IMPORT_SETTLE_MS - 1 })), false);
	assert.equal(isAutoImportDue(state({ ...opened, nowMs: 1_000_000 + AUTO_IMPORT_SETTLE_MS })), true);
});

test('isAutoImportDue waits for sync after coming back to the foreground', () => {
	const now = 60 * minute;
	assert.equal(isAutoImportDue(state({ resumedAtMs: now - 1000 })), false);
	assert.equal(isAutoImportDue(state({ resumedAtMs: now - AUTO_IMPORT_SETTLE_MS })), true);
});

test('isAutoImportDue never while hidden or turned off', () => {
	assert.equal(isAutoImportDue(state({ visible: false })), false);
	assert.equal(isAutoImportDue(state({ intervalMinutes: 0, lastAttemptMs: 0 })), false);
});
