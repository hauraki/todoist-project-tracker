export interface ImportResult {
	created: number;
	updated: number;
	renamed: number;
	deleted: number;
	skipped: number;
}

/** Builds the import summary: a heading plus one line per non-zero count, or "No changes". */
export function formatImportResult(result: ImportResult): string {
	const counts: [string, number][] = [
		['Created', result.created],
		['Updated', result.updated],
		['Renamed', result.renamed],
		['Marked deleted', result.deleted],
		['Skipped (name conflict)', result.skipped],
	];
	const lines = counts.filter(([, n]) => n > 0).map(([label, n]) => `${label}: ${n}`);
	if (lines.length === 0) lines.push('No changes');
	return ['Todoist import finished', ...lines].join('\n');
}
