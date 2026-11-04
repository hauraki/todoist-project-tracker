/** Choices for the auto-import interval setting, in minutes. `0` turns auto-import off. */
export const AUTO_IMPORT_INTERVALS = [0, 5, 15, 30, 60] as const;
export const DEFAULT_AUTO_IMPORT_INTERVAL = 15;

/**
 * How long Obsidian must have been open or back in the foreground before a background
 * import runs. Gives sync (Obsidian Sync, iCloud, …) time to download changes made on
 * other devices first, so the import does not write over outdated files.
 */
export const AUTO_IMPORT_SETTLE_MS = 30_000;

/** Parses the stored setting. Unknown or malformed values fall back to the default. */
export function parseAutoImportInterval(value: string): number {
	const trimmed = value.trim();
	// Number('') is 0, which would silently mean "off".
	const minutes = trimmed === '' ? NaN : Number(trimmed);
	return (AUTO_IMPORT_INTERVALS as readonly number[]).includes(minutes)
		? minutes
		: DEFAULT_AUTO_IMPORT_INTERVAL;
}

export interface AutoImportState {
	nowMs: number;
	/** Start of the last import, manual or background; `0` if none since Obsidian opened. */
	lastAttemptMs: number;
	/** When Obsidian was opened or last came back to the foreground. */
	resumedAtMs: number;
	intervalMinutes: number;
	visible: boolean;
}

/** Whether a background import should start now. */
export function isAutoImportDue(state: AutoImportState): boolean {
	const { nowMs, lastAttemptMs, resumedAtMs, intervalMinutes, visible } = state;
	if (intervalMinutes <= 0 || !visible) return false;
	if (nowMs - resumedAtMs < AUTO_IMPORT_SETTLE_MS) return false;
	return nowMs - lastAttemptMs >= intervalMinutes * 60_000;
}
