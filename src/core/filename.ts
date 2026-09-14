/**
 * Characters that Obsidian does not allow (or that break links) in file names:
 * `* " \ / < > : | ? # ^ [ ]`. Each one is replaced with a space.
 */
const FORBIDDEN_CHARS = /[*"\\/<>:|?#^[\]]/g;

/**
 * Maps a Todoist project name to a valid Obsidian file base name (without `.md`).
 * The result is in Unicode NFC form because Obsidian stores file names that way;
 * without this a decomposed umlaut from Todoist would never match the file on disk.
 */
export function normalizeFileName(projectName: string): string {
	return projectName
		.normalize('NFC')
		.replace(FORBIDDEN_CHARS, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\.+$/, '')
		.trim();
}
