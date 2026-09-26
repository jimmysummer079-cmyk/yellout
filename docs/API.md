# YellOut REST API

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <session_token>` (except session create & health)

All timestamps are ISO-8601 UTC strings. Audio is multipart binary.

**Accepted audio MIME types** (stored as-is; extension inferred):  
`audio/webm`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/aac`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/3gpp`.  
Mobile (iOS/Android Expo) typically uploads AAC in an `m4a`/`mp4` container; web browsers typically upload `webm`. Playback clients should respect the response `Content-Type`.

## Health

### `GET /health`

No auth.

```json
{ "status": "ok", "version": "1.0.0", "uptimeSec": 12, "moderation": "stub" }
```

`moderation` is `"gemini"` when `GEMINI_API_KEY` is set, otherwise `"stub"`.

---

## Session (anonymous identity)

### `POST /session`

Creates an anonymous device session. No signup.

**Response `201`**

```json
{
  "id": "uuid",
  "token": "base64url",
  "codename": "松柏 482",
  "createdAt": "2026-03-26T08:00:00.000Z"
}
```

Store `token` on device; send as Bearer on subsequent calls.

### `GET /session/me`

**Response `200`** — `{ "id", "codename" }`

### `POST /session/codename`

Rotates the anonymous codename (also done client-side after each vent).

**Response `200`** — `{ "codename": "远山 201" }`

---

## Vents (Resonance Square)

### `GET /vents`

Query: `tag?`, `cursor?`, `limit?` (1–50, default 30)

**Response `200`**

```json
{
  "items": [VentPost],
  "nextCursor": "1711440000000"
}
```

### `GET /vents/:id`

**Response `200`** — `VentPost`

### `GET /vents/:id/audio`

Streams the audio file (`Content-Type` from upload). Requires auth.

### `POST /vents`

`multipart/form-data`:

| Field | Type | Notes |
|-------|------|-------|
| `audio` | file | required, max 5MB |
| `targetTag` | string | max 4 chars |
| `duration` | number | 1–60 |
| `voiceEffect` | string | `deep` \| `robotic` \| `ethereal` |
| `waveformData` | JSON string | number[] 0–1 |

**Response `201`**

```json
{
  "vent": VentPost,
  "crisisFlag": false
}
```

If `crisisFlag` is true, clients should show the crisis hotline modal.

> **Burn to Void** is client-only: never call this endpoint for incinerated recordings.

### `POST /vents/:id/reactions`

```json
{ "type": "hugs" | "understands" | "resonates" | "shoulder_tap" }
```

Toggles the reaction for the current session.

**Response `200`**

```json
{
  "ventId": "…",
  "reactions": { "hugs": 1, "understands": 0, "resonates": 0, "shoulderTaps": 0 },
  "userReactions": { "hugs": true, "understands": false, "resonates": false, "shoulderTap": false }
}
```

### `POST /vents/:id/replies`

`multipart/form-data`: `audio`, `duration` (1–10), `voiceEffect`

**Response `201`** — `VoiceReply`

### `POST /vents/:id/report`

```json
{ "reason": "abuse" | "spam" | "crisis_concern" | "other", "detail": "optional" }
```

**Response `201`** — `{ "id", "status": "received" }`

---

## Replies

### `GET /replies/:id/audio`

Streams reply audio. Requires auth.

---

## Shared schemas

### VentPost

```ts
{
  id: string
  codename: string
  targetTag: string
  duration: number
  voiceEffect: 'deep' | 'robotic' | 'ethereal'
  waveformData: number[]
  createdAt: string
  expiresAt: string
  audioUrl: string
  reactions: { hugs: number; understands: number; resonates: number; shoulderTaps: number }
  userReactions: { hugs: boolean; understands: boolean; resonates: boolean; shoulderTap: boolean }
  voiceReplies: VoiceReply[]
  crisisFlag?: boolean
}
```

### VoiceReply

```ts
{
  id: string
  ventId: string
  codename: string
  duration: number
  voiceEffect: 'deep' | 'robotic' | 'ethereal'
  createdAt: string
  audioUrl: string
}
```

---

## Errors

```json
{ "error": "human message", "code": "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "RATE_LIMITED" | … }
```

## Rate limits

- Global: 120 req / 15 min / IP (configurable)
- Create vent: 20 / hour / session
- Create reply: 40 / hour / session

## Lifecycle

Default vent TTL: **48 hours** (`VENT_TTL_MS`). A background job deletes expired rows and audio files.
