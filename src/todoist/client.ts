import { requestUrl } from 'obsidian';
import { isPage } from './page';
import type { TodoistProject, TodoistTask } from './types';

const BASE_URL = 'https://api.todoist.com/api/v1';
const PAGE_SIZE = 200;

/**
 * Minimal read-only client for the Todoist REST API v1.
 * It only ever issues GET requests.
 */
export class TodoistClient {
	constructor(private readonly token: string) {}

	getActiveProjects(): Promise<TodoistProject[]> {
		return this.getAll<TodoistProject>('/projects');
	}

	getArchivedProjects(): Promise<TodoistProject[]> {
		return this.getAll<TodoistProject>('/projects/archived');
	}

	/** All active tasks across all projects (including the inbox). */
	getActiveTasks(): Promise<TodoistTask[]> {
		return this.getAll<TodoistTask>('/tasks');
	}

	/** Follows `next_cursor` until all pages have been collected. */
	private async getAll<T>(
		path: string,
		params: Record<string, string> = {},
	): Promise<T[]> {
		const items: T[] = [];
		let cursor: string | null = null;
		do {
			const query = new URLSearchParams({
				...params,
				limit: String(PAGE_SIZE),
			});
			if (cursor) query.set('cursor', cursor);
			const page = await this.get(`${path}?${query}`);
			if (!isPage(page)) {
				throw new Error(`Unexpected Todoist API response for ${path}`);
			}
			// The items themselves are trusted to match T.
			items.push(...(page.results as T[]));
			cursor = page.next_cursor;
		} while (cursor);
		return items;
	}

	private async get(pathWithQuery: string): Promise<unknown> {
		const response = await requestUrl({
			url: `${BASE_URL}${pathWithQuery}`,
			method: 'GET',
			headers: { Authorization: `Bearer ${this.token}` },
			throw: false,
		});
		if (response.status < 200 || response.status >= 300) {
			throw new Error(
				`Todoist API request failed (${response.status}) for ${pathWithQuery}`,
			);
		}
		return response.json as unknown;
	}
}
