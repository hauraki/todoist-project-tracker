/**
 * Builds a sample `.base` file over the project files with two views: "Active" (Todoist icon,
 * rank, name, parent, task count, next date (relative) and colored labels) and "Archived"
 * (Todoist icon and name).
 *
 * Only the projects folder varies per user. It is embedded as a JSON string literal inside a
 * single-quoted YAML scalar, so quotes, `#` or `:` in folder names cannot break either layer.
 */
export function buildProjectsBase(folderPath: string, pluginVersion: string): string {
	const folderFilter = yamlSingleQuoted(`file.folder == ${JSON.stringify(folderPath)}`);
	return `# Created by Todoist Project Tracker ${pluginVersion}. Edit it freely; the plugin does not change this file again.
filters:
  and:
    - ${folderFilter}
formulas:
  icon: link(tpt_project_link, html("<span class=\\"tpt-hash tpt-color-" + tpt_project_color + "\\">#</span>"))
  first_due_days: ((number(tpt_tasks_first_due_on.date()) - number(today())) / 86400000).round()
  first_deadline_days: ((number(tpt_tasks_first_deadline_on.date()) - number(today())) / 86400000).round()
  first_date_days: if(tpt_tasks_first_due_on.isEmpty(), formula.first_deadline_days, if(tpt_tasks_first_deadline_on.isEmpty(), formula.first_due_days, if(formula.first_due_days <= formula.first_deadline_days, formula.first_due_days, formula.first_deadline_days)))
  first_date_relative: if(tpt_tasks_first_due_on.isEmpty() && tpt_tasks_first_deadline_on.isEmpty(), "", if(formula.first_date_days == 0, "today", if(formula.first_date_days == 1, "tomorrow", if(formula.first_date_days == -1, "yesterday", if(formula.first_date_days > 0, "in " + formula.first_date_days.toString() + "d", formula.first_date_days.abs().toString() + "d ago")))))
  colored_labels_list: tpt_tasks_labels.map(html("<span class=\\"tpt-label tpt-color-" + tpt_tasks_label_colors[index] + "\\">" + value + "</span>"))
properties:
  file.name:
    displayName: Project
  formula.icon:
    displayName: Todoist
  note.tpt_project_rank:
    displayName: Rank
  note.tpt_parent_project_name:
    displayName: Parent
  note.tpt_tasks_count:
    displayName: Tasks
  formula.first_date_relative:
    displayName: First date
  formula.colored_labels_list:
    displayName: Task labels
views:
  - type: table
    name: Active
    filters:
      and:
        - tpt_project_status == "active"
    order:
      - formula.icon
      - tpt_project_rank
      - file.name
      - tpt_parent_project_name
      - tpt_tasks_count
      - formula.first_date_relative
      - formula.colored_labels_list
    sort:
      - property: tpt_project_rank
        direction: ASC
    columnSize:
      formula.icon: 45
      note.tpt_project_rank: 25
      file.name: 188
      note.tpt_parent_project_name: 105
      note.tpt_tasks_count: 55
      formula.first_date_relative: 45
      formula.colored_labels_list: 244
  - type: table
    name: Archived
    filters:
      and:
        - tpt_project_status == "archived"
    order:
      - formula.icon
      - file.name
    sort:
      - property: file.name
        direction: ASC
    columnSize:
      formula.icon: 45
      file.name: 188
`;
}

/**
 * Picks the path for a new base next to the projects folder, named after it
 * (`Traktion/Projects` → `Traktion/Projects.base`, `TPT` → `TPT.base`).
 * If that path is taken, appends ` 1`, ` 2`, … so an existing file is never overwritten.
 */
export function projectsBasePath(folderPath: string, exists: (path: string) => boolean): string {
	const slash = folderPath.lastIndexOf('/');
	const dir = slash === -1 ? '' : folderPath.slice(0, slash + 1);
	const name = folderPath.slice(slash + 1);
	let path = `${dir}${name}.base`;
	for (let n = 1; exists(path); n++) {
		path = `${dir}${name} ${n}.base`;
	}
	return path;
}

function yamlSingleQuoted(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}
