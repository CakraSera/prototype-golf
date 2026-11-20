# Dial Golf Prototype

Dial Golf helps a golfer decide what to practice after a shot. The Expo app matches a reported ball flight to a practice drill and saves completed drills to the golfer’s account through the Hono/PostgreSQL API. Its Today and Progress pages follow the mobile wireframe while retaining the app’s existing header, native tabs, and cream/green/gold palette.

The first-use goal is for a new golfer to reach the first practice instruction within **120 seconds**. The current demo has three sample drills for coach review.

## Table of contents

- [Try the prototype](#try-the-prototype)
- [Run locally](#run-locally)
- [Architecture](#architecture)
- [Flowchart](#flowchart)
- [Features and UI design](#features-and-ui-design)
- [Database ERD](#database-erd)
- [REST API endpoints](#rest-api-endpoints)
- [Scope and limits](#scope-and-limits)

## Try the prototype

[Open the mobile wireframe](https://dial-golf-mobile-wireframe.acuteforge8.chatgpt.site) · Access is restricted to approved viewers.

The hosted wireframe stores history in its browser. The Expo app requires an account, uses **Today** for the practice flow and **Progress** for server-backed history, and keeps each account’s records private.

1. Under **Report a shot**, select **Right** for start line, **Straight** for curve, and **Normal** for height. Tap **Find my drill**.
2. Open **Start-line check** by tapping **Start drill**. The first instruction asks you to pick a visible target and call the starting direction of your next shot.
3. Tap **Mark complete**. Progress shows the saved drill, completion time, and last-seven-days activity. Reload the page and sign in again to retrieve the saved entry.

To try the other branch, enter **Left / Left / High**. Dial displays **No matching drill**. Tap **Edit shot** to return with all three selections intact.

## Run locally

Requirements: Node >=22, pnpm, and PostgreSQL 18 (or Docker Compose).

```sh
pnpm install
cp .env.example .env
# Fill POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL,
# and JWT_SECRET_KEY (at least 32 characters). The URL must use the same
# credentials/database as the local container, on localhost:5432.
docker compose up -d --wait
pnpm --filter @golf/api db:migrate
pnpm dev:api
```

Migrations create the account tables and seed the three reference drills and matching rules. The API does not migrate automatically at startup.

In a separate terminal, start the app:

```sh
pnpm dev:mobile
```

Mobile's `dev`, `start`, `android`, and `ios` scripts load the root `.env` through `with-env`, just like the API. Set `EXPO_PUBLIC_API_URL` there: for a physical phone, replace `localhost` with the API machine’s reachable LAN address; Android emulators can use `10.0.2.2`. Use HTTPS for a deployed API. The URL is inlined into the app at build/export time, so restart Expo and reload the app after changing it. Only `EXPO_PUBLIC_` values are exposed to the app bundle; never use that prefix for secrets.

Use SDK 58 Expo Go or rebuild an existing development client after installing the new native dependencies (`expo-secure-store`, `expo-crypto`, and `react-native-svg`).

Create an account with a full name, username, email, and a 15–128 character password. Native sessions use SecureStore until the seven-day token expires. Web sessions are memory-only, so a page reload requires sign-in again; saved history remains on the server.

Check the app's types and focused calendar calculation tests:

```sh
pnpm typecheck
pnpm --filter @golf/mobile test:unit
```

The isolated API integration suite requires a PostgreSQL 18 database where the test user can create/drop schemas:

```sh
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/test_db pnpm --filter @golf/api test
```

Tests migrate and seed a unique temporary schema, cover account isolation and concurrent idempotent retries, then remove that schema. Do not point verification at a production database. See [API setup and deployment](apps/api/README.md) for configuration and migration details.

## Architecture

| Layer | Browser wireframe | Expo app |
| --- | --- | --- |
| Presentation | HTML/CSS screens and flight diagrams. | Expo Router Today/Progress tabs; native header; responsive SVG flight diagrams; current app palette. |
| Application | Local exact matching and practice state. | Authenticated API matching, retained shot drafts, one attempt UUID per started practice, explicit retry. |
| Data | Three sample rules and browser-local completions. | Hono API, Drizzle/PostgreSQL catalog and per-user completions; existing email/password authentication. |

The reference wireframe is independent of the app. There is no Supabase dependency or anonymous guest session in the implemented app.

## Flowchart

```mermaid
flowchart TD
    signin["Sign in / Register"] --> report
    report["Report a shot"] --> match{"Exact match?"}
    match -->|No| missing["No matching drill"]
    missing -->|Edit shot| report
    match -->|Yes| drill["Suggested drill"]
    drill -->|Start drill| practice["First practice instruction"]
    practice -->|Mark complete| save{"Practice saved?"}
    save -->|No| retry["Retry save"]
    retry -->|Same attempt| save
    save -->|Yes| history["Progress: activity and saved drills"]
    history -->|Go to Today: keep draft| report
    history -->|Report a new shot: clear draft| report
```

## Features and UI design

| Screen or state      | What the golfer sees and can do                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Report a shot        | Select all three values to enable **Find my drill**. The diagram updates as the shot changes. A sample picker can prefill the form. |
| Suggested drill      | See the flight summary, feedback, and drill title. Choose **Start drill** or **Edit shot**.                                         |
| Practice in progress | Read one instruction for the next ball. **Mark complete** saves this attempt. A failed write offers **Retry save**.                 |
| No matching drill    | Review the unmatched shot, edit the selections, or try a sample.                                                                    |
| Progress             | See seven-day practice totals and daily counts above saved drills grouped by local day, newest first. Starting a drill adds no activity until it is completed and saved. |

### Practice activity

**Last 7 days** means today and the preceding six calendar dates in the device's current timezone, not a fixed 168-hour interval. Distinct saved attempt IDs count as completed drills; dates with at least one completion count as practiced days. Retrying an attempt counts once. Older practice remains in history even when both current totals are zero.

The window updates when Progress gains focus, when the app returns to the foreground, and at the next local midnight while the tab is open. A timezone change can regroup earlier completions. Invalid timestamps are omitted from activity and history rendering, with a development diagnostic.

Unknown history shows loading rather than zero activity or first-drill messaging. A failed refresh preserves the last loaded summary and list; a save acknowledgement remains separate from any refresh warning. **Go to Today** preserves the current draft. **Report a new shot** explicitly clears it.

These counts describe **practice activity, not a skill score**. There are no streaks or scores.

### Verification notes — 20 November 2026

- Passed workspace typechecking, nine mobile calendar tests (including Jakarta boundaries and New York DST), and eleven API integration tests against an isolated PostgreSQL 18.7 database.
- Exercised Expo web in Chromium at 320, 390, and 430 logical pixels: empty/populated Progress, seven readable date/count labels, all three seeded drills, abandonment, unmatched editing, draft-preserving navigation, lost save response and idempotent retry, loading/failure/recovery, retained data after refresh failure, account isolation, and history after signing in again.
- Verified live midnight rollover and browser freeze/resume using a controlled Chromium clock. Verified older-only history remains visible with zero seven-day totals.
- Android/iOS devices were unavailable. Native safe areas, large system text, VoiceOver/TalkBack, and five representative timed first-use sessions remain unverified; no 120-second usability result is claimed.


### Sample shot rules

Start line is the ball’s initial direction relative to the intended target. Curve is how it bends afterward. Height is relative to the golfer’s usual shot. The three choices for each input yield 27 combinations. In the seeded demo, three have reference rules and the other 24 open the unmatched state; this is not a live catalog coverage claim. The secondary sample picker includes the three reference patterns and one unmatched example. Selecting a sample replaces only the current report, never saved practice.

| Start line | Curve    | Height | Result                                             |
| ---------- | -------- | ------ | -------------------------------------------------- |
| Right      | Straight | Normal | Start-line check (`r01`)                           |
| Straight   | Right    | Normal | Curve check (`r02`)                                |
| Straight   | Straight | Low    | Height check (`r03`)                               |
| Left       | Left     | High   | No matching drill, an example of an uncovered shot |

## Database ERD

The PostgreSQL model links each completion to its account and the rule that selected its drill.

```mermaid
erDiagram
    USERS ||--|| PASSWORDS : authenticates
    USERS ||--o{ PRACTICE_COMPLETIONS : owns
    DRILLS ||--o{ SHOT_RULES : serves
    SHOT_RULES ||--o{ PRACTICE_COMPLETIONS : identifies
    USERS {
        uuid id PK
        varchar username
        varchar email
        varchar full_name
    }
    PASSWORDS {
        uuid user_id FK
        varchar hash
    }
    DRILLS {
        varchar id PK
        text title
        text instruction
    }
    SHOT_RULES {
        varchar id PK
        varchar start
        varchar curve
        varchar height
        text feedback
        varchar drill_id FK
    }
    PRACTICE_COMPLETIONS {
        uuid user_id FK
        uuid id
        varchar rule_id FK
        timestamptz completed_at
    }
```

- `UNIQUE (start, curve, height)` makes each supported shot match one rule.
- **Start drill** creates an attempt UUID. A save retry reuses it; a new practice gets a new UUID, even for the same drill.
- The completion primary key is `(user_id, id)`. Retrying the same rule returns the original record and timestamp; reusing an attempt for a different rule returns 409.
- The server derives `user_id` from the verified bearer token and supplies `completed_at`. History is filtered by that identity, never by a client-supplied user ID.

## REST API endpoints

The Hono API exposes the following routes. Practice requests require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an email/password account with `fullName` and `username`. |
| `POST` | `/auth/login` | Return an access token and account identity. |
| `GET` | `/auth/me` | Validate a bearer session and return its account. |
| `POST` | `/practice/match` | Match `{start, curve, height}` exactly; return `{status:"ok", match:null}` for an unsupported valid shot. Network/server failures are errors, not unmatched results. |
| `POST` | `/practice/completions` | Save `{id, ruleId}` once per account/attempt, returning the original record on retry. |
| `GET` | `/practice/completions` | Return only the signed-in account’s history, ordered by completion time and ID descending. |

Example shot request:

```json
{"start":"right","curve":"straight","height":"normal"}
```

The match contains `ruleId`, `shot`, `feedback`, and `drill: {id, title, instruction}`. Save only after **Mark complete**:

```json
{"id":"4f255564-c38e-4ee5-8c65-727cb0d94053","ruleId":"r01"}
```

An acknowledged save opens Progress. A failed save keeps the draft and attempt ID for manual retry; no offline synchronization queue or optimistic success is used. History distinguishes initial loading, failed loading, an empty result, and content. A failed refresh leaves previously loaded history visible.

The complete schema and error responses are available in the API’s `/openapi.json` and Scalar reference at `/`.

## Scope and limits

- The catalog contains the three reference drills, not coverage for every golf shot. Coach-approved mappings remain necessary before treating it as a coaching product.
- Profile shows the real account; logout removes this device’s credentials and account-specific UI state. Existing stateless JWTs are not revoked server-side and remain valid until expiration.
- Authentication is prototype-grade and has no rate limiting; review the [API authentication notes](apps/api/README.md#authentication) before public deployment.
- Notifications retain their existing empty state. Photo uploads, extra progress dashboards, offline synchronization, and automatic ball-flight detection are not part of this flow.
