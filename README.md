# Todoist Project Tracker

An Obsidian plugin that imports your Todoist projects into your vault so you can track them alongside your notes.

The plugin is **read-only** towards Todoist: it only ever reads data via the Todoist API and never writes anything back.

## Network use and privacy

- The plugin connects to the Todoist API (`api.todoist.com`) and nowhere else. It only does so when you run **Import projects**.
- No telemetry or analytics are collected, and no vault content is sent anywhere.
- Your Todoist API token is stored in plain text in `.obsidian/plugins/todoist-project-tracker/data.json` inside your vault. If you sync your vault (Obsidian Sync, iCloud, git, …), the token is synced with it. Keep that file out of public repositories.

## Settings

- **Todoist API token** (required): your personal API token, found in Todoist under **Settings → Integrations → Developer**.
- **Projects folder** (optional): the vault folder that holds the project files. Defaults to `TPT`.
- **Label filter** (optional): comma-separated list of labels. Only these labels are written to `tpt_tasks_labels`, in this order. Leave empty to import all labels.
- **Next task label** (optional): the label that marks a project's next task. Use it on one task per project; if several tasks carry it, any one of them is picked.

## Commands

- **Import projects**: fetches all active and archived projects (and the active tasks of active projects) from Todoist and reconciles them with the files in the projects folder. A notice shows how many files were created, updated, renamed and marked as deleted.

## How it works

Each Todoist project maps to one markdown file in the projects folder (flat, no nesting). The file name is the project name with characters that are not allowed in Obsidian file names (`* " \ / < > : | ? # ^ [ ]`) replaced by a space. A file counts as a project file as soon as its frontmatter has at least one `tpt_` property.

All properties written by the plugin are prefixed with `tpt_`. You can add your own properties to a project file; the plugin never touches them.

| Property | Active | Archived | Deleted |
| --- | --- | --- | --- |
| `tpt_parent_project_name` | parent name or empty | empty | |
| `tpt_project_color` | ✓ | ✓ | |
| `tpt_project_description` | if set | if set | |
| `tpt_project_id` | Todoist project id | ✓ | ✓ |
| `tpt_project_is_favorite` | ✓ | | |
| `tpt_project_link` | `todoist://project?id=…` | ✓ | |
| `tpt_project_name` | original name | ✓ | ✓ |
| `tpt_project_rank` | position in Todoist's project tree (1-based) | | |
| `tpt_project_status` | `active` | `archived` | `deleted` |
| `tpt_tasks_count` | ✓ | | |
| `tpt_tasks_labels` | set of all task labels, or only the labels listed in the **Label filter** setting (in that order) | | |
| `tpt_tasks_first_due_on` / `tpt_tasks_last_due_on` | earliest / latest due date | | |
| `tpt_tasks_first_deadline_on` / `tpt_tasks_last_deadline_on` | earliest / latest deadline | | |
| `tpt_tasks_next_content` | text of the next task, or empty | | |

The next task is the task carrying the **Next task label**, if that setting is set and such a task exists. Otherwise it is the task with the earliest due date or deadline, time of day included; a date without a time counts as the end of that day. A project whose tasks have neither gets an empty value. The task text is stored as entered in Todoist, including any markdown.

Remote projects are matched to local files by `tpt_project_id`. Files that do not have this property yet (written by an older version, or created by hand) are matched by file name instead and receive the id on the next import.

On import:

- A remote project without a local file is created (case A).
- A remote project with a local file gets all its `tpt_` properties replaced (case B). User properties stay in place, `tpt_` properties are appended after them. If the project was renamed in Todoist, the file is renamed to follow it; links to the file in your vault are updated by Obsidian.
- A local project file without a remote project keeps only `tpt_project_id` and `tpt_project_name` and gets `tpt_project_status: deleted` (case C). If a project with the same name is created in Todoist later, it takes over this file.

Two projects whose names normalize to the same file name cannot both be tracked; the second one is skipped and a warning is logged to the developer console. Likewise, a renamed project keeps its old file name if the new one is already taken.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type check + production build
npm run test    # unit tests (node:test via tsx)
npm run lint
```

The plugin folder must live in `<Vault>/.obsidian/plugins/todoist-project-tracker/`. Reload Obsidian after building and enable the plugin under **Settings → Community plugins**.

## License

[MIT](LICENSE)
