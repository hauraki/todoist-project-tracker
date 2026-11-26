import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectsBase, projectsBasePath } from '../src/core/projects-base';

function lines(base: string): string[] {
	return base.split('\n');
}

test('buildProjectsBase filters on the exact projects folder, and each view on its status', () => {
	const base = lines(buildProjectsBase('Traktion/Projects', '1.2.3'));
	assert.ok(base.includes(`    - 'file.folder == "Traktion/Projects"'`));
	assert.ok(base.includes('        - tpt_project_status == "active"'));
	assert.ok(base.includes('        - tpt_project_status == "archived"'));
	assert.ok(!base.includes('    - tpt_project_status == "active"'));
	assert.match(base[0] ?? '', /^# Created by Todoist Project Tracker 1\.2\.3\./);
});

test('buildProjectsBase escapes quotes and backslashes in the folder name for both YAML and the expression', () => {
	const base = lines(buildProjectsBase(`It's "mine" \\ #1`, '1.0.0'));
	assert.ok(base.includes(`    - 'file.folder == "It''s \\"mine\\" \\\\ #1"'`));
});

test('buildProjectsBase keeps the html quotes escaped inside the formulas', () => {
	const base = buildProjectsBase('TPT', '1.0.0');
	assert.ok(base.includes('html("<span class=\\"tpt-hash tpt-color-" + tpt_project_color + "\\">#</span>")'));
	assert.ok(base.includes('tpt_tasks_label_colors[index]'));
});

test('buildProjectsBase has Active and Archived views with every formula they use defined', () => {
	const base = buildProjectsBase('TPT', '1.0.0');
	assert.equal(base.match(/^ {2}- type: table$/gm)?.length, 2);
	assert.ok(base.includes('    name: Active'));
	assert.ok(base.includes('    name: Archived'));
	const defined = new Set([...base.matchAll(/^ {2}(\w+): /gm)].map((m) => m[1]));
	for (const [, name] of base.matchAll(/formula\.(\w+)/g)) {
		assert.ok(defined.has(name), `formula.${name} is used but not defined`);
	}
});

test('projectsBasePath puts the base next to the folder, named after it', () => {
	const none = () => false;
	assert.equal(projectsBasePath('TPT', none), 'TPT.base');
	assert.equal(projectsBasePath('Traktion/Projects', none), 'Traktion/Projects.base');
});

test('projectsBasePath picks the next free name instead of overwriting', () => {
	const taken = new Set(['Traktion/Projects.base', 'Traktion/Projects 1.base']);
	assert.equal(projectsBasePath('Traktion/Projects', (p) => taken.has(p)), 'Traktion/Projects 2.base');
});
