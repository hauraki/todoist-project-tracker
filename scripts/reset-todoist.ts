/**
 * Resets the Todoist demo account used for the screencast, with due dates relative to today.
 *
 * Setup: add TODOIST_DEMO_TOKEN and TODOIST_DEMO_EMAIL to `.env` in the repository root
 * (ignored by Git).
 *
 *   npm run reset_todoist
 *
 * DESTRUCTIVE: deletes ALL projects of the account (active and archived) and all Inbox tasks,
 * then creates the demo projects from scratch. Run the import in Obsidian afterwards.
 */

const BASE_URL = 'https://api.todoist.com/api/v1';

// --- Demo data: edit this to change the demo ---

interface DemoTask {
	content: string;
	labels?: string[];
	/** Due date in days from today; negative values are overdue. */
	dueIn?: number;
	/** Recurring due date in Todoist's natural language, e.g. "every monday". */
	repeat?: string;
	/** API priority: 4 is the highest (p1 in the app), 1 is none. */
	priority?: 1 | 2 | 3 | 4;
}

interface DemoProject {
	name: string;
	color: string;
	/** Name of the parent project, which must be listed before this one. */
	parent?: string;
	tasks: DemoTask[];
}

const LABELS: Record<string, string> = {
	focus: 'blue',
	waiting: 'orange',
	errand: 'lime_green',
	phone: 'magenta',
	'quick-win': 'yellow',
	'deep-work': 'grape',
	home: 'teal',
};

/** At most 5: the limit of the free plan, which counts nested projects. */
const ACTIVE_PROJECTS: DemoProject[] = [
	{
		name: 'Berlin Marathon 🏃',
		color: 'mint_green',
		tasks: [
			{ content: 'Set up watch and heart-rate zones', labels: ['quick-win'], dueIn: -2 },
			{ content: 'Book physio check-up', labels: ['phone'], dueIn: -1, priority: 2 },
			{ content: 'Easy 8 km run', labels: ['quick-win'], dueIn: 1, priority: 2 },
			{ content: 'Tempo run: 5 x 1 km', labels: ['focus'], dueIn: 3, priority: 3 },
			{ content: 'Long run, 18 km', labels: ['focus'], repeat: 'every saturday', priority: 3 },
			{ content: 'Buy new running shoes', labels: ['errand'], dueIn: 6 },
		],
	},
	{
		name: "Vietnam Trip '26 🎒",
		color: 'yellow',
		tasks: [
			{ content: 'Book flights to Hanoi', labels: ['focus'], dueIn: 2, priority: 4 },
			{ content: 'Renew passport', labels: ['errand'], dueIn: 7, priority: 4 },
			{ content: 'Research accommodation in Hoi An', labels: ['waiting'], dueIn: 9 },
			{ content: 'Get travel insurance quote', labels: ['phone', 'waiting'], dueIn: 11 },
			{ content: 'Plan route: Hanoi to Ho Chi Minh City', labels: ['deep-work'], dueIn: 14, priority: 2 },
		],
	},
	{
		name: '🧑🏻‍💻 Work',
		color: 'sky_blue',
		tasks: [
			{ content: 'Reply to client feedback', labels: ['quick-win'], dueIn: 0, priority: 4 },
			{ content: 'Weekly 1:1 with Sam', repeat: 'every monday', priority: 2 },
			{ content: 'Prepare Q1 planning deck', labels: ['deep-work'], dueIn: 5, priority: 3 },
			{ content: 'Submit monthly expense report', labels: ['quick-win'], dueIn: 8 },
		],
	},
	{
		name: 'TPT Labs 🧪',
		color: 'sky_blue',
		parent: '🧑🏻‍💻 Work',
		tasks: [
			{ content: 'Build prototype', labels: ['deep-work', 'focus'], dueIn: 4, priority: 4 },
			{ content: 'Write README with demo GIF', labels: ['deep-work', 'focus'], dueIn: 10, priority: 3 },
			{ content: 'Test on mobile', labels: ['waiting'], dueIn: 13 },
			{ content: 'Submit plugin to community directory', dueIn: 21, priority: 2 },
		],
	},
	{
		name: 'Home & Garden 🏡',
		color: 'lime_green',
		tasks: [
			{ content: 'Order tulip bulbs', labels: ['errand'], dueIn: -3, priority: 2 },
			{ content: 'Repair leaking tap', labels: ['home'], dueIn: 0, priority: 3 },
			{ content: 'Call landlord about heating', labels: ['phone'], dueIn: 1, priority: 2 },
			{ content: 'Winterize garden hose', labels: ['home', 'quick-win'], dueIn: 5 },
			{ content: 'Declutter the basement', labels: ['home'], dueIn: 12 },
		],
	},
];

const ARCHIVED_PROJECTS: DemoProject[] = [
	{
		name: 'Bike Fitting 🚲',
		color: 'violet',
		tasks: [{ content: 'Pay invoice' }],
	},
	{
		name: 'Tax Return 2025 🧾',
		color: 'grey',
		tasks: [{ content: 'Collect receipts' }, { content: 'Submit return to the tax office' }],
	},
	{
		name: 'Wedding Gift 🎁',
		color: 'salmon',
		tasks: [{ content: 'Pick a gift' }, { content: 'Write the card' }],
	},
	{
		name: 'Kitchen Renovation 🔨',
		color: 'orange',
		tasks: [{ content: 'Choose tiles' }, { content: 'Book electrician' }],
	},
];

