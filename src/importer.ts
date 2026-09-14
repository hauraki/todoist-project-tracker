import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import {
	applyTptFrontmatter,
	buildDeletedFrontmatter,
	buildProjectFrontmatter,
	isTptKey,
} from './core/frontmatter';
import { buildRemoteProjects } from './core/remote';
import { planReconciliation, type LocalProject } from './core/reconcile';
import { TodoistClient } from './todoist/client';
import type { TodoistTask } from './todoist/types';
import type { TptSettings } from './settings';

export interface ImportResult {
	created: number;
	updated: number;
	deleted: number;
	skipped: number;
}

/** Runs one full import: fetch from Todoist, reconcile against the projects folder, write frontmatter. */
export async function importProjects(
	app: App,
	settings: TptSettings,
): Promise<ImportResult> {
	const token = settings.todoist_api_token.trim();
	if (!token) {
		throw new Error('No Todoist API token configured. Add it in the plugin settings.');
	}
	const client = new TodoistClient(token);

	// One paginated request for all tasks instead of one request per project.
	const [active, archived, tasks] = await Promise.all([
		client.getActiveProjects(),
		client.getArchivedProjects(),
		client.getActiveTasks(),
	]);
	const remotes = buildRemoteProjects(active, archived, groupByProject(tasks));

	const folder = await ensureFolder(app, settings.projects_folder);
	const locals = findLocalProjects(app, folder);
	const plan = planReconciliation(remotes, locals);

	for (const { baseName, remote } of plan.create) {
		const path = `${folder.path}/${baseName}.md`;
		// A file may already exist without being recognized as a project file
		// (for example a plain note with that name). Update it instead of failing.
		const file =
			app.vault.getFileByPath(path) ?? (await app.vault.create(path, ''));
		await writeFrontmatter(app, file, buildProjectFrontmatter(remote));
	}
	for (const { baseName, remote } of plan.update) {
		const file = getProjectFile(app, folder, baseName);
		await writeFrontmatter(app, file, buildProjectFrontmatter(remote));
	}
	for (const local of plan.markDeleted) {
		const file = getProjectFile(app, folder, local.baseName);
		await writeFrontmatter(
			app,
			file,
			buildDeletedFrontmatter(local.projectName ?? local.baseName),
		);
	}
	for (const { baseName, remote } of plan.conflicts) {
		console.warn(
			`[TPT] Skipped Todoist project "${remote.project.name}": file name "${baseName}" is empty or already used by another project.`,
		);
	}

	return {
		created: plan.create.length,
		updated: plan.update.length,
		deleted: plan.markDeleted.length,
		skipped: plan.conflicts.length,
	};
}

export function showImportResult(result: ImportResult): void {
	const lines = [
		'Todoist import finished',
		`Created: ${result.created}`,
		`Updated: ${result.updated}`,
		`Marked deleted: ${result.deleted}`,
	];
	if (result.skipped > 0) lines.push(`Skipped (name conflict): ${result.skipped}`);
	new Notice(lines.join('\n'), 8000);
}

function groupByProject(tasks: TodoistTask[]): Map<string, TodoistTask[]> {
	const byProject = new Map<string, TodoistTask[]>();
	for (const task of tasks) {
		const list = byProject.get(task.project_id);
		if (list) list.push(task);
		else byProject.set(task.project_id, [task]);
	}
	return byProject;
}

async function ensureFolder(app: App, folderSetting: string): Promise<TFolder> {
	const path = normalizePath(folderSetting.trim() || 'TPT');
	const existing = app.vault.getFolderByPath(path);
	if (existing) return existing;
	if (app.vault.getAbstractFileByPath(path)) {
		throw new Error(`"${path}" exists but is not a folder.`);
	}
	return app.vault.createFolder(path);
}

/** A local project is a markdown file directly in the folder with at least one `tpt_` frontmatter key. */
function findLocalProjects(app: App, folder: TFolder): LocalProject[] {
	const locals: LocalProject[] = [];
	for (const child of folder.children) {
		if (!(child instanceof TFile) || child.extension !== 'md') continue;
		const frontmatter = app.metadataCache.getFileCache(child)?.frontmatter;
		if (!frontmatter || !Object.keys(frontmatter).some(isTptKey)) continue;
		const name: unknown = frontmatter['tpt_project_name'];
		locals.push({
			baseName: child.basename,
			projectName: typeof name === 'string' ? name : null,
		});
	}
	return locals;
}

function getProjectFile(app: App, folder: TFolder, baseName: string): TFile {
	const file = app.vault.getFileByPath(`${folder.path}/${baseName}.md`);
	if (!file) throw new Error(`Project file "${baseName}.md" disappeared during import.`);
	return file;
}

async function writeFrontmatter(
	app: App,
	file: TFile,
	props: ReturnType<typeof buildProjectFrontmatter>,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		applyTptFrontmatter(frontmatter, props);
	});
}
