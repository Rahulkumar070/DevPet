<p align="center"><img src="public/devpet-mascot.webp" width="120" alt="DevPet mascot"></p>

# DevPet

DevPet gives you a coding companion in VS Code and a self-hosted dashboard where you can hatch pets, track their growth, and see which pushes GitHub accepted. Its Git hook also helps catch accidental disclosures. A private file added in one commit can still travel with a push even if you delete it in the next commit. DevPet checks that history before Git sends it.

Every feature is available without a DevPet subscription. You can use the local Git tools without an account, a running DevPet server, or a GitHub repository. Connected features use your own deployment and any external services you configure.

[Try the Git tools](#try-the-git-tools) · [Run the dashboard](#run-the-dashboard) · [Connect your pet](#connect-your-pet-to-vs-code) · [Privacy](#what-devpet-remembers) · [Development](#development-and-checks)

## Try the Git tools

Use Node.js 24 LTS for development and packaging, npm, Git, Python 3 for archive verification, and desktop VS Code 1.80 or newer. Run these commands from the project directory.

```sh
npm ci --prefix vscode-extension
npm test --prefix vscode-extension
npm run package --prefix vscode-extension -- --out devpet.vsix
python3 vscode-extension/scripts/check-vsix.py vscode-extension/devpet.vsix
```

1. In VS Code, open the Command Palette, run **Extensions: Install from VSIX…**, and choose `vscode-extension/devpet.vsix`.
2. Open a trusted folder containing a full Git clone. Run **DevPet: Install Git Pre-Push Security Hook** for that repository. Git and Node must be on the PATH used by your Git client.
3. Run **DevPet: Review Outgoing Changes**. Choose a remote and destination branch. The DevPet panel in Explorer lists the destination, outgoing commits, findings, and files deleted later in the range. Select a finding to open its committed patch. **Check Again** reruns the review after a fix. The preview compares against a cached branch tip when available. Git supplies the actual refs to the hook at push time.
4. Use your normal push command. **DevPet: Show Local Push History** shows checks that passed, were blocked, or could not finish. A passed check means Git could attempt the transfer. A server can still reject it.

To try this without GitHub, run the extension tests above. They create temporary working copies and bare Git remotes on your computer, perform real pushes, and check which commits reached the destination.

### More tools in the DevPet panel

- **Where Was I?** saves a short next step and file bookmark for each branch. Return to a branch to resume at the bookmarked line.
- **Run Workspace Check** runs a foreground build or test task you select. The panel shows its outcome, time, and whether the saved worktree still matches what was tested.
- **Review Release Contents** compares a finished VSIX or npm tarball with the previous inventory you approved. It highlights new files, source maps, nested archives and significant growth before publication.

These tools use local workspace storage and work without a DevPet account. Enable `devpet.quietMode` for a static progress indicator and silent branch reminders and celebrations. [Commands, scope and limits](vscode-extension/README.md)

### What the hook checks

The hook walks outgoing commits, including merge changes, and checks protected paths and recognized credential patterns in text blobs. Examples include private key files, local environment files, and local Claude session files. A new branch can require scanning its entire reachable history. A blocked or incomplete check exits with an error. Offline pushes from the terminal use the same installed hook with VS Code closed.

The current hook requires full history and can inspect blobs up to 16 MiB. Binary content receives filename checks only. Submodules need their own hook. Existing unmanaged hooks and custom hook directories need manual integration. The editor’s on-save and project scans are advisory and use a broader set of patterns. Inspect the actual rule lists when deciding whether they cover your project. [Hook implementation](vscode-extension/src/pushGuard.ts) · [Editor scanner rules](vscode-extension/src/constants.ts)

## Run the dashboard

The app uses Next.js 16, React 19, TypeScript, MongoDB, and a custom Node server for Socket.IO and scheduled work. MongoDB and a GitHub OAuth app are enough to sign in and hatch a pet.

1. Start MongoDB locally or obtain a MongoDB connection string.
2. Install web dependencies. On a fresh checkout, copy the configuration template. Preserve your existing `.env.local` if you already have one.

   ```sh
   npm ci
   cp -n .env.local.example .env.local
   ```

3. Register a GitHub OAuth app with homepage `http://localhost:3000` and callback `http://localhost:3000/api/auth/callback/github`. Copy its client ID and secret to `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local`. [GitHub OAuth app setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
4. Set `MONGODB_URI` to your database, for example `mongodb://127.0.0.1:27017/devpet`. Generate independent values for `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`. The latter must decode to 32 bytes and protects stored GitHub access tokens. Keep these values stable between restarts.

   ```sh
   openssl rand -base64 32   # NEXTAUTH_SECRET
   openssl rand -hex 32      # ENCRYPTION_KEY
   ```

5. Verify the database and start DevPet.

   ```sh
   npm run db:check
   npm run dev
   ```

Open [the local dashboard](http://localhost:3000/dashboard), sign in with GitHub, and visit **Hatchery**. Your newly hatched companion becomes active. In **Settings → Companions**, you can switch the active pet and control its public profile.

## Connect your pet to VS Code

1. In VS Code settings, set `devpet.apiUrl` to the same server you used in your browser. New installations default to `http://localhost:3000`. Use HTTPS for a remote server.
2. In DevPet, open **Settings → API** and choose **Generate Token**. Generating another token replaces the previous one for your account.
3. Run **DevPet: Set API Token** in the Command Palette. The extension verifies the token with your server and stores it in VS Code SecretStorage for that server.
4. Run **DevPet: Show Companion Status**. With an active pet, the status bar shows its mood, name, and level. Hover to see its five stats. Click the connected pet to open the dashboard. An account without an active companion gets a hatchery action.
5. Save a file inside the workspace. The extension groups saves in a 30-second window and refreshes the pet after an awarded save. It also checks the active pet every five minutes. **Show Companion Status** requests a fresh reading after changing pets in the browser.

| Activity                | What your pet and account receive                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Editor save             | 5 account XP per accepted save event, up to 10 events per hour.                                                              |
| Editor session          | 5 account XP per completed 15 minutes when DevPet closes the session. A forced process exit can prevent the closing request. |
| Editor security finding | The server awards 5 XP per finding plus 10 per critical finding, capped at 50 per report.                                    |
| GitHub activity sync    | Newly recorded commits earn 10–20 account XP. **DevPet: Sync XP Now** requests a sync.                                       |
| Pet growth              | The active companion receives half of each award, rounded down. Its level caps at 50. It evolves at levels 10 and 30.        |

Local Git hooks run independently of editor XP. A blocked terminal push produces a local receipt. [Extension commands and settings](vscode-extension/README.md)

## Explore the workspace

| Section                      | What you can do                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard and activity       | See your active pet, XP, streak, recent commits, and private confirmed pushes. Search recent commits and switch between cards and a table.                                                  |
| Analytics                    | Explore activity over time, XP snapshots, and companion stats. Historical coverage starts when DevPet records data.                                                                         |
| Hatchery and companion cards | Hatch a companion with a species, rarity, personality, and stats. Manage your collection and share a public card when desired.                                                              |
| Companion chat               | Talk with the active pet. Chat uses recent conversation and a memory summary. A configured Anthropic key enables model-generated replies. Without a key, the app supplies a built-in reply. |
| Battle arena and guilds      | Challenge companions, review battle results, join or create a guild, and take part in guild wars.                                                                                           |
| Settings                     | Manage the active companion, profile visibility, extension token, and notification preferences.                                                                                             |

## Receive confirmed pushes from GitHub

GitHub OAuth signs users in. To also receive delivery confirmations, the deployment operator registers a **GitHub App** and repository owners install it on the repositories they choose. This integration needs a publicly reachable HTTPS endpoint.

1. Set the app’s webhook URL to `https://your-devpet-host.example/api/github/webhook`. Generate a random webhook secret and set the same value in GitHub and the server’s `GITHUB_WEBHOOK_SECRET`.
2. Grant **Contents → Read-only**, subscribe to **Push**, and install the app on selected repositories. Optionally set `GITHUB_APP_SLUG` to its URL slug to enable **Connect repositories** in the dashboard.
3. Restart the server and sign in to DevPet before the first push you want recorded. **Dashboard → Confirmed pushes** displays the latest 20 deliveries associated with the signed-in sender. It refreshes every 30 seconds.
4. For a missing delivery, check the app’s **Recent deliveries**. A successfully handled request returns HTTP 204. DevPet verifies the signature over the original body and deduplicates redeliveries. An unlinked sender is acknowledged without creating a timeline row. Removal of an installation stops future deliveries. Earlier records remain in the database.

GitHub applies delivery and payload limits. A gap in the timeline means DevPet has no matching receipt. The separate activity feed polls recent GitHub events for commit XP. [GitHub push events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push) · [Webhook signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

## What DevPet remembers

| Location              | Data                                                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer’s machine   | Reviews display local paths and patches. Hook receipts store time, result, remote alias when available, refs, object IDs and counts in the Git common directory under `devpet/push-checks`. The history viewer reconstructs file lists from local Git objects. |
| VS Code SecretStorage | A DevPet token scoped to the configured server address.                                                                                                                                                                                                        |
| Self-hosted database  | Account and companion data, XP, chat memory, battles, guilds, and synced commit metadata including a short commit message. Confirmed pushes store repository, ref, revisions, flags, delivery identifiers and receipt time.                                    |
| Editor requests       | Save and session events, duration, and aggregate security finding counts. The editor scanner and hook keep file contents, patches, detected values, and finding paths on the developer’s machine.                                                              |
| Optional services     | Model-backed chat sends the prompt and relevant companion context to Anthropic. Configured email and Web Push services handle their respective notifications.                                                                                                  |

New companions have public cards by default. The public card exposes selected profile and game fields. Private chat memory and the owner’s confirmed-push timeline stay outside the public profile. [Public card field list](src/lib/db/models/Companion.ts)

## Configuration and deployment

The [environment template](.env.local.example) lists the settings used by the web app. Restart the server after changing server-side configuration.

| Variables                                                                       | Purpose                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                                                   | Persistent application data.                                                             |
| `NEXTAUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY` | Session signing, GitHub login, and encryption of stored GitHub access tokens.            |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `HOST`, `PORT`                           | Site origin and server binding. Match the deployed origin to the GitHub OAuth callback.  |
| `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_SLUG`                                      | Optional push confirmations and the app installation link.                               |
| `REDIS_URL`                                                                     | Shared cache and counters. A single process can use the in-memory fallback.              |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`                                           | Optional AI and email providers. External provider usage follows your own account terms. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                                         | Optional Web Push notifications. Generate a pair with `npm run generate:vapid`.          |

For production, run `npm run build` followed by `npm start`. Use the custom server entry point for Socket.IO and scheduled jobs. The health endpoint at `/api/health` checks database connectivity. To load the bundled achievement definitions, run `npm run seed:achievements`.

## Development and checks

| Path                                                        | Responsibility                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [src/app](src/app)                                          | Dashboard pages, authentication UI, public cards, and HTTP routes.                                                    |
| [src/lib](src/lib)                                          | Companion generation and growth, GitHub ingestion, MongoDB models, authentication, battle rules, and background jobs. |
| [src/components](src/components)                            | Dashboard, companion artwork and cards, analytics, and shared UI.                                                     |
| [vscode-extension](vscode-extension)                        | VS Code commands, status bar, editor events, offline Git scanner, and VSIX packaging.                                 |
| [tests](tests) and [extension tests](vscode-extension/test) | Web integration tests and local Git/extension regression checks.                                                      |
| [CI workflow](.github/workflows/checks.yml)                 | Installs locked dependencies, runs checks, builds the app, and inspects the finished VSIX.                            |

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm test --prefix vscode-extension
```

The web tests require MongoDB on `127.0.0.1:27017`. They use uniquely named temporary databases and remove them afterward. When contributing, include a small reproduction, the expected behavior, and the relevant check. Use synthetic values in scanner fixtures and redact credentials from issue reports. 

## License

The DevPet application and VS Code extension are available under the [MIT License](LICENSE).

### Troubleshooting

| Symptom                                      | First check                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub sign-in returns to the login page     | Match the OAuth callback, site origin and credentials exactly. Run `npm run db:check` and verify that the encryption key decodes to 32 bytes. |
| VS Code rejects a token                      | Generate it on the same DevPet server configured in the extension. Check that server’s health endpoint and use **Set API Token** again.       |
| The pet is missing or out of date            | Select an active companion in the browser, then run **Show Companion Status**. An offline label means the last refresh failed.                |
| A clean working tree still triggers the hook | Review the outgoing commits. A sensitive file may be present in an earlier commit. Adding an ignore rule only affects future untracked paths. |
| A passed push check has no dashboard row     | Look for the Git remote’s acceptance message, then check the GitHub App installation, linked account, and webhook delivery.                   |

## Roadmap

Planned work includes delivery-gap reconciliation, more scanner coverage, and controls to export or remove stored pet history. These are areas for contribution. The commands and setup above describe features in the current codebase.
