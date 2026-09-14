/** Subset of the Todoist API v1 project object that this plugin uses. */
export interface TodoistProject {
	id: string;
	name: string;
	color: string;
	parent_id: string | null;
	is_archived: boolean;
	is_favorite: boolean;
	inbox_project?: boolean;
	description: string;
}

/** Todoist due object. `date` is `YYYY-MM-DD`, `YYYY-MM-DDTHH:MM:SS` or `YYYY-MM-DDTHH:MM:SSZ`. */
export interface TodoistDue {
	date: string;
	timezone?: string | null;
	string?: string;
	is_recurring?: boolean;
}

/** Todoist deadline object. `date` is always `YYYY-MM-DD`. */
export interface TodoistDeadline {
	date: string;
}

/** Subset of the Todoist API v1 task object that this plugin uses. */
export interface TodoistTask {
	id: string;
	project_id: string;
	labels: string[];
	due: TodoistDue | null;
	deadline: TodoistDeadline | null;
}

/** An active project together with its active tasks. */
export interface RemoteProject {
	project: TodoistProject;
	/** Position (1-based) in Todoist's project tree; only set for active projects. */
	rank: number | null;
	/** Active tasks; empty for archived projects. */
	tasks: TodoistTask[];
	parentName: string | null;
}
