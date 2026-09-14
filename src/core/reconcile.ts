import type { RemoteProject } from '../todoist/types';
import { normalizeFileName } from './filename';

/** A project file found in the projects folder, identified by its base name (without `.md`). */
export interface LocalProject {
	baseName: string;
	/** Current value of `tpt_project_name`, if present. */
	projectName: string | null;
}

export interface ReconcilePlan {
	/** Case A: remote project without a local file. */
	create: { baseName: string; remote: RemoteProject }[];
	/** Case B: remote project with a matching local file. */
	update: { baseName: string; remote: RemoteProject }[];
	/** Case C: local file whose remote project is gone. */
	markDeleted: LocalProject[];
	/** Remote projects skipped because another project already claimed the same file name. */
	conflicts: { baseName: string; remote: RemoteProject }[];
}

/** Pure matching of remote projects against local project files by normalized file name. */
export function planReconciliation(
	remotes: RemoteProject[],
	locals: LocalProject[],
): ReconcilePlan {
	const plan: ReconcilePlan = {
		create: [],
		update: [],
		markDeleted: [],
		conflicts: [],
	};
	const localByName = new Map(locals.map((l) => [l.baseName.normalize('NFC'), l]));
	const claimed = new Set<string>();

	for (const remote of remotes) {
		const baseName = normalizeFileName(remote.project.name);
		if (!baseName || claimed.has(baseName)) {
			plan.conflicts.push({ baseName, remote });
			continue;
		}
		claimed.add(baseName);
		if (localByName.has(baseName)) {
			plan.update.push({ baseName, remote });
		} else {
			plan.create.push({ baseName, remote });
		}
	}

	for (const local of locals) {
		if (!claimed.has(local.baseName.normalize('NFC'))) plan.markDeleted.push(local);
	}
	return plan;
}
