# RFD Board Hub

A private, self-hosted command center for Rage for Democracy board members. The first release combines:

- Night of the Living Loud status pulled directly from Vikunja and Eventbrite
- A shared organizational transaction ledger
- A lightweight marketing work board
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

## Configure integrations

Sign in and select the settings cog in the top-right corner. Add the Vikunja server/token/project, Eventbrite event ID/token, and Buffer API key there. Secrets are stored only in the server data file and are masked whenever settings are returned to the browser.

The hub is standalone: it does not call Haven or Social Cockpit. It implements the relevant event aggregation and social-insight calculations itself.

## Production notes

- Do not enable `AUTH_BYPASS`.
- Put the app behind HTTPS.
- Set a long `BOARD_PASSWORD`, or set `BOARD_PASSWORD_SALT` and a hex `BOARD_PASSWORD_HASH` generated with scrypt.
- The shared-password login is an MVP. The planned production authentication is Keycloak/OIDC with board roles (`admin`, `treasurer`, `communications`, `writer`, `viewer`).
- Back up the mounted data directory.

## Intentional boundaries

This is an organizational ledger, not a copy of personal Pocket Ledger data. It records RFD income and expenses only. Substack publishing is represented as a writing and handoff workflow; direct publishing should use an approved Substack integration if/when one is available rather than storing account credentials in this app.
