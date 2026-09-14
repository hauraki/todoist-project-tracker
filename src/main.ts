import { Notice, Plugin } from 'obsidian';
import { importProjects, showImportResult } from './importer';
import { DEFAULT_SETTINGS, TptSettingTab, type TptSettings } from './settings';

export default class TodoistProjectTrackerPlugin extends Plugin {
	settings!: TptSettings;
	private importRunning = false;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'import-projects',
			name: 'Import projects',
			callback: () => void this.runImport(),
		});

		this.addSettingTab(new TptSettingTab(this.app, this));
	}

	async runImport(): Promise<void> {
		if (this.importRunning) {
			new Notice('Todoist import is already running.');
			return;
		}
		this.importRunning = true;
		const progress = new Notice('Importing todoist projects…', 0);
		try {
			const result = await importProjects(this.app, this.settings);
			showImportResult(result);
		} catch (error) {
			console.error('[TPT] Import failed', error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Todoist import failed: ${message}`, 10000);
		} finally {
			progress.hide();
			this.importRunning = false;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TptSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
