import type { RemoteProject } from '../todoist/types';
import { dateRange, toDateOnly } from './dates';
import { pickNextTask } from './next-task';

export const TPT_PREFIX = 'tpt_';

export type FrontmatterValue = string | number | boolean | string[] | null;
export type TptFrontmatter = Record<string, FrontmatterValue>;

export function isTptKey(key: string): boolean {
	return key.startsWith(TPT_PREFIX);
}

export function projectLink(projectId: string): string {
	return `todoist://project?id=${projectId}`;
}

/** Parses the comma-separated `label_filter` setting into an ordered, de-duplicated list of labels. */
export function parseLabelFilter(value: string): string[] {
	return [...new Set(value.split(',').map((s) => s.trim()).filter((s) => s.length > 0))];
}

/**
 * Collects the labels of the given tasks. Without a filter all labels are returned sorted
 * alphabetically; with a filter only the listed labels are returned, in the filter's order
 * and spelling. Filter matching is case-insensitive.
 */
export function collectLabels(tasks: RemoteProject['tasks'], labelFilter: string[] = []): string[] {
	const present = new Set(tasks.flatMap((t) => t.labels));
	if (labelFilter.length === 0) return [...present].sort();
	const presentLower = new Set([...present].map((l) => l.toLowerCase()));
	return labelFilter.filter((label) => presentLower.has(label.toLowerCase()));
}

/**
 * Builds the `tpt_` properties for an active or archived remote project, keys sorted alphabetically.
 * `labelFilter` restricts and orders `tpt_tasks_labels`; empty means all labels.
 * `nextTaskLabel` marks the task written to `tpt_tasks_next_content`; empty means pick by date only.
 */
export function buildProjectFrontmatter(
	remote: RemoteProject,
	labelFilter: string[] = [],
	nextTaskLabel = '',
): TptFrontmatter {
	const { project, tasks } = remote;
	const props: TptFrontmatter = {
		tpt_parent_project_name: project.is_archived ? null : remote.parentName,
		tpt_project_color: project.color,
		tpt_project_id: project.id,
		tpt_project_link: projectLink(project.id),
		tpt_project_name: project.name,
		tpt_project_status: project.is_archived ? 'archived' : 'active',
	};
	if (project.description) {
		props.tpt_project_description = project.description;
	}
	if (!project.is_archived) {
		const due = dateRange(
			tasks.flatMap((t) => (t.due ? [toDateOnly(t.due.date)] : [])),
		);
		const deadline = dateRange(
			tasks.flatMap((t) => (t.deadline ? [toDateOnly(t.deadline.date)] : [])),
		);
		const labels = collectLabels(tasks, labelFilter);
		Object.assign(props, {
			tpt_project_is_favorite: project.is_favorite,
			tpt_project_rank: remote.rank,
			tpt_tasks_count: tasks.length,
			tpt_tasks_first_deadline_on: deadline.first,
			tpt_tasks_first_due_on: due.first,
			tpt_tasks_labels: labels,
			tpt_tasks_last_deadline_on: deadline.last,
			tpt_tasks_last_due_on: due.last,
			tpt_tasks_next_content: pickNextTask(tasks, nextTaskLabel)?.content ?? null,
		});
	}
	return sortKeys(props);
}

/** Builds the `tpt_` properties for a project that no longer exists in Todoist. */
export function buildDeletedFrontmatter(
	projectName: string,
	projectId: string | null = null,
): TptFrontmatter {
	const props: TptFrontmatter = {
		tpt_project_name: projectName,
		tpt_project_status: 'deleted',
	};
	if (projectId) props.tpt_project_id = projectId;
	return sortKeys(props);
}

/** Extracts the project id from a `tpt_project_link` value, for files written before `tpt_project_id` existed. */
export function projectIdFromLink(link: unknown): string | null {
	if (typeof link !== 'string') return null;
	const match = /^todoist:\/\/project\?id=([^&\s]+)$/.exec(link.trim());
	return match?.[1] ?? null;
}

/**
 * Applies `tpt_` properties to a frontmatter object in place: all existing `tpt_` keys are
 * removed and the new ones are appended after any user-defined properties.
 */
export function applyTptFrontmatter(
	frontmatter: Record<string, unknown>,
	props: TptFrontmatter,
): void {
	for (const key of Object.keys(frontmatter)) {
		if (isTptKey(key)) delete frontmatter[key];
	}
	for (const [key, value] of Object.entries(props)) {
		frontmatter[key] = value;
	}
}

function sortKeys(props: TptFrontmatter): TptFrontmatter {
	return Object.fromEntries(
		Object.entries(props).sort(([a], [b]) => a.localeCompare(b)),
	);
}
