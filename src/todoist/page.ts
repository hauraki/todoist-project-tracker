/** Envelope of a paginated Todoist API v1 response. */
export interface Page<T> {
	results: T[];
	next_cursor: string | null;
}

/** Checks the envelope only; the items in `results` are left unchecked. */
export function isPage(value: unknown): value is Page<unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const page = value as Record<string, unknown>;
	return (
		Array.isArray(page.results) &&
		(typeof page.next_cursor === 'string' || page.next_cursor === null)
	);
}
