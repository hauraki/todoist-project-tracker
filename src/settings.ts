import { App, PluginSettingTab, SecretComponent, Setting, type SettingDefinitionItem } from 'obsidian';
import { AUTO_IMPORT_INTERVALS, DEFAULT_AUTO_IMPORT_INTERVAL, parseAutoImportInterval } from './core/auto-import';
import type TodoistProjectTrackerPlugin from './main';

export interface TptSettings {
	/** ID of the secret in Obsidian's secret storage that holds the token, not the token itself. */
	todoist_api_token_secret: string;
	projects_folder: string;
	label_filter: string;
	next_task_label: string;
	/** Minutes between background imports as a string, e.g. "15"; "0" turns them off. */
	auto_import_interval: string;
}

export const DEFAULT_SETTINGS: TptSettings = {
	todoist_api_token_secret: '',
	projects_folder: 'TPT',
	label_filter: '',
	next_task_label: '',
	auto_import_interval: String(DEFAULT_AUTO_IMPORT_INTERVAL),
};

const TOKEN_DESC =
	'Required. Find it in todoist under settings → integrations → developer. Kept encrypted in Obsidian\'s keychain on this device and not synced with your vault, so add it on each device. The plugin only reads from todoist and never writes to it.';
const FOLDER_DESC = 'Vault folder that holds the project files. Created on first import if missing.';
const LABEL_FILTER_DESC =
	'Optional. Comma-separated list of labels, e.g. "Today, Week, Month". Only these labels are written to tpt_tasks_labels, in this order (matched case-insensitively). Leave empty to import all labels.';
const NEXT_TASK_LABEL_DESC =
	'Optional. The task with this label is written to tpt_tasks_next_content (matched case-insensitively). Use it on one task per project. Projects without a labelled task fall back to the task with the earliest due date or deadline.';

const AUTO_IMPORT_DESC =
	'Imports in the background shortly after you open or return to Obsidian, and at this interval while it is open. Runs silently and only shows a notice if it fails. Only on devices with an API token.';
const AUTO_IMPORT_OPTIONS: Record<string, string> = Object.fromEntries(
	AUTO_IMPORT_INTERVALS.map((minutes) => [String(minutes), minutes === 0 ? 'Off' : `Every ${minutes} minutes`]),
);

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
				render: (setting) => this.addTokenSecret(setting),
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
			{
				name: 'Label filter',
				desc: LABEL_FILTER_DESC,
				control: {
					type: 'text',
					key: 'label_filter',
					placeholder: 'Comma-separated labels',
				},
			},
			{
				name: 'Next task label',
				desc: NEXT_TASK_LABEL_DESC,
				control: {
					type: 'text',
					key: 'next_task_label',
					placeholder: 'Label',
				},
			},
			{
				name: 'Auto-import',
				desc: AUTO_IMPORT_DESC,
				control: {
					type: 'dropdown',
					key: 'auto_import_interval',
					options: AUTO_IMPORT_OPTIONS,
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		if (key === 'auto_import_interval') {
			return String(parseAutoImportInterval(this.plugin.settings.auto_import_interval));
		}
		return this.plugin.settings[key as keyof TptSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const trimmed = typeof value === 'string' ? value.trim() : value;
		if (key === 'projects_folder') {
			this.plugin.settings.projects_folder = (trimmed as string) || DEFAULT_SETTINGS.projects_folder;
		} else if (key === 'label_filter') {
			this.plugin.settings.label_filter = trimmed as string;
		} else if (key === 'next_task_label') {
			this.plugin.settings.next_task_label = trimmed as string;
		} else if (key === 'auto_import_interval') {
			this.plugin.settings.auto_import_interval = String(parseAutoImportInterval(trimmed as string));
		}
		await this.plugin.saveSettings();
	}

	/** Secret picker: the user selects or creates a keychain entry; only its ID is saved in data.json. */
	private addTokenSecret(setting: Setting): void {
		setting.addComponent((el) =>
			new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.todoist_api_token_secret)
				.onChange(async (id) => {
					this.plugin.settings.todoist_api_token_secret = id;
					await this.plugin.saveSettings();
				}),
		);
	}

	// Deprecated since 1.13.0; kept for Obsidian 1.11.5–1.12.x (this plugin's
	// minAppVersion is 1.11.5), which never call getSettingDefinitions().
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addTokenSecret(new Setting(containerEl).setName('Todoist API token').setDesc(TOKEN_DESC));

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

		new Setting(containerEl)
			.setName('Label filter')
			.setDesc(LABEL_FILTER_DESC)
			.addText((text) =>
				text
					.setPlaceholder('Comma-separated labels')
					.setValue(this.plugin.settings.label_filter)
					.onChange(async (value) => {
						this.plugin.settings.label_filter = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Next task label')
			.setDesc(NEXT_TASK_LABEL_DESC)
			.addText((text) =>
				text
					.setPlaceholder('Label')
					.setValue(this.plugin.settings.next_task_label)
					.onChange(async (value) => {
						this.plugin.settings.next_task_label = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Auto-import')
			.setDesc(AUTO_IMPORT_DESC)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(AUTO_IMPORT_OPTIONS)
					.setValue(String(parseAutoImportInterval(this.plugin.settings.auto_import_interval)))
					.onChange(async (value) => {
						this.plugin.settings.auto_import_interval = String(parseAutoImportInterval(value));
						await this.plugin.saveSettings();
					}),
			);
	}
}
