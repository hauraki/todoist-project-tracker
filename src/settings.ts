import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type TodoistProjectTrackerPlugin from './main';

export interface TptSettings {
	todoist_api_token: string;
	projects_folder: string;
}

export const DEFAULT_SETTINGS: TptSettings = {
	todoist_api_token: '',
	projects_folder: 'TPT',
};

const TOKEN_DESC =
	'Required. Find it in todoist under settings → integrations → developer. The plugin only reads from todoist and never writes to it.';
const FOLDER_DESC = 'Vault folder that holds the project files. Created on first import if missing.';

export class TptSettingTab extends PluginSettingTab {
	plugin: TodoistProjectTrackerPlugin;

	constructor(app: App, plugin: TodoistProjectTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Declarative API (Obsidian 1.13.0+). Makes settings searchable; display() below
	// is a fallback for the pre-1.13.0 versions this plugin still supports.
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Todoist API token',
				desc: TOKEN_DESC,
				control: {
					type: 'text',
					key: 'todoist_api_token',
					placeholder: 'API token',
				},
			},
			{
				name: 'Projects folder',
				desc: FOLDER_DESC,
				control: {
					type: 'text',
					key: 'projects_folder',
					placeholder: DEFAULT_SETTINGS.projects_folder,
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof TptSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const trimmed = typeof value === 'string' ? value.trim() : value;
		if (key === 'projects_folder') {
			this.plugin.settings.projects_folder = (trimmed as string) || DEFAULT_SETTINGS.projects_folder;
		} else if (key === 'todoist_api_token') {
			this.plugin.settings.todoist_api_token = trimmed as string;
		}
		await this.plugin.saveSettings();
	}

	// Deprecated since 1.13.0; kept only for Obsidian versions older than this
	// plugin's manifest minAppVersion allows, which never call getSettingDefinitions().
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Todoist API token')
			.setDesc(TOKEN_DESC)
			.addText((text) =>
				text
					.setPlaceholder('API token')
					.setValue(this.plugin.settings.todoist_api_token)
					.onChange(async (value) => {
						this.plugin.settings.todoist_api_token = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Projects folder')
			.setDesc(FOLDER_DESC)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.projects_folder)
					.setValue(this.plugin.settings.projects_folder)
					.onChange(async (value) => {
						this.plugin.settings.projects_folder =
							value.trim() || DEFAULT_SETTINGS.projects_folder;
						await this.plugin.saveSettings();
					}),
			);
	}
}
