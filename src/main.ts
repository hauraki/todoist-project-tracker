import { Notice, Plugin } from 'obsidian';
import { registerAutoImport } from './auto-import';
import { importProjects, showImportResult } from './importer';
import { DEFAULT_SETTINGS, TptSettingTab, type TptSettings } from './settings';

export default class TodoistProjectTrackerPlugin extends Plugin {
	settings!: TptSettings;
	/** Start time of the last import, manual or background; `0` until the first one since load. */
	lastImportAttempt = 0;
	private importRunning = false;
	/** Set after a background import failed, so repeated failures show only one notice. */
	private backgroundErrorShown = false;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'import-projects',
			name: 'Import projects',
			callback: () => void this.runImport(),
		});

		this.addSettingTab(new TptSettingTab(this.app, this));
		registerAutoImport(this);
	}

	/** Background imports show no progress or result notice, and only the first of repeated errors. */
	async runImport({ background = false } = {}): Promise<void> {
		if (this.importRunning) {
			if (!background) new Notice('Todoist import is already running.');
			return;
		}
		this.importRunning = true;
		this.lastImportAttempt = Date.now();
		const progress = background ? null : new Notice('Importing todoist projects…', 0);
		// Debug level: hidden in the console unless "Verbose" is on. requestUrl calls don't
		// show in the desktop Network tab, so this is the way to see when imports run.
		console.debug(`[TPT] Import started (${background ? 'background' : 'manual'})`);
		try {
			const result = await importProjects(this.app, this.settings);
			console.debug('[TPT] Import finished', result);
			this.backgroundErrorShown = false;
			if (!background) showImportResult(result);
		} catch (error) {
			console.error('[TPT] Import failed', error);
			if (!background || !this.backgroundErrorShown) {
				const message = error instanceof Error ? error.message : String(error);
				const prefix = background ? 'Todoist auto-import failed' : 'Todoist import failed';
				new Notice(`${prefix}: ${message}`, 10000);
			}
			if (background) this.backgroundErrorShown = true;
		} finally {
			progress?.hide();
			this.importRunning = false;
		}
	}

	async loadSettings() {
		const data = ((await this.loadData()) ?? {}) as Record<string, unknown>;
		// Keep only known keys so stale ones (e.g. a former plain-text token) are dropped from data.json.
		const settings = { ...DEFAULT_SETTINGS };
		for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof TptSettings)[]) {
			if (typeof data[key] === 'string') settings[key] = data[key];
		}
		this.settings = settings;
		if (Object.keys(data).some((key) => !(key in DEFAULT_SETTINGS))) {
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
