# Social Mux Video — env already present

Social **video** — Stories, posts, and everywhere Social — uploads to Mux and
plays through Mux Player (Auto / adaptive). Stills stay on the object
store. Legacy native mp4 fails closed until a Mux playback id exists.
Education and title film stay on their existing lanes. Lock:
[`docs/design-locks/social-video-mux-only-lock-v1.md`](../design-locks/social-video-mux-only-lock-v1.md).

## Env (already on Vercel 24frame)

Server-only. Already set for Production / Preview / Development. Do not
create a new Mux environment. Do not prefix `NEXT_PUBLIC_`. Do not
commit values.

```
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_SIGNING_KEY=
MUX_PRIVATE_KEY=
```

Names are listed in `.env.example` as empty placeholders. Agents do not
set values. `MUX_TOKEN_*` is the API credential. `MUX_SIGNING_KEY` is the
signing key id and `MUX_PRIVATE_KEY` is the base64 PEM. Those two are the
names the official Mux JWT helper reads. They stay in
`src/lib/social-mux-server.ts` — never the client bundle.

## Encode locks

| Path | `video_quality` | `max_resolution_tier` |
| --- | --- | --- |
| Video post | `basic` | `2160p` |
| Go live (~10 min recorder → normal video post) | `plus` | `1080p` |

Video posts default to original up to 2160p. Client `source_width` /
`source_height` do not select the tier. No quality checkbox. Playback
stays Mux-only.
[`docs/design-locks/social-video-upload-cover-lift-lock-v1.md`](../design-locks/social-video-upload-cover-lift-lock-v1.md) ·
[`docs/design-locks/social-video-mux-only-lock-v1.md`](../design-locks/social-video-mux-only-lock-v1.md).

No livestream backend. No Settings quality maze. New uploads use
playback policy `signed`. Playback IDs are stored on `posts.media` and
`stories.media` next to the author-bound key. Welcome video has no
playback-id column, so that band stays an empty face.

## Playback tokens

`mintSocialMuxPlaybackTokens` calls `mux.jwt.signPlaybackId` for video,
thumbnail, and storyboard (`12h`). The Social player fetches
`/api/social/mux-playback` (Node, session required) and passes
`tokens` to Mux Player. Edge pages keep the playback id and do not
import the signer.

## Auth / cron

No RLS, webhook, or Vercel cron change. Finalize polls Mux in the
signed-in request after the client PUT and rejects the upload unless
`new_asset_settings.passthrough` starts with `${session user id}:`.
