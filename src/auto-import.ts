import { AUTO_IMPORT_SETTLE_MS, isAutoImportDue, parseAutoImportInterval } from './core/auto-import';
import { hasToken } from './importer';
import type TodoistProjectTrackerPlugin from './main';

/** How often to check whether a background import is due. Cheap: no network unless due. */
const TICK_MS = 60_000;
/** A tick this late means the app was suspended (mobile) or the computer slept. */
const RESUME_GAP_MS = 2 * TICK_MS;

/**
 * Keeps the imported projects fresh while Obsidian is open: imports in the background
 * shortly after Obsidian opens or comes back to the foreground, and whenever the last
 * import is older than the configured interval.
 */
export function registerAutoImport(plugin: TodoistProjectTrackerPlugin): void {
	let resumedAt = Date.now();
	let lastTick = Date.now();
	let settleTimer: number | null = null;

	const maybeImport = () => {
		const due = isAutoImportDue({
			nowMs: Date.now(),
			lastAttemptMs: plugin.lastImportAttempt,
			resumedAtMs: resumedAt,
			intervalMinutes: parseAutoImportInterval(plugin.settings.auto_import_interval),
			visible: document.visibilityState === 'visible',
		});
		// Devices without a token stay quiet; running Import projects manually explains why.
		if (!due || !hasToken(plugin.app, plugin.settings)) return;
		void plugin.runImport({ background: true });
	};

	const clearSettleTimer = () => {
		if (settleTimer !== null) window.clearTimeout(settleTimer);
		settleTimer = null;
	};

	/** Obsidian just opened or came back: check again once sync has had time to catch up. */
	const onResume = () => {
		resumedAt = Date.now();
		clearSettleTimer();
		settleTimer = window.setTimeout(() => {
			settleTimer = null;
			maybeImport();
		}, AUTO_IMPORT_SETTLE_MS);
	};

	plugin.app.workspace.onLayoutReady(onResume);
	plugin.registerDomEvent(document, 'visibilitychange', () => {
		if (document.visibilityState === 'visible') onResume();
		else clearSettleTimer();
	});
	plugin.registerInterval(
		window.setInterval(() => {
			const now = Date.now();
			// After a suspend, this overdue tick can fire before visibilitychange does.
			if (now - lastTick > RESUME_GAP_MS) resumedAt = now;
			lastTick = now;
			maybeImport();
		}, TICK_MS),
	);
	plugin.register(clearSettleTimer);
}
