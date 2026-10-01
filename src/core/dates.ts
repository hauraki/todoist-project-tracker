/**
 * Reduces a Todoist date value to `YYYY-MM-DD`.
 * Accepts `YYYY-MM-DD`, floating `YYYY-MM-DDTHH:MM:SS` and UTC `YYYY-MM-DDTHH:MM:SSZ`.
 * UTC datetimes are converted to the local date before the time is dropped.
 */
export function toDateOnly(value: string): string {
	if (value.endsWith('Z')) {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) {
			const pad = (n: number) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		}
	}
	return value.slice(0, 10);
}

/**
 * Turns a Todoist date value into a string that sorts chronologically in local time,
 * including the time of day. UTC datetimes are converted to local time. Values without
 * a time sort after all timed values of the same day.
 */
export function toSortKey(value: string): string {
	if (value.endsWith('Z')) {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) {
			const pad = (n: number) => String(n).padStart(2, '0');
			return `${toDateOnly(value)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		}
	}
	return value.length > 10 ? value.slice(0, 19) : `${value}T24:00:00`;
}

/** Returns the smallest and largest `YYYY-MM-DD` value, or nulls when the list is empty. */
export function dateRange(dates: string[]): {
	first: string | null;
	last: string | null;
} {
	if (dates.length === 0) return { first: null, last: null };
	const sorted = [...dates].sort();
	return { first: sorted[0] ?? null, last: sorted[sorted.length - 1] ?? null };
}
