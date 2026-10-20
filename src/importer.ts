import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import {
	applyTptFrontmatter,
	buildDeletedFrontmatter,
	buildProjectFrontmatter,
	localProjectFromFrontmatter,
	parseLabelFilter,
	tptFrontmatterMatches,
} from './core/frontmatter';
import { formatImportResult, type ImportResult } from './core/import-result';
import { buildRemoteProjects } from './core/remote';
import { planReconciliation, type LocalProject } from './core/reconcile';
import { TodoistClient } from './todoist/client';
import type { TodoistTask } from './todoist/types';
import type { TptSettings } from './settings';

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
	const labelFilter = parseLabelFilter(settings.label_filter ?? '');
	const nextTaskLabel = settings.next_task_label ?? '';

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
		await writeFrontmatter(app, file, buildProjectFrontmatter(remote, labelFilter, nextTaskLabel));
	}
	let updated = 0;
	let renamed = 0;
	for (const { baseName, local, remote } of plan.update) {
		let file = getProjectFile(app, folder, local.baseName);
		if (baseName !== local.baseName) {
			const renamedFile = await renameProjectFile(app, folder, file, baseName);
			if (renamedFile) {
				file = renamedFile;
				renamed++;
			} else {
				console.warn(
					`[TPT] Kept file name "${local.baseName}" for Todoist project "${remote.project.name}": "${baseName}.md" already exists.`,
				);
			}
		}
		if (await writeFrontmatter(app, file, buildProjectFrontmatter(remote, labelFilter, nextTaskLabel))) {
			updated++;
		}
	}
	let deleted = 0;
	for (const local of plan.markDeleted) {
		const file = getProjectFile(app, folder, local.baseName);
		const props = buildDeletedFrontmatter(local.projectName ?? local.baseName, local.projectId);
		if (await writeFrontmatter(app, file, props)) deleted++;
	}
	for (const { baseName, remote } of plan.conflicts) {
		console.warn(
			`[TPT] Skipped Todoist project "${remote.project.name}": file name "${baseName}" is empty or already used by another project.`,
		);
	}
	for (const { wantedBaseName, local, remote } of plan.renameConflicts) {
		console.warn(
			`[TPT] Kept file name "${local.baseName}" for Todoist project "${remote.project.name}": file name "${wantedBaseName}" is empty or already used by another project.`,
		);
	}

	return {
		created: plan.create.length,
		updated,
		renamed,
		deleted,
		skipped: plan.conflicts.length,
	};
}

export function showImportResult(result: ImportResult): void {
	new Notice(formatImportResult(result), 8000);
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
		const local = localProjectFromFrontmatter(child.basename, frontmatter);
		if (local) locals.push(local);
	}
	return locals;
}

function getProjectFile(app: App, folder: TFolder, baseName: string): TFile {
	const file = app.vault.getFileByPath(`${folder.path}/${baseName}.md`);
	if (!file) throw new Error(`Project file "${baseName}.md" disappeared during import.`);
	return file;
}

/**
 * Renames a project file to follow its Todoist project name. Returns `null` without renaming
 * when the target path is already taken, for example by a plain note.
 */
async function renameProjectFile(
	app: App,
	folder: TFolder,
	file: TFile,
	newBaseName: string,
): Promise<TFile | null> {
	const newPath = `${folder.path}/${newBaseName}.md`;
	if (app.vault.getAbstractFileByPath(newPath)) return null;
	// fileManager.renameFile also updates links to the file across the vault.
	await app.fileManager.renameFile(file, newPath);
	const renamed = app.vault.getFileByPath(newPath);
	if (!renamed) throw new Error(`Renamed project file "${newPath}" disappeared during import.`);
	return renamed;
}

/** Writes the `tpt_` properties unless the file already has them. Returns whether the file was written. */
async function writeFrontmatter(
	app: App,
	file: TFile,
	props: ReturnType<typeof buildProjectFrontmatter>,
): Promise<boolean> {
	const current = app.metadataCache.getFileCache(file)?.frontmatter;
	if (current && tptFrontmatterMatches(current, props)) return false;
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		applyTptFrontmatter(frontmatter, props);
	});
	return true;
}
