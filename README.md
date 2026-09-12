# RFD Board Hub

A private, self-hosted command center for Rage for Democracy board members. The first release combines:

- Night of the Living Loud status pulled directly from Vikunja and Eventbrite
- A shared organizational transaction ledger
- A marketing workspace fed by labeled Vikunja tasks, with a shared print-file library and PDF generation
- A collaborative Substack desk with topic buckets, rich-text drafts, editorial status, and copy-ready output
- Buffer performance insights calculated directly in the hub
- A collaborative Substack issue handoff desk
- A board activity trail

## Run locally

Node 22+ is required. The app deliberately has no third-party runtime dependencies.

```powershell
$env:BOARD_PASSWORD="choose-a-long-board-password"
$env:AUTH_BYPASS="true" # local preview only; remove before deployment
npm start
```

Open `http://localhost:4380`. Data is stored in `data/hub.json` and should be mounted as a persistent Docker volume in production.

## Deploy with Portainer

The repository includes a production `Dockerfile` and [compose.yaml](compose.yaml). In Portainer:

1. Open **Stacks** and choose **Add stack**.
2. Select **Repository**.
3. Use `https://github.com/xyciasav/rfd-board-hub` as the repository URL.
4. Set the compose path to `compose.yaml`.
5. Add a stack environment variable named `BOARD_PASSWORD` with a strong temporary bootstrap password.
6. Optionally set `RFD_HUB_PORT`; it defaults to `4380`. `RFD_HUB_VERSION` defaults to the current release, `0.3.0`.
7. Deploy the stack and open `http://YOUR-SERVER:4380`.

The named `rfd-board-hub-data` volume preserves transactions, receipts, newsletter work, marketing work, targets, and integration settings across container upgrades. Put the service behind an HTTPS reverse proxy before exposing it outside the local network.

The Portainer stack pins an explicit image tag such as `ghcr.io/xyciasav/rfd-board-hub:0.6.4`, so the deployed version is visible in Portainer. Each release updates this tag in the Git repository. Refresh the existing Git-backed stack with **Re-pull image** enabled; no manual Compose edits or version variables are required. Keep the same Portainer stack and named volume so container replacement continues using the existing board data.

Set `PDF_GENERATOR_URL` to the base URL of the donation-letter generator service to enable the Marketing PDF form. Marketing work is pulled from the `Night of the Living Loud` and `Rage for Democracy` Vikunja projects when a task has a label containing `marketing` or `advertising`.

Set `RFD_WRITER_URL` to the OpenAI-compatible Rage assistant API (normally `http://10.0.0.230:8085/v1`) and `RFD_WRITER_MODEL` to `rage-assistant`. The Hub asks that model to turn the form notes into a finished letter before sending it to the PDF renderer. `RFD_WRITER_TOKEN` is optional when the local API has no authentication.

Each release uses a versioned Docker tag such as `rfd-board-hub:0.3.0`. The same version appears on the login screen, beside the signed-in account controls, in `/health`, and in `/api/session`, making it clear whether Portainer is actually running the latest build.

### Switch the splash-page login to Keycloak

1. In Keycloak, create an OpenID Connect client such as `rfd-board-hub`.
2. Enable **Direct Access Grants**. Use a public client, or copy the client secret when using a confidential client.
3. Sign into RFD Hub with the temporary `BOARD_PASSWORD`.
4. Open **Settings** beside your name and configure the Keycloak URL, realm, client ID, and optional client secret.
5. Enable **Use Keycloak for board sign-in** and save.
6. Before signing out, open a private browser window and verify a Keycloak username/password on the existing RFD splash page.
7. Once Keycloak login works, set `ALLOW_BOARD_PASSWORD_LOGIN=false` in Portainer and redeploy. This removes the temporary shared-password fallback.

The browser never displays the Keycloak login page. RFD Hub sends the credentials from its branded form to Keycloak's token endpoint server-side and creates an HTTP-only local session only after Keycloak approves them. During setup, `BOARD_PASSWORD` remains available while `ALLOW_BOARD_PASSWORD_LOGIN=true`, even if a partially configured Keycloak integration is enabled. This direct-grant design does not support Keycloak-hosted MFA, passkeys, external identity-provider redirects, or required-action screens. If a bad setting causes a lockout, temporarily set `AUTH_BYPASS` to `true` in Portainer, correct Settings, and immediately return it to `false`.

## Configure integrations

Sign in and select **Settings** beside the account controls. Add the shared Vikunja server/token, Eventbrite credentials, and Buffer API key there. Vikunja project mappings belong to individual event definitions rather than global integration settings, allowing additional event dashboards later. Secrets are stored only in the server data file and are masked whenever settings are returned to the browser.

The hub is standalone: it does not call Haven or Social Cockpit. It implements the relevant event aggregation and social-insight calculations itself.

### Keycloak without a redirect screen

The RFD login screen can authenticate directly against Keycloak. In Integrations, enter the Keycloak URL, realm, client ID, and optional client secret, then enable **Use Keycloak for board sign-in**. The Keycloak client must have **Direct Access Grants** enabled. Test sign-in in a private browser before ending the setup session. This flow intentionally keeps the branded login screen, but Keycloak-hosted MFA, passkeys, required actions, and identity-provider redirects are unavailable in direct-grant mode. Set `AUTH_BYPASS=true` temporarily for emergency recovery if configuration causes a lockout.

Create these Keycloak realm roles and assign one to every board member: `rfd-viewer` for read-only access, `rfd-editor` for operational editing, and `rfd-admin` for full editing plus Settings/integrations. Client roles with the same names also work. Users with no recognized RFD role default to read-only. The shared board-password recovery login and `AUTH_BYPASS=true` both remain administrators.

## Production notes

- Do not enable `AUTH_BYPASS`.
- Put the app behind HTTPS.
- Set a long `BOARD_PASSWORD`, or set `BOARD_PASSWORD_SALT` and a hex `BOARD_PASSWORD_HASH` generated with scrypt.
- The shared-password login is an MVP. The planned production authentication is Keycloak/OIDC with board roles (`admin`, `treasurer`, `communications`, `writer`, `viewer`).
- Back up the mounted data directory.

## Intentional boundaries

This is an organizational ledger, not a copy of personal Pocket Ledger data. It records RFD income and expenses only. Substack publishing is represented as a writing and handoff workflow; direct publishing should use an approved Substack integration if/when one is available rather than storing account credentials in this app.
