import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNextTask } from '../src/core/next-task';
import type { TodoistTask } from '../src/todoist/types';

function task(id: string, overrides: Partial<TodoistTask> = {}): TodoistTask {
	return { id, project_id: 'p1', content: id, labels: [], due: null, deadline: null, ...overrides };
}

test('labelled task wins over dated tasks, matched case-insensitively', () => {
	const tasks = [
		task('t1', { due: { date: '2026-01-01' } }),
		task('t2', { labels: ['other', 'NEXT'] }),
	];
	assert.equal(pickNextTask(tasks, ' next ')?.id, 't2');
});

test('falls back to the earliest date when no task carries the label or no label is set', () => {
	const tasks = [
		task('t1', { due: { date: '2026-03-01' } }),
		task('t2', { due: { date: '2026-04-01' }, deadline: { date: '2026-02-01' } }),
		task('t3', { labels: ['next'] }),
	];
	assert.equal(pickNextTask(tasks, 'missing')?.id, 't2');
	assert.equal(pickNextTask(tasks)?.id, 't2');
});

test('time of day breaks ties within a day; untimed dates come last', () => {
	const tasks = [
		task('t1', { deadline: { date: '2026-03-01' } }),
		task('t2', { due: { date: '2026-03-01T15:00:00' } }),
		task('t3', { due: { date: '2026-03-01T09:00:00' } }),
	];
	assert.equal(pickNextTask(tasks)?.id, 't3');
});

test('returns null without tasks or without any labelled or dated task', () => {
	assert.equal(pickNextTask([], 'next'), null);
	assert.equal(pickNextTask([task('t1'), task('t2')], 'next'), null);
});
