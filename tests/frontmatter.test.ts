import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	applyTptFrontmatter,
	buildDeletedFrontmatter,
	buildProjectFrontmatter,
	collectLabels,
	parseLabelFilter,
	projectIdFromLink,
	tptFrontmatterMatches,
} from '../src/core/frontmatter';
import type { RemoteProject, TodoistProject } from '../src/todoist/types';

function project(overrides: Partial<TodoistProject> = {}): TodoistProject {
	return {
		id: 'p1',
		name: 'foo/bar',
		color: 'sky_blue',
		parent_id: null,
		is_archived: false,
		is_favorite: true,
		description: '',
		...overrides,
	};
}

test('active project gets all properties, sorted alphabetically', () => {
	const remote: RemoteProject = {
		project: project({ description: 'Hello' }),
		rank: 3,
		parentName: 'Work',
		tasks: [
			{ id: 't1', project_id: 'p1', content: 't1', labels: ['b', 'a'], due: { date: '2026-02-01' }, deadline: null },
			{ id: 't2', project_id: 'p1', content: 't2', labels: ['a'], due: { date: '2026-01-05T10:00:00' }, deadline: { date: '2026-03-01' } },
			{ id: 't3', project_id: 'p1', content: 't3', labels: [], due: null, deadline: { date: '2026-02-15' } },
		],
	};
	const fm = buildProjectFrontmatter(remote);
	assert.deepEqual(Object.keys(fm), [...Object.keys(fm)].sort());
	assert.deepEqual(fm, {
		tpt_parent_project_name: 'Work',
		tpt_project_color: 'sky_blue',
		tpt_project_description: 'Hello',
		tpt_project_id: 'p1',
		tpt_project_is_favorite: true,
		tpt_project_link: 'todoist://project?id=p1',
		tpt_project_name: 'foo/bar',
		tpt_project_rank: 3,
		tpt_project_status: 'active',
		tpt_tasks_count: 3,
		tpt_tasks_first_deadline_on: '2026-02-15',
		tpt_tasks_first_due_on: '2026-01-05',
		tpt_tasks_labels: ['a', 'b'],
		tpt_tasks_last_deadline_on: '2026-03-01',
		tpt_tasks_last_due_on: '2026-02-01',
		tpt_tasks_next_content: 't2',
	});
});

test('archived project gets the reduced property set', () => {
	const fm = buildProjectFrontmatter({
		project: project({ is_archived: true }),
		rank: null,
		parentName: null,
		tasks: [],
	});
	assert.deepEqual(fm, {
		tpt_parent_project_name: null,
		tpt_project_color: 'sky_blue',
		tpt_project_id: 'p1',
		tpt_project_link: 'todoist://project?id=p1',
		tpt_project_name: 'foo/bar',
		tpt_project_status: 'archived',
	});
});

test('deleted frontmatter keeps only id, name and status', () => {
	assert.deepEqual(buildDeletedFrontmatter('Old'), {
		tpt_project_name: 'Old',
		tpt_project_status: 'deleted',
	});
	assert.deepEqual(buildDeletedFrontmatter('Old', 'p1'), {
		tpt_project_id: 'p1',
		tpt_project_name: 'Old',
		tpt_project_status: 'deleted',
	});
});

test('projectIdFromLink extracts the id from a todoist project link', () => {
	assert.equal(projectIdFromLink('todoist://project?id=6Xg7hQ2'), '6Xg7hQ2');
	assert.equal(projectIdFromLink('https://todoist.com'), null);
	assert.equal(projectIdFromLink(undefined), null);
});

test('applyTptFrontmatter removes old tpt_ keys and keeps user keys first', () => {
	const fm: Record<string, unknown> = {
		tpt_project_rank: 9,
		mine: 'keep',
		tpt_tasks_count: 5,
		other: 1,
	};
	applyTptFrontmatter(fm, buildDeletedFrontmatter('Old'));
	assert.deepEqual(Object.keys(fm), ['mine', 'other', 'tpt_project_name', 'tpt_project_status']);
	assert.equal(fm['mine'], 'keep');
});

