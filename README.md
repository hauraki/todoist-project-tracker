# Todoist Project Tracker

An Obsidian plugin that imports your Todoist projects into your vault so you can track them alongside your notes.

The plugin is **read-only** towards Todoist: it only ever reads data via the Todoist API and never writes anything back.

## Settings

- **Todoist API token** (required): your personal API token, found in Todoist under **Settings → Integrations → Developer**.
- **Projects folder** (optional): the vault folder that holds the project files. Defaults to `TPT`.

## Commands

- **Import projects**: fetches all active and archived projects (and the active tasks of active projects) from Todoist and reconciles them with the files in the projects folder. A notice shows how many files were created, updated and marked as deleted.

## How it works

Each Todoist project maps to one markdown file in the projects folder (flat, no nesting). The file name is the project name with characters that are not allowed in Obsidian file names (`* " \ / < > : | ? # ^ [ ]`) replaced by a space. A file counts as a project file as soon as its frontmatter has at least one `tpt_` property.

All properties written by the plugin are prefixed with `tpt_`. You can add your own properties to a project file; the plugin never touches them.

| Property | Active | Archived | Deleted |
| --- | --- | --- | --- |
| `tpt_parent_project_name` | parent name or empty | empty | |
| `tpt_project_color` | ✓ | ✓ | |
| `tpt_project_description` | if set | if set | |
| `tpt_project_is_favorite` | ✓ | | |
| `tpt_project_link` | `todoist://project?id=…` | ✓ | |
| `tpt_project_name` | original name | ✓ | ✓ |
| `tpt_project_rank` | position in Todoist's project tree (1-based) | | |
| `tpt_project_status` | `active` | `archived` | `deleted` |
| `tpt_tasks_count` | ✓ | | |
| `tpt_tasks_labels` | set of all task labels | | |
| `tpt_tasks_first_due_on` / `tpt_tasks_last_due_on` | earliest / latest due date | | |
| `tpt_tasks_first_deadline_on` / `tpt_tasks_last_deadline_on` | earliest / latest deadline | | |

On import:

- A remote project without a local file is created (case A).
- A remote project with a local file gets all its `tpt_` properties replaced (case B). User properties stay in place, `tpt_` properties are appended after them.
- A local project file without a remote project keeps only `tpt_project_name` and gets `tpt_project_status: deleted` (case C).

Two projects whose names normalize to the same file name cannot both be tracked; the second one is skipped and a warning is logged to the developer console.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type check + production build
npm run test    # unit tests (node:test via tsx)
npm run lint
```

The plugin folder must live in `<Vault>/.obsidian/plugins/todoist-project-tracker/`. Reload Obsidian after building and enable the plugin under **Settings → Community plugins**.
