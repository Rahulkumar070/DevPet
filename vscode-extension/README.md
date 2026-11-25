# DevPet for VS Code

Keep your active coding companion in the status bar, earn XP while you work, and inspect what a Git push will send. The editor scans, outgoing review, pre-push hook, and local push history work without signing in.

## Install and connect

Open a trusted repository in desktop VS Code 1.80 or newer. Use **Extensions: Install from VSIX…** to install a local package. To connect a pet, sign in to your DevPet dashboard, hatch or select a companion, and generate a token under **Settings → API**. Set `devpet.apiUrl` to that server, then run **DevPet: Set API Token**. DevPet verifies the token and saves it in SecretStorage for that server.

New installations use `http://localhost:3000`. An existing installation with credentials for the previous default keeps its server address. Remote deployments require HTTPS. Run **DevPet: Show Companion Status** to refresh after selecting another pet. Hover over the connected pet to see its species, evolution stage, mood, level, and five stats.

## Commands

Open the Command Palette and type **DevPet**.

| Command | Result |
| --- | --- |
| **Open Dashboard** | Opens the configured deployment in your browser. |
| **Set API Token** | Verifies and stores a token for that deployment. |
| **Show Companion Status** | Refreshes the active pet. Offers the hatchery when the account has no active pet. |
| **Sync XP Now** | Asks the server to sync recent GitHub commits and reports earned XP. |
| **Scan Project for Sensitive Files** | Checks the selected workspace folder for protected names and credential indicators. Findings can be inspected in the editor. |
| **Install Git Pre-Push Security Hook** | Installs the offline hook for the selected repository. Run again after upgrading to refresh it. Existing unmanaged hooks and custom hook directories are preserved. |
| **Review Outgoing Changes** | Previews a branch using local history. Opens the DevPet panel in Explorer with the destination, commits, changed files and scanner findings. Select a finding for its committed patch. |
| **Check Again** | Reruns the review for the same remote and destination branch using the current HEAD. |
| **Where Was I?** | Shows the selected workspace’s current branch, saved next step, file bookmark and last check. |
| **Edit Branch Note** | Saves one line and bookmarks the active workspace file and line. Clear the line to delete the note. |
| **Open Bookmarked File** | Returns to the saved location for the current branch. |
| **Run Workspace Check** | Lets you select an existing foreground build or test task, then records its process exit result. |
| **Review Release Contents** | Inspects a finished VSIX or gzipped npm tarball and compares its files with a locally approved inventory. |
| **Show Local Push History** | Lists the latest 100 local checks and reconstructs file changes when the Git objects are available. |

## Push protection

The preview groups changed paths across committed history. Staged and unsaved edits enter the review after commit. With standard tracking, it compares against the cached destination. A missing or ambiguous destination tip makes the review include the entire reachable history. Fetch first for a newer comparison.

Once installed, the hook works in a terminal with VS Code closed. Git and Node must be available to the pushing client. The hook checks outgoing refs, including intermediate commits, for protected paths and recognized credential patterns. It requires a full clone, checks binary files by name, and stops when a blob exceeds 16 MiB. Submodules need their own installation. Local receipts contain refs, object IDs, counts, time, and outcome. They stay under `devpet/push-checks` in Git’s common directory. A passed receipt records the local check. The remote decides whether to accept the push.

## The DevPet panel

Open **Explorer → DevPet**. During a review, the pet shows progress. Expand the flagged files and select one to open the patch where the scanner first flagged it in the outgoing range. The Files group also includes later deletions. **Check Again** scans the revised history. Clearing a previously flagged review gives one celebration. Quiet mode keeps optional pet reactions in the panel. The displayed HEAD identifies the snapshot you reviewed.

**Where Was I?** keeps notes and bookmarks locally per workspace folder and branch. A detached checkout gets its own revision-specific note. Returning to a branch with a saved note offers a reminder. Choose **Run Workspace Check** to select a foreground shell or process task with the `build` or `test` group in that folder. DevPet only launches the task you choose. The result includes its exit status and completion time. Interrupted or unverified runs have an unknown result.

Freshness compares the tested worktree with the current saved files. DevPet considers HEAD, staged entries, and non-ignored changed or untracked files. Ignored outputs, unsaved buffers, environment variables, and external services are outside that comparison. Worktrees with unreadable data, dirty submodules, over 10,000 changed paths or over 64 MiB of changed files can show **Freshness unknown**.

**Review Release Contents** uses Python 3.8+ to read a finished archive locally. The first review lists every file. Choose **Approve inventory** to save a comparison for that package in the workspace. The next review shows added, changed and removed files, and flags protected names, source maps, nested archives and growth of at least 1 MiB per file. Nested archives are flagged by name. The report includes the exact archive digest. DevPet stores filenames, sizes and hashes. The inspector accepts archives up to 128 MiB, with 256 MiB expanded and 10,000 entries. Approval records a local comparison and leaves publishing under your control.

## Activity and settings

Workspace saves are grouped into 30-second windows. Accepted saves earn 5 account XP, up to 10 per hour. Closing a connected session earns 5 XP per completed 15 minutes. The active pet receives half of each award, rounded down. The pet refreshes after save XP and every five minutes. Source text, patches, file paths and detected values stay local during these checks. A connected editor sends activity and aggregate finding counts to the configured DevPet server.

| Setting | Default | Effect |
| --- | --- | --- |
| `devpet.apiUrl` | `http://localhost:3000` | Selects the DevPet server and its saved credential. |
| `devpet.quietMode` | `false` | Silences branch reminders and review celebrations and uses a static progress icon. |
| `devpet.showInStatusBar` | `true` | Shows or hides the status bar item. |
| `devpet.securityScanEnabled` | `true` | Enables automatic editor scans. Manual commands remain available. |
| `devpet.securityScanOnSave` | `true` | Runs advisory checks when a workspace file is saved. |

An installed Git hook continues to run independently of these editor settings. To replace the extension credential, generate a token in the dashboard and use **Set API Token**. Legacy user-level tokens migrate from `devpet.apiToken` to SecretStorage.

## Build and verify

Run these commands in the extension directory with Node.js 24 LTS, npm, Git, and Python 3.

```sh
npm ci
npm test
npm run package -- --out devpet.vsix
python3 scripts/check-vsix.py devpet.vsix
```

Install the inspected VSIX to try the build. The extension uses the MIT license included in this package.

To exercise the packaged extension in an actual VS Code window, run `python3 scripts/test-host.py devpet.vsix` with the desktop `code` CLI on your PATH (or supply `--code /path/to/code`). The test uses a temporary profile, a local fixture server, and a temporary Git repository. It checks activation, pet changes, recovery after a failed refresh, save reporting, session closure, and hook installation.
