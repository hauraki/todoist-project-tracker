import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planReconciliation, type LocalProject } from '../src/core/reconcile';
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

function remote(name: string, overrides: Partial<TodoistProject> = {}): RemoteProject {
	return { project: project(name, overrides), rank: 1, tasks: [], parentName: null };
}

function local(baseName: string, projectId: string | null = null, projectName = baseName): LocalProject {
	return { baseName, projectId, projectName };
}

test('covers cases A, B and C', () => {
	const plan = planReconciliation(
		[remote('New'), remote('Exists/Here')],
		[local('Exists Here', 'id-Exists/Here', 'Exists/Here'), local('Gone', 'id-Gone')],
	);
	assert.deepEqual(plan.create.map((c) => c.baseName), ['New']);
	assert.deepEqual(plan.update.map((u) => u.baseName), ['Exists Here']);
	assert.deepEqual(plan.markDeleted.map((d) => d.baseName), ['Gone']);
	assert.equal(plan.conflicts.length, 0);
	assert.equal(plan.renameConflicts.length, 0);
});

test('second project with the same normalized name is a conflict', () => {
	const plan = planReconciliation([remote('a/b'), remote('a:b')], []);
	assert.equal(plan.create.length, 1);
	assert.equal(plan.conflicts.length, 1);
	assert.equal(plan.conflicts[0]?.remote.project.name, 'a:b');
});

test('matches by id and plans a rename when the remote name changed', () => {
	const plan = planReconciliation(
		[remote('New Name', { id: 'p1' })],
		[local('Old Name', 'p1')],
	);
	assert.equal(plan.create.length, 0);
	assert.equal(plan.markDeleted.length, 0);
	assert.deepEqual(
		plan.update.map((u) => [u.local.baseName, u.baseName]),
		[['Old Name', 'New Name']],
	);
});

test('falls back to file name matching for locals without an id', () => {
	const plan = planReconciliation([remote('Legacy', { id: 'p1' })], [local('Legacy')]);
	assert.deepEqual(plan.update.map((u) => u.baseName), ['Legacy']);
	assert.equal(plan.create.length, 0);
});

test('id match wins over a file name match', () => {
	const plan = planReconciliation(
		[remote('B', { id: 'p1' }), remote('A', { id: 'p2' })],
		[local('A', 'p1'), local('B', 'p2')],
	);
	assert.deepEqual(
		plan.update.map((u) => [u.local.baseName, u.baseName]).sort(),
		[
			['A', 'B'],
			['B', 'A'],
		],
	);
});

test('a re-created project with the same name reuses the file of the deleted one', () => {
	const plan = planReconciliation([remote('Foo', { id: 'new' })], [local('Foo', 'old')]);
	assert.deepEqual(plan.update.map((u) => u.local.projectId), ['old']);
	assert.equal(plan.markDeleted.length, 0);
});

test('keeps the old file name when the new one is taken and reports it', () => {
	const plan = planReconciliation(
		[remote('Taken', { id: 'p1' }), remote('Renamed→Taken', { id: 'p2', name: 'Taken' })],
		[local('Taken', 'p1'), local('Something', 'p2')],
	);
	assert.deepEqual(
		plan.update.map((u) => [u.local.baseName, u.baseName]),
		[
			['Taken', 'Taken'],
			['Something', 'Something'],
		],
	);
	assert.deepEqual(
		plan.renameConflicts.map((c) => [c.local.baseName, c.wantedBaseName]),
		[['Something', 'Taken']],
	);
});

test('a rename never takes the file name of a deleted project', () => {
	const plan = planReconciliation([remote('Gone', { id: 'p1' })], [local('Gone', 'p0'), local('Live', 'p1')]);
	assert.deepEqual(plan.update.map((u) => u.baseName), ['Live']);
	assert.deepEqual(plan.markDeleted.map((d) => d.baseName), ['Gone']);
	assert.equal(plan.renameConflicts.length, 1);
});

test('buildRemoteProjects drops inbox, ranks active projects and resolves parents', () => {
	const inbox = project('Inbox', { inbox_project: true });
	const work = project('Work');
	const child = project('Child', { parent_id: work.id });
	const archived = project('Archived', { is_archived: true, parent_id: work.id });
	const remotes = buildRemoteProjects(
		[inbox, work, child],
		[archived],
		new Map([[child.id, [{ id: 't', project_id: child.id, content: 't', labels: [], due: null, deadline: null }]]]),
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
