import type { TodoistTask } from '../todoist/types';
import { toSortKey } from './dates';

/**
 * Picks a project's next task: the first task carrying `nextTaskLabel` (matched
 * case-insensitively, skipped when the label is empty), else the task with the earliest
 * due date or deadline, else `null`. Which task wins among several labelled tasks or
 * several tasks with the same earliest date is unspecified.
 */
export function pickNextTask(tasks: TodoistTask[], nextTaskLabel = ''): TodoistTask | null {
	const label = nextTaskLabel.trim().toLowerCase();
	if (label) {
		const labelled = tasks.find((t) => t.labels.some((l) => l.toLowerCase() === label));
		if (labelled) return labelled;
	}

	let next: TodoistTask | null = null;
	let nextKey: string | null = null;
	for (const task of tasks) {
		const key = earliestDateKey(task);
		if (key !== null && (nextKey === null || key < nextKey)) {
			next = task;
			nextKey = key;
		}
	}
	return next;
}

/** The earlier of a task's due date and deadline as a sort key, or `null` when it has neither. */
function earliestDateKey(task: TodoistTask): string | null {
	const keys = [task.due?.date, task.deadline?.date].flatMap((d) => (d ? [toSortKey(d)] : []));
	if (keys.length === 0) return null;
	return keys.sort()[0] ?? null;
}
