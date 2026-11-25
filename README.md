# Dial Golf Prototype

Dial Golf helps a golfer decide what to practice after a shot. The Expo app matches a reported ball flight to a practice drill and saves completed drills to the golfer’s account through the Hono/PostgreSQL API. Its Today, Progress, and Knowledge pages follow the mobile wireframe while retaining the app’s native header and cream/green/gold palette.

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

The hosted wireframe stores history in its browser. The Expo app requires an account, uses **Today** to report or repeat a drill, **Progress** for skill stats and saved practice, and **Knowledge** for five searchable beginner articles. Each account’s records are private.

1. Under **Report a shot**, select **Right** for start line, **Straight** for curve, and **Normal** for height. Tap **Find my drill**.
2. Open **Start-line check** by tapping **Start drill**. The first instruction asks you to pick a visible target and call the starting direction of your next shot.
3. Tap **Mark complete**. The confidence and practice partner check-ins are optional. Progress shows the saved drill and unlocks **First Swing** the first time; Today then offers **Repeat last drill**.

To try the other branch, enter **Left / Left / High**. Dial displays **No matching drill**. Tap **Edit shot** to return with all three selections intact.

Tap the next badge on Today to jump to Achievements. Drill completions alone do not change skill rank: Flight Reader, Self-Starter, and Steady Nerves use recorded observations. Knowledge search includes article text and keeps the query when you return from an article.

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

In a separate terminal, start the app yourself:

```sh
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm dev:mobile
```

For a physical phone, replace `localhost` with the API machine’s reachable LAN address; Android emulators can use `10.0.2.2`. Use HTTPS for a deployed API. `EXPO_PUBLIC_API_URL` is inlined into the app at build/export time, not read from the API’s root `.env`.

Use SDK 58 Expo Go or rebuild an existing development client after installing the new native dependencies (`expo-secure-store`, `expo-crypto`, and `react-native-svg`).

Create an account with an email address, username, and a password of 8–128 characters. Native sessions use SecureStore until the seven-day token expires. Web sessions are memory-only, so a page reload requires sign-in again; saved history remains on the server.

Run the mobile scoring and article search tests with `pnpm --filter @golf/mobile test`.

The isolated API integration suite requires a PostgreSQL 18 database where the test user can create/drop schemas:

```sh
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/test_db pnpm --filter @golf/api test
```

Tests migrate and seed a unique temporary schema, cover account isolation and concurrent idempotent retries, then remove that schema. Do not point verification at a production database. See [API setup and deployment](apps/api/README.md) for configuration and migration details.

## Architecture

| Layer | Browser wireframe | Expo app |
| --- | --- | --- |
| Presentation | HTML/CSS screens and flight diagrams. | Expo Router Today, Progress, and Knowledge tabs; native header; responsive SVG flight diagrams. |
| Application | Local exact matching and practice state. | Authenticated API matching, retained shot drafts, one attempt UUID per started practice, explicit retry. |
| Data | Three sample rules and browser-local completions. | Hono API, Drizzle/PostgreSQL catalog and per-user completions with optional check-ins; existing email/password authentication. |

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
    save -->|Yes| history["History"]
    history -->|Report a shot| report
```

## Features and UI design

| Screen or state      | What the golfer sees and can do                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Report a shot        | See the signed-in player card, next badge, and last drill, if any. Select all three shot observations to enable **Find my drill**. |
| Suggested drill      | See the flight summary and feedback. Rate confidence optionally, then choose **Start drill** or **Edit shot**. |
| Practice in progress | Read the next-ball instruction, then optionally rate confidence or record partner observations. A failed **Mark complete** save offers **Retry save**. |
| No matching drill    | Review the unmatched shot, edit the selections, or try a sample.                                                                    |
| Progress             | See Skill stats, Achievements, collapsible Practice activity, and Completed practice, newest first. Missing observations stay unscored or unrated. |
| Knowledge            | Search across five grouped beginner articles. Open an article and go back to the same filtered list. |

### Sample shot rules

Start line is the ball’s initial direction relative to the intended target. Curve is how it bends afterward. Height is relative to the golfer’s usual shot. The three choices for each input yield 27 combinations. Three have sample rules, and the other 24 open the unmatched state.

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
        jsonb check_in "optional"
    }
```

- `UNIQUE (start, curve, height)` makes each supported shot match one rule.
- **Start drill** creates an attempt UUID. A save retry reuses it; a new practice gets a new UUID, even for the same drill.
- The completion primary key is `(user_id, id)`. Retrying the same rule returns the original record, timestamp, and observations; reusing an attempt for a different rule returns 409.
- The server derives `user_id` from the verified bearer token and supplies `completed_at`. History is filtered by that identity, never by a client-supplied user ID.

## REST API endpoints

The Hono API exposes the following routes. Practice requests require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account with `{email, username, password}`. |
| `POST` | `/auth/login` | Return an access token and account identity. |
| `GET` | `/auth/me` | Validate a bearer session and return its account. |
| `POST` | `/practice/match` | Match `{start, curve, height}` exactly; return `{status:"ok", match:null}` for an unsupported valid shot. Network/server failures are errors, not unmatched results. |
| `POST` | `/practice/completions` | Save `{id, ruleId, checkIn?}` once per account/attempt, returning the original record on retry. |
| `GET` | `/practice/completions` | Return only the signed-in account’s history, ordered by completion time and ID descending. |

Example shot request:

```json
{"start":"right","curve":"straight","height":"normal"}
```

The match contains `ruleId`, `shot`, `feedback`, and `drill: {id, title, instruction}`. Save only after **Mark complete**:

```json
{"id":"4f255564-c38e-4ee5-8c65-727cb0d94053","ruleId":"r01"}
```

An acknowledged save from Today opens Progress. Temporary server failures keep the golfer signed in and preserve the draft and attempt ID for manual retry; no offline synchronization queue or optimistic success is used. History distinguishes initial loading, failed loading, an empty result, and content. A failed refresh leaves previously loaded history visible.

`checkIn` is omitted for legacy records and skipped check-ins. When present, it records the device’s UTC offset at save time, confidence ratings from 1 to 5, a partner’s unaided/needed-help observation, or five shot-reading verdicts. The first completed five-shot check per recorded local day counts toward Flight Reader. Self-Starter and Steady Nerves require qualifying observations on two distinct days.

The complete schema and error responses are available in the API’s `/openapi.json` and Scalar reference at `/`.

## Scope and limits

- The catalog contains the three reference drills, not coverage for every golf shot. Coach-approved mappings remain necessary before treating it as a coaching product.
- Profile shows the real account; logout removes this device’s credentials and account-specific UI state. Existing stateless JWTs are not revoked server-side and remain valid until expiration.
- Authentication is prototype-grade and has no rate limiting; review the [API authentication notes](apps/api/README.md#authentication) before public deployment.
- Notifications retain their existing empty state. Photo uploads, extra progress dashboards, offline synchronization, and automatic ball-flight detection are not part of this flow.
