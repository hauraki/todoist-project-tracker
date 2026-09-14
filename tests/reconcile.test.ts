import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planReconciliation } from '../src/core/reconcile';
import { buildRemoteProjects } from '../src/core/remote';
import type { RemoteProject, TodoistProject } from '../src/todoist/types';

function project(name: string, overrides: Partial<TodoistProject> = {}): TodoistProject {
	return {
		id: `id-${name}`,
		name,
		color: 'red',
		parent_id: null,
		is_archived: false,
		is_favorite: false,
		description: '',
		...overrides,
	};
}

function remote(name: string): RemoteProject {
	return { project: project(name), rank: 1, tasks: [], parentName: null };
}

test('covers cases A, B and C', () => {
	const plan = planReconciliation(
		[remote('New'), remote('Exists/Here')],
		[
			{ baseName: 'Exists Here', projectName: 'Exists/Here' },
			{ baseName: 'Gone', projectName: 'Gone' },
		],
	);
	assert.deepEqual(plan.create.map((c) => c.baseName), ['New']);
	assert.deepEqual(plan.update.map((u) => u.baseName), ['Exists Here']);
	assert.deepEqual(plan.markDeleted.map((d) => d.baseName), ['Gone']);
	assert.equal(plan.conflicts.length, 0);
});

test('second project with the same normalized name is a conflict', () => {
	const plan = planReconciliation([remote('a/b'), remote('a:b')], []);
	assert.equal(plan.create.length, 1);
	assert.equal(plan.conflicts.length, 1);
	assert.equal(plan.conflicts[0]?.remote.project.name, 'a:b');
});

test('buildRemoteProjects drops inbox, ranks active projects and resolves parents', () => {
	const inbox = project('Inbox', { inbox_project: true });
	const work = project('Work');
	const child = project('Child', { parent_id: work.id });
	const archived = project('Archived', { is_archived: true, parent_id: work.id });
	const remotes = buildRemoteProjects(
		[inbox, work, child],
		[archived],
		new Map([[child.id, [{ id: 't', project_id: child.id, labels: [], due: null, deadline: null }]]]),
	);
	assert.deepEqual(
		remotes.map((r) => [r.project.name, r.rank, r.parentName, r.tasks.length]),
		[
			['Work', 1, null, 0],
			['Child', 2, 'Work', 1],
			['Archived', null, null, 0],
		],
	);
});
