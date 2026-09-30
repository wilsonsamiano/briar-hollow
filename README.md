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

## Beta installs

These are not on the Play Store or a computer app store. Download them from the [v0.1.2-beta release](https://github.com/wilsonsamiano/briar-hollow/releases/tag/v0.1.2-beta).

| Computer | File | First launch |
|---|---|---|
| Windows | `briar-hollow-0.1.2-beta-win-x64.zip` | Unzip and open `briar-hollow.exe`. If Windows says it protected your PC, choose More info, then Run anyway. |
| Mac (M1 or newer) | `briar-hollow-0.1.2-beta-mac-arm64.zip` | Unzip, then right-click **Briar Hollow** and choose Open. Confirm Open when asked. This beta is not notarized. |
| Mac (Intel) | `briar-hollow-0.1.2-beta-mac-x64.zip` | Same as above. |
| Linux | `briar-hollow-0.1.2-beta-linux-x64.AppImage` | Allow the file to run, then open it. If that fails, unpack `briar-hollow-0.1.2-beta-linux-x64.tar.gz` and run `briar-hollow`. |
| Android | `briar-hollow-0.1.2-beta.apk` | Open the file. If Android blocks it, allow installs from that browser or Files app. |

The title screen and the pause menu link to the same files. A Bluetooth or USB controller uses the usual layout: left stick to walk, A to use, X to talk, B to go back, Start to pause.

The Android package id is `dev.wilsonsamiano.briarhollow`. Updates must be signed with the same beta key (`android/briar-hollow-beta.keystore`, alias `briar`, password `briarhollow-beta`). That key is only for this sideload beta. The computer builds are unsigned too.

To rebuild the APK and the computer apps:

```bash
npm run build
npm run preview:restart
node scripts/pack-android-assets.mjs
node scripts/pack-desktop-www.mjs
cd android && gradle assembleRelease
cd ../desktop && npm install && CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
```

`ANDROID_HOME` must point at an SDK with platform 35 and build-tools 35.0.0. The computer build is run from `desktop/` so it stays out of the web app.

## Support

[Buy me a coffee](https://buymeacoffee.com/wilsonsamiano) if the hollow keeps you company.
