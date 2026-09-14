import type { RemoteProject, TodoistProject, TodoistTask } from '../todoist/types';

/**
 * Combines active and archived Todoist projects into `RemoteProject`s:
 * the inbox is dropped, parent names are resolved and active projects get a 1-based rank
 * that follows the order Todoist returned them in (its project tree order).
 */
export function buildRemoteProjects(
	active: TodoistProject[],
	archived: TodoistProject[],
	tasksByProject: Map<string, TodoistTask[]>,
): RemoteProject[] {
	const activeOnly = active.filter((p) => !p.inbox_project);
	const nameById = new Map(activeOnly.map((p) => [p.id, p.name]));

	const remotes: RemoteProject[] = activeOnly.map((project, index) => ({
		project,
		rank: index + 1,
		tasks: tasksByProject.get(project.id) ?? [],
		parentName: project.parent_id ? (nameById.get(project.parent_id) ?? null) : null,
	}));

	for (const project of archived) {
		if (project.inbox_project) continue;
		remotes.push({ project, rank: null, tasks: [], parentName: null });
	}
	return remotes;
}
