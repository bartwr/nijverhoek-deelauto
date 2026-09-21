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

At runtime the app authenticates with this access token only. It additionally
refuses to run unless the configured account is one of the accounts covered by
the grant, and never falls back to "the first account".

### The one place an API key is still needed

bunq's authentication has two layers. The *installation + device* layer
identifies your server, and bunq only accepts an **API key** as the
device-server secret; an OAuth token is rejected there with "Incorrect API key
or IP address". The access token is used one layer up, as the `secret` of
`POST /session-server` on that same installation. bunq's own reference
implementation works exactly this way.

So an API key is needed **once**, to register the device. The app asks for it
in an admin-only form, uses it for that single request and discards it: it is
never written to the environment, the database or the logs. Nothing at runtime
needs it, so the deployment holds no full-access credential.

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

# Optional: set to "false" to forbid the IP wildcard when registering the
# device. Only do this on a host with a fixed egress IP. See IP_REGISTRATION.md
BUNQ_ALLOW_ALL_IPS=true
```

`BUNQ_API_KEY` is no longer read; the API key is entered in the admin form
during setup instead. Remove the variable from your environment.

## One-time setup

### 1. Create the OAuth client in the bunq app

1. Open the bunq app, go to **Instellingen > Developers > OAuth**.
2. Create an OAuth client. Each bunq user can have only one.
3. Set the redirect URL to
   `https://<your-domain>/api/admin/bunq/oauth/callback`. The admin dashboard
   shows the exact value under "Bunq-koppeling".
4. Copy the client id and secret into `BUNQ_OAUTH_CLIENT_ID` and
   `BUNQ_OAUTH_CLIENT_SECRET` and deploy.

### 2. Register the device

In the bunq app, open the API key you want to use for this step and turn on
**Allow all IP addresses**. Without it the registration is pinned to one IP
address and has to be repeated whenever the hosting platform changes its
egress IP.

Then log in to `/admin`, and in the "Bunq-koppeling" card paste that API key
into **Apparaat registreren bij bunq** and submit. The app:

1. creates an installation for the RSA key pair in
   `BUNQ_PRIVATE_KEY_FOR_SIGNING` (`POST /installation`),
2. registers a device on it with the API key as the secret
   (`POST /device-server`), preferring `permitted_ips: ["<ip>", "*"]`,
3. shows the new installation token **once** and forgets the API key.

Store that token as `BUNQ_INSTALLATION_RESPONSE_TOKEN` and redeploy. An
installation carries exactly one device, so each run of this step creates a new
installation; older ones simply go unused.

See [IP_REGISTRATION.md](IP_REGISTRATION.md) for the IP strategies.

### 3. Authorize the app

1. Click **Koppel bunq-account** in the "Bunq-koppeling" card. You are
   redirected to bunq.
2. Scan the QR code with the bunq app and select **only** the deelauto
   account.
3. bunq redirects back to the app, which exchanges the code for an access
   token and shows it **once**. It is not stored or logged anywhere.
4. Put the token in `BUNQ_OAUTH_ACCESS_TOKEN`, set
   `BUNQ_ACCOUNT_ID_FOR_REQUESTS`, remove `BUNQ_API_KEY`, and redeploy.

### 4. Verify

Click **Test verbinding** in the "Bunq-koppeling" card. It starts a session,
lists the accounts covered by the grant and shows which one payment requests
are pinned to. If `BUNQ_ACCOUNT_ID_FOR_REQUESTS` is not among the granted
accounts, the app refuses to create payment requests and reports the granted
ids instead.

## Re-authorizing

Access tokens do not expire but can be revoked from the bunq app. To
re-authorize, repeat step 3 with the new token. To change which account is
shared, revoke the grant in the bunq app and re-authorize.

Keep the API key used in step 2 alive: the device on the installation is bound
to it. Revoking it invalidates the installation, and you would have to run
step 2 again with another key.

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
| `GET /api/admin/bunq/status` | admin | Config check, device listing and connection test (secrets limited to a 4-char suffix) |
| `POST /api/admin/bunq/setup` | admin | Creates an installation and registers the device, using an API key from the request body |
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
- **"Session start failed: ... Incorrect API key or IP address"**: bunq uses
  this message for several problems. **Test verbinding** now lists the device
  on the configured installation (via `GET /device-server`, which only needs
  the installation token) and shows the last four characters of both tokens,
  then names the likely cause:
  - *No device on this installation*: `BUNQ_INSTALLATION_RESPONSE_TOKEN` is
    still the old value. Store the token that step 2 returned and redeploy.
  - *Installation token rejected*: same fix; the value is stale or truncated.
  - *Device status is not ACTIVE*: confirm it in the bunq app.
  - *Device is ACTIVE*: the access token itself is refused. Every run of
    step 3 invalidates earlier tokens, so make sure the env holds the token
    from the most recent run and redeploy. Also verify the API key (step 2)
    and the OAuth client were created under the same bunq user.
- **"A device already exists for the current installation"**: an installation
  carries one device. Step 2 always creates a fresh installation, so this
  should no longer occur.
- **"User credentials are incorrect. Incorrect API key or IP address"** on
  device registration: the value in the API key field is wrong, revoked, or
  belongs to the other environment (sandbox vs production). An OAuth access
  token is *not* accepted here; it must be an API key from the bunq app.
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
- The API key is only ever held in memory during the admin setup request. It
  is not stored in the environment, the database or the logs, so a compromise
  of the deployment does not expose a full-access credential.
- The `/device-server` failure log no longer prints the installation token.
- Anyone with the access token can create payment requests on the shared
  account and read its payments; treat it like a password.
