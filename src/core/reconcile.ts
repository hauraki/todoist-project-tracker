import type { RemoteProject } from '../todoist/types';
import { normalizeFileName } from './filename';

/** A project file found in the projects folder, identified by its base name (without `.md`). */
export interface LocalProject {
	baseName: string;
	/** Current value of `tpt_project_id`, if present. */
	projectId: string | null;
	/** Current value of `tpt_project_name`, if present. */
	projectName: string | null;
}

export interface ReconcilePlan {
	/** Case A: remote project without a local file. */
	create: { baseName: string; remote: RemoteProject }[];
	/**
	 * Case B: remote project with a matching local file. `baseName` is the file name the
	 * project should have after the import; if it differs from `local.baseName` the file is renamed.
	 */
	update: { baseName: string; local: LocalProject; remote: RemoteProject }[];
	/** Case C: local file whose remote project is gone. */
	markDeleted: LocalProject[];
	/** Remote projects skipped because their file name is empty or already used by another project. */
	conflicts: { baseName: string; remote: RemoteProject }[];
	/** Matched projects that keep their old file name because the new one is already used. */
	renameConflicts: { wantedBaseName: string; local: LocalProject; remote: RemoteProject }[];
}

/**
 * Pure matching of remote projects against local project files.
 *
 * Matching runs in two passes: first by `tpt_project_id`, then by normalized file name for
 * remotes and locals that are still unmatched. The second pass covers files written before the
 * id property existed and lets a re-created project with the same name reuse the old file.
 */
export function planReconciliation(
	remotes: RemoteProject[],
	locals: LocalProject[],
): ReconcilePlan {
	const plan: ReconcilePlan = {
		create: [],
		update: [],
		markDeleted: [],
		conflicts: [],
		renameConflicts: [],
	};

	const matched = matchRemotes(remotes, locals);
	const unmatchedLocals = locals.filter((l) => ![...matched.values()].includes(l));

	// File names are claimed in priority order: matched files that already have the right name,
	// then files of projects that are gone (they stay in place), then renames and creates.
	const claimed = new Set<string>();
	const wanted = new Map(remotes.map((r) => [r, normalizeFileName(r.project.name)]));
	for (const [remote, local] of matched) {
		if (nfc(local.baseName) === wanted.get(remote)) claimed.add(nfc(local.baseName));
	}
	for (const local of unmatchedLocals) claimed.add(nfc(local.baseName));

	for (const remote of remotes) {
		const baseName = wanted.get(remote) ?? '';
		const local = matched.get(remote);
		if (local) {
			const current = nfc(local.baseName);
			if (current === baseName) {
				plan.update.push({ baseName: local.baseName, local, remote });
			} else if (!baseName || claimed.has(baseName)) {
				plan.renameConflicts.push({ wantedBaseName: baseName, local, remote });
				plan.update.push({ baseName: local.baseName, local, remote });
			} else {
				claimed.add(baseName);
				plan.update.push({ baseName, local, remote });
			}
			continue;
		}
		if (!baseName || claimed.has(baseName)) {
			plan.conflicts.push({ baseName, remote });
			continue;
		}
		claimed.add(baseName);
		plan.create.push({ baseName, remote });
	}

	plan.markDeleted = unmatchedLocals;
	return plan;
}

/** Pairs each remote with at most one local: by project id first, then by normalized file name. */
function matchRemotes(
	remotes: RemoteProject[],
	locals: LocalProject[],
): Map<RemoteProject, LocalProject> {
	const matched = new Map<RemoteProject, LocalProject>();
	const taken = new Set<LocalProject>();

	const byId = new Map<string, LocalProject>();
	for (const local of locals) {
		if (local.projectId && !byId.has(local.projectId)) byId.set(local.projectId, local);
	}
	for (const remote of remotes) {
		const local = byId.get(remote.project.id);
		if (local && !taken.has(local)) {
			matched.set(remote, local);
			taken.add(local);
		}
	}

	const byName = new Map<string, LocalProject>();
	for (const local of locals) {
		if (!taken.has(local) && !byName.has(nfc(local.baseName))) byName.set(nfc(local.baseName), local);
	}
	for (const remote of remotes) {
		if (matched.has(remote)) continue;
		const local = byName.get(normalizeFileName(remote.project.name));
		if (local && !taken.has(local)) {
			matched.set(remote, local);
			taken.add(local);
		}
	}
	return matched;
}

function nfc(s: string): string {
	return s.normalize('NFC');
}
