import { Notice, type Plugin } from 'obsidian';
import { buildProjectsBase, projectsBasePath } from './core/projects-base';
import { projectsFolderPath } from './importer';
import type { TptSettings } from './settings';

/** Creates a sample base for the projects folder next to it and opens it in a new tab. */
export async function createProjectsBase(plugin: Plugin, settings: TptSettings): Promise<void> {
	const { app } = plugin;
	const folder = projectsFolderPath(settings);
	const path = projectsBasePath(folder, (p) => app.vault.getAbstractFileByPath(p) !== null);
	try {
		const file = await app.vault.create(path, buildProjectsBase(folder, plugin.manifest.version));
		await app.workspace.getLeaf('tab').openFile(file);
		new Notice(`Created ${path}`);
	} catch (error) {
		console.error('[TPT] Creating projects base failed', error);
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Could not create projects base: ${message}`, 10000);
	}
}