// --- Todoist API ---

interface Project {
	id: string;
	name: string;
	parent_id: string | null;
	inbox_project?: boolean;
}

interface Task {
	id: string;
	project_id: string;
	parent_id: string | null;
}

interface Label {
	id: string;
	name: string;
	color: string;
}

class Api {
	constructor(private readonly token: string) {}

	async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.token}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(`${method} ${path} failed (${response.status}): ${text.slice(0, 300)}`);
		}
		return (text ? JSON.parse(text) : null) as T;
	}

	/** Follows `next_cursor` until all pages have been collected. */
	async getAll<T>(path: string): Promise<T[]> {
		const items: T[] = [];
		let cursor: string | null = null;
		do {
			const query = new URLSearchParams({ limit: '200' });
			if (cursor) query.set('cursor', cursor);
			const page: { results: T[]; next_cursor: string | null } = await this.request(
				'GET',
				`${path}?${query}`,
			);
			items.push(...page.results);
			cursor = page.next_cursor;
		} while (cursor);
		return items;
	}
}

// --- Reset ---

/** Set once the account is being modified, so a failure can say so. */
let changing = false;

async function main(): Promise<void> {
	const token = process.env.TODOIST_DEMO_TOKEN;
	const email = process.env.TODOIST_DEMO_EMAIL;
	if (!token || !email) {
		throw new Error('Set TODOIST_DEMO_TOKEN and TODOIST_DEMO_EMAIL in .env.');
	}
	const api = new Api(token);

	// Safety net: this script wipes the account, so it must never run against another one.
	const user = await api.request<{ email: string }>('GET', '/user');
	if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
		throw new Error('The token does not belong to TODOIST_DEMO_EMAIL. Nothing was changed.');
	}

	const projects = [
		...(await api.getAll<Project>('/projects')),
		...(await api.getAll<Project>('/projects/archived')),
	];
	const tasks = await api.getAll<Task>('/tasks');
	const labels = await api.getAll<Label>('/labels');

	changing = true;
	await deleteProjects(api, projects);
	await deleteInboxTasks(api, projects, tasks);
	await restoreLabels(api, labels);

	// Archived projects first, one at a time, to stay within the active project limit.
	for (const demo of ARCHIVED_PROJECTS) {
		console.log(`Creating archived project ${demo.name}`);
		const id = await createProject(api, demo);
		await api.request('POST', `/projects/${id}/archive`);
	}

	const ids = new Map<string, string>();
	for (const demo of ACTIVE_PROJECTS) {
		console.log(`Creating project ${demo.name}`);
		const parentId = demo.parent ? ids.get(demo.parent) : undefined;
		ids.set(demo.name, await createProject(api, demo, parentId));
	}

	console.log('Demo account reset.');
}

/** Deletes every project except the Inbox, which Todoist does not allow to delete. */
async function deleteProjects(api: Api, projects: Project[]): Promise<void> {
	const byId = new Map(projects.map((p) => [p.id, p]));
	const depth = (project: Project): number => {
		const parent = byId.get(project.parent_id ?? '');
		return parent ? depth(parent) + 1 : 0;
	};
	// Deepest first: deleting a parent also deletes its subprojects.
	for (const project of [...projects].sort((a, b) => depth(b) - depth(a))) {
		if (project.inbox_project) continue;
		console.log(`Deleting project ${project.name}`);
		await api.request('DELETE', `/projects/${project.id}`);
	}
}

async function deleteInboxTasks(api: Api, projects: Project[], tasks: Task[]): Promise<void> {
	const inboxId = projects.find((p) => p.inbox_project)?.id;
	// Deleting a top-level task also deletes its subtasks.
	for (const task of tasks.filter((t) => t.project_id === inboxId && !t.parent_id)) {
		console.log('Deleting an Inbox task');
		await api.request('DELETE', `/tasks/${task.id}`);
	}
}

/** Creates missing demo labels and restores their colors. Other labels are left alone. */
async function restoreLabels(api: Api, labels: Label[]): Promise<void> {
	for (const [name, color] of Object.entries(LABELS)) {
		const label = labels.find((l) => l.name === name);
		if (!label) {
			await api.request('POST', '/labels', { name, color });
		} else if (label.color !== color) {
			await api.request('POST', `/labels/${label.id}`, { color });
		}
	}
}

/** Creates a project with its tasks and returns its ID. */
async function createProject(api: Api, demo: DemoProject, parentId?: string): Promise<string> {
	const { id } = await api.request<Project>('POST', '/projects', {
		name: demo.name,
		color: demo.color,
		...(parentId ? { parent_id: parentId } : {}),
	});
	for (const task of demo.tasks) await createTask(api, id, task);
	return id;
}

async function createTask(api: Api, projectId: string, task: DemoTask): Promise<void> {
	await api.request('POST', '/tasks', {
		project_id: projectId,
		content: task.content,
		labels: task.labels ?? [],
		priority: task.priority ?? 1,
		...(task.repeat ? { due_string: task.repeat, due_lang: 'en' } : {}),
		...(task.dueIn !== undefined ? { due_date: dateFromToday(task.dueIn) } : {}),
	});
}

/** Local calendar date, `days` from today, as `YYYY-MM-DD`. */
function dateFromToday(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	if (changing) console.error('The reset may be incomplete. Fix the cause and run it again.');
	process.exitCode = 1;
});
