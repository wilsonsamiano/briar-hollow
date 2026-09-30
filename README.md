# Briar Hollow

A quiet fen farm. Till, fish, trade, and wake the old mill.

This is an original game. Not affiliated with any other farming game.

## Play in the browser

```bash
npm install
npm run dev
```

Open the local site, choose a name (Rowan is the default), and press **Start**.

- Move with WASD, the arrows, or the pad
- Tools: hoe, watering can, axe, pick, scythe, rod
- Select seeds from the pack, then Use them on tilled soil
- Sleep in the cottage to ship goods and grow watered crops
- South is town, east is the woods, west of town is the mine

The save stays on this device. The pause menu can export it.

## Android beta (sideload)

The beta is not on the Play Store. Install the APK from the [v0.1.0-beta release](https://github.com/wilsonsamiano/briar-hollow/releases/tag/v0.1.0-beta).

1. On the phone, download `briar-hollow-0.1.0-beta.apk`.
2. Open the file.
3. If Android blocks it, allow installs from that browser or Files app.
4. Open **Briar Hollow**.

The package id is `dev.wilsonsamiano.briarhollow`. Updates must be signed with the same beta key (`android/briar-hollow-beta.keystore`, alias `briar`, password `briarhollow-beta`). That key is only for this sideload beta.

To rebuild the APK:

```bash
npm run build
npm run preview:restart
node scripts/pack-android-assets.mjs
cd android && gradle assembleRelease
```

`ANDROID_HOME` must point at an SDK with platform 35 and build-tools 35.0.0.

## Support

[Buy me a coffee](https://buymeacoffee.com/wilsonsamiano) if the hollow keeps you company.
