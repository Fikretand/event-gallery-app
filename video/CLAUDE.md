# CLAUDE.md — Confetti video

Marketing reels for Confetti, made with [Kinetograph](https://github.com/0xS4N4TG/kinetograph)
(Remotion-shaped TSX rendered by a Rust GPU compositor, no browser). This folder is
**separate from the web app**: the app's `tsconfig.json` and ESLint ignore it, and
nothing here is deployed.

Talk to the owner in Bosnian.

## Where things are

- `src/reel.tsx` — v2 of the reel: 21 s, 1080×1920, 30 fps, six scenes plus a
  synthesised soundtrack (pad, ticks, whooshes, chimes). The clock is `T` at the top.
- `public/fonts/` — Playfair Display (bold, italic) and Inter, each merged from the
  app's split latin + latin-ext files, so š đ č ć ž render.
- `public/photos/` — 22 stand-in WebPs (~640 px) from `public/explainer/assets`.
  Soft at full size; replace them with the owner's own photos.
- `public/qr.png` — a real QR code for `https://www.confetti.ba`.
- `public/footage/`, `public/voice/` — the owner's clips and voiceover. **Git-ignored on
  purpose**: they show real people. Never commit them.

## Running it

Node 22+. Windows with a GPU renders natively (the `native-win32-x64-msvc` addon), in
seconds. `npx kinetograph doctor` says whether the renderer started.

```
npm install
npx kinetograph doctor
npx kinetograph strip src/reel.tsx -n 16 -o out/strip.png   # look first, always
npx kinetograph still src/reel.tsx 180 -o out/f180.png
npx kinetograph render src/reel.tsx -o out/confetti-reel.mp4
npx kinetograph studio src/reel.tsx                          # editor in the browser
```

The bundled agent skill is at `node_modules/kinetograph/skills/kinetograph/SKILL.md`; read
it before changing the reel.

Things learned the hard way while building v2:

- Do **not** wrap a scene in `<AbsoluteFill>`: it is a flex column in compat mode, so
  native children stack downwards and leave the frame. Scenes are `<Layer>`s.
- **One `<Camera>` per tree.** Overlapping `<Sequence>`s each bringing a camera fail the
  render; the camera lives once at the root.
- `motionBlur` is refused on children of a `preserve3d` group.
- Animated `grain` makes the raw MP4 huge (250 MB for 21 s). For social media, encode it
  again with two passes at about 9 Mbit/s and normalise the sound to −14 LUFS:
  ```
  ffmpeg -y -i out/confetti-reel.mp4 -c:v libx264 -preset slow -b:v 9M -maxrate 12M -bufsize 18M -pass 1 -an -f mp4 NUL
  ffmpeg -y -i out/confetti-reel.mp4 -c:v libx264 -preset slow -b:v 9M -maxrate 12M -bufsize 18M -pass 2 -pix_fmt yuv420p -movflags +faststart -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k out/confetti-reel-social.mp4
  ```
  (`NUL` on Windows, `/dev/null` elsewhere.)
- Copy is the site's own wording (spaced en dash " – ", never "—"). "U galeriji: 232→244"
  in scene 4 is a demo number, like the hero phone on the landing page; never present an
  invented figure as a real one.

## Next: v3 with real footage and the owner's voice

The owner keeps clips and photos in
`C:\Users\andel\OneDrive\Desktop\PROJEKAT CONFETTI VIDEO`. Copy what is used into
`public/footage/` (clips) and `public/photos/` (stills). Play clips with
`<OffthreadVideo src={staticFile('footage/…')} />` inside a `<Layer>`, `objectFit: cover`.
Check each clip with `ffprobe` first (rotation, fps, length); trim to 3–6 s.

Plan, about 28 s. Real footage carries the feeling, the animated scenes from v2 explain
how Confetti works:

| # | Picture | Voiceover (Bosnian, the owner records it) |
|---|---|---|
| 1 | Clip: first dance or confetti throw | „Fotografov album je savršen.“ |
| 2 | Clip: guests raising phones, filming | „Ali noć je živjela na još devedeset tri telefona.“ |
| 3 | v2 scene: the floor of 93 phones | „I te slike obično nikad ne stignu do vas.“ |
| 4 | Clip: a hand scanning the QR table card | „Zato na stolu stoji jedan QR kod.“ |
| 5 | v2 scene: phone scans, „Bez aplikacije“ / „Bez naloga“ | „Gosti ga skeniraju i pošalju slike. Bez aplikacije, bez naloga.“ |
| 6 | v2 scene: photos fly into the gallery | „Sve stiže na jedno mjesto, u vašu privatnu galeriju.“ |
| 7 | v2 scene: „Odobreno“ / „Sakriveno“ | „A vi birate šta ostaje.“ |
| 8 | Clip: the couple next day, scrolling the gallery | „Sutradan je cijela noć tu. Iz svakog ugla.“ |
| 9 | End card | „Confetti. Besplatno za početak.“ |

Timing to the voice: the owner records each line separately with a second of silence
between. Find the line boundaries with `ffmpeg -i public/voice/vo.m4a -af
silencedetect=noise=-35dB:d=0.4 -f null -` (or `npx kinetograph audio analyze`), set
`T` from them so every scene starts on its line, play the voice with `<Audio>`, and duck
the pad under speech (master gain about 0.02 while a line plays). Burn word-by-word
captions for the voice (most reels are watched muted), in the `Rise` style, inside the
safe area (not in the top 250 px or the bottom 350 px, where the platforms draw their UI).

Consent: the couple, and any guest who is clearly recognisable, must have agreed to appear
in an ad. Ask the owner before using a clip.
