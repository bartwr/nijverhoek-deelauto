# Bunq API Integration Setup

This document explains how the app talks to bunq to create payment requests
(`request-inquiry` and `bunqme-tab`) and how to set it up with the least
possible privileges.

## Why OAuth instead of an API key

A bunq API key generated in the bunq app has **full control over the whole
user**: every monetary account, outgoing payments, cards. bunq offers no way to
restrict what an API key may do.

bunq OAuth is the scoping mechanism bunq does offer. You register an OAuth
client from the bunq app, then authorize this app by scanning a QR code. During
that consent step **you select which monetary account(s)** the resulting
access token may see. The token:

- can create payment requests (`request-inquiry`, `bunqme-tab`) and read
  payments on the selected account(s);
- **cannot send money to third parties**. It can only move money between your
  own accounts, and create draft payments that must be approved in the bunq
  app;
- can still create monetary accounts and manage cards, so keep it secret.

The app uses this access token exactly where it previously used the API key. It
additionally refuses to run unless the configured account is one of the
accounts covered by the grant, and never falls back to "the first account".

## Required Environment Variables

```bash
# bunq OAuth client, created in the bunq app (Instellingen > Developers > OAuth)
BUNQ_OAUTH_CLIENT_ID=your_oauth_client_id
BUNQ_OAUTH_CLIENT_SECRET=your_oauth_client_secret

# Access token obtained via the admin dashboard (see below)
BUNQ_OAUTH_ACCESS_TOKEN=your_access_token

# The monetary account payment requests are created on. Must be one of the
# accounts selected during OAuth consent. Optional only when exactly one
# account was granted.
BUNQ_ACCOUNT_ID_FOR_REQUESTS=123456

# Installation (RSA key pair registered with bunq once)
BUNQ_INSTALLATION_RESPONSE_TOKEN=your_installation_token
BUNQ_PRIVATE_KEY_FOR_SIGNING="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

BUNQ_API_BASE_URL=https://api.bunq.com
# Sandbox: BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com
# (the OAuth URLs switch to the sandbox automatically when this contains "sandbox")

# Base URL of this app; used to build the OAuth redirect URL
NEXT_PUBLIC_BASE_URL=https://auto.nijverhoek.nl

# Optional: re-register the server IP on first use in production
BUNQ_AUTO_REGISTER_IP=true
```

`BUNQ_API_KEY` is no longer read. Remove it from your environment and revoke
the key in the bunq app.

## One-time setup

### 1. Create the OAuth client in the bunq app

1. Open the bunq app, go to **Instellingen > Developers > OAuth**.
2. Create an OAuth client. Each bunq user can have only one.
3. Set the redirect URL to
   `https://<your-domain>/api/admin/bunq/oauth/callback`. The admin dashboard
   shows the exact value under "Bunq-koppeling".
4. Copy the client id and secret into `BUNQ_OAUTH_CLIENT_ID` and
   `BUNQ_OAUTH_CLIENT_SECRET` and deploy.

### 2. Authorize the app

1. Log in to `/admin` and click **Koppel bunq-account** in the
   "Bunq-koppeling" card. You are redirected to bunq.
2. Scan the QR code with the bunq app and select **only** the deelauto
   account.
3. bunq redirects back to the app, which exchanges the code for an access
   token and shows it **once**. It is not stored or logged anywhere.
4. Put the token in `BUNQ_OAUTH_ACCESS_TOKEN`, set
   `BUNQ_ACCOUNT_ID_FOR_REQUESTS`, remove `BUNQ_API_KEY`, and redeploy.

### 3. Bind the token to the server

bunq binds a secret to an installation and IP address via `POST
/device-server`. Because the secret changed, this has to be done once more:

- click **Registreer server-IP** in the "Bunq-koppeling" card, or
- set `BUNQ_AUTO_REGISTER_IP=true` so it happens on first use in production.

See [IP_REGISTRATION.md](IP_REGISTRATION.md) for details.

### 4. Verify

Click **Test verbinding** in the "Bunq-koppeling" card. It starts a session,
lists the accounts covered by the grant and shows which one payment requests
are pinned to. If `BUNQ_ACCOUNT_ID_FOR_REQUESTS` is not among the granted
accounts, the app refuses to create payment requests and reports the granted
ids instead.

Finally, revoke the old API key in the bunq app.

## Re-authorizing

Access tokens do not expire but can be revoked from the bunq app. To
re-authorize, repeat step 2 and 3 with the new token. To change which account
is shared, revoke the grant in the bunq app and re-authorize.

## How It Works

1. When a user clicks "Betaal nu", the system creates a payment record.
2. If `create_bunq_request` is true, the system:
   - starts a bunq session with `secret = BUNQ_OAUTH_ACCESS_TOKEN`, signed
     with `BUNQ_PRIVATE_KEY_FOR_SIGNING`, authenticated with
     `BUNQ_INSTALLATION_RESPONSE_TOKEN`;
   - reads the `UserApiKey` id from the session response (for OAuth sessions
     this id, not the person id, is used in `/user/{id}/...` URLs);
   - lists the granted monetary accounts and pins
     `BUNQ_ACCOUNT_ID_FOR_REQUESTS`;
   - creates a `request-inquiry` (bunq users) or `bunqme-tab` (everyone else)
     on that account and stores the id and payment URL.
3. Payment status is synced through `GET .../request-inquiry/{id}` or
   `GET .../bunqme-tab/{id}`.

## Admin endpoints

All bunq endpoints require a session:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/admin/bunq/oauth/start` | admin | Redirects to the bunq authorization page |
| `GET /api/admin/bunq/oauth/callback` | admin | Exchanges the code, shows the token once |
| `GET /api/admin/bunq/status` | admin | Config check and connection test (no secret values) |
| `POST /api/bunq/register-ip` | admin | Registers the server IP with bunq |
| `GET|POST /api/payments/sync-bunq-status` | admin or member | Syncs payment statuses |

The former unauthenticated debug endpoints `/api/test-bunq`,
`/api/test-bunq-env` and `/api/test-private-key` have been removed.

## Troubleshooting

- **"BUNQ_OAUTH_ACCESS_TOKEN environment variable is required"**: run the
  authorization flow from the admin dashboard.
- **"BUNQ_OAUTH_CLIENT_ID en BUNQ_OAUTH_CLIENT_SECRET zijn niet ingesteld"**:
  create the OAuth client in the bunq app and set both variables.
- **"De state komt niet overeen"**: the CSRF cookie expired (10 minutes) or
  the flow was started in another browser. Start again from `/admin`.
- **"Session start failed: 401"**: the token is not bound to this server IP
  yet, or was revoked. Click "Registreer server-IP" or re-authorize.
- **"BUNQ_ACCOUNT_ID_FOR_REQUESTS (...) is not among the accounts granted"**:
  either change the variable to one of the listed ids, or re-authorize with
  the right account selected.
- **"The OAuth grant covers N accounts"**: more than one account was shared
  and no account id is configured. Set `BUNQ_ACCOUNT_ID_FOR_REQUESTS`.
- **Private key format**: the key may be a PEM string, a PEM string with
  `\n` escapes, or base64-encoded PEM; all three are accepted.

## Security notes

- The access token, client secret, installation token and private key are
  read from environment variables only and never returned by any endpoint.
- The `/device-server` failure log no longer prints the installation token.
- Anyone with the access token can create payment requests on the shared
  account and read its payments; treat it like a password.
