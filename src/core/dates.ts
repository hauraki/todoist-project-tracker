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

/** Returns the smallest and largest `YYYY-MM-DD` value, or nulls when the list is empty. */
export function dateRange(dates: string[]): {
	first: string | null;
	last: string | null;
} {
	if (dates.length === 0) return { first: null, last: null };
	const sorted = [...dates].sort();
	return { first: sorted[0] ?? null, last: sorted[sorted.length - 1] ?? null };
}