test('parseLabelFilter splits, trims, drops empties and duplicates, keeps order', () => {
	assert.deepEqual(parseLabelFilter(''), []);
	assert.deepEqual(parseLabelFilter(' Today, Week ,,Month, Today '), ['Today', 'Week', 'Month']);
});

test('collectLabels returns all labels sorted without a filter', () => {
	const tasks = [
		{ id: 't1', project_id: 'p1', content: 't1', labels: ['Week', 'Today'], due: null, deadline: null },
		{ id: 't2', project_id: 'p1', content: 't2', labels: ['Other'], due: null, deadline: null },
	];
	assert.deepEqual(collectLabels(tasks), ['Other', 'Today', 'Week']);
});

test('collectLabels keeps only filtered labels in filter order', () => {
	const tasks = [
		{ id: 't1', project_id: 'p1', content: 't1', labels: ['Week', 'Today'], due: null, deadline: null },
		{ id: 't2', project_id: 'p1', content: 't2', labels: ['Other'], due: null, deadline: null },
	];
	assert.deepEqual(collectLabels(tasks, ['Today', 'Week', 'Month']), ['Today', 'Week']);
	assert.deepEqual(collectLabels(tasks, ['Month']), []);
});

test('collectLabels matches filter labels case-insensitively and keeps the filter spelling', () => {
	const tasks = [
		{ id: 't1', project_id: 'p1', content: 't1', labels: ['today', 'WEEK'], due: null, deadline: null },
	];
	assert.deepEqual(collectLabels(tasks, ['Today', 'Week', 'Month']), ['Today', 'Week']);
});

test('buildProjectFrontmatter applies the label filter to tpt_tasks_labels', () => {
	const fm = buildProjectFrontmatter(
		{
			project: project(),
			rank: 1,
			parentName: null,
			tasks: [{ id: 't1', project_id: 'p1', content: 't1', labels: ['Week', 'Today', 'x'], due: null, deadline: null }],
		},
		['Today', 'Week'],
	);
	assert.deepEqual(fm['tpt_tasks_labels'], ['Today', 'Week']);
});

test('tptFrontmatterMatches ignores key order and user properties', () => {
	const props = { tpt_a: 1, tpt_b: ['x', 'y'], tpt_c: null };
	assert.equal(tptFrontmatterMatches({ title: 'mine', tpt_c: null, tpt_b: ['x', 'y'], tpt_a: 1 }, props), true);
});

test('tptFrontmatterMatches detects changed, missing and extra tpt keys', () => {
	const props = { tpt_a: 1, tpt_b: ['x', 'y'], tpt_c: null };
	assert.equal(tptFrontmatterMatches({ tpt_a: 2, tpt_b: ['x', 'y'], tpt_c: null }, props), false);
	assert.equal(tptFrontmatterMatches({ tpt_a: 1, tpt_b: ['y', 'x'], tpt_c: null }, props), false);
	assert.equal(tptFrontmatterMatches({ tpt_a: 1, tpt_b: ['x'], tpt_c: null }, props), false);
	assert.equal(tptFrontmatterMatches({ tpt_a: 1, tpt_b: ['x', 'y'] }, props), false);
	assert.equal(tptFrontmatterMatches({ tpt_a: 1, tpt_b: ['x', 'y'], tpt_c: null, tpt_d: 'old' }, props), false);
	assert.equal(tptFrontmatterMatches({ tpt_a: '1', tpt_b: ['x', 'y'], tpt_c: null }, props), false);
});

test('tptFrontmatterMatches accepts freshly applied properties', () => {
	const fm: Record<string, unknown> = { title: 'mine', tpt_old: 'gone' };
	const props = buildDeletedFrontmatter('Foo', 'p1');
	assert.equal(tptFrontmatterMatches(fm, props), false);
	applyTptFrontmatter(fm, props);
	assert.equal(tptFrontmatterMatches(fm, props), true);
});
