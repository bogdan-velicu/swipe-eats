# Deep links, app links and deployment prerequisites

## 1. How join links work

Shared join links take two forms, both parsed by `parseJoinLink` and routed by `app/+native-intent.tsx` to `/join?code=<CODE>`:

- Custom scheme (always works once the app is installed): `swipeeats://join/<CODE>`
- Universal / App Link: `https://<LINK_HOST>/join/<CODE>`

`LINK_HOST` is currently the placeholder `swipeeats.example.com`. `app.config.ts` configures:

- iOS: `ios.associatedDomains = ['applinks:<LINK_HOST>']`
- Android: an intent filter (`VIEW`, `autoVerify: true`, `BROWSABLE` + `DEFAULT`) for `https://<LINK_HOST>/join` (pathPrefix)

## 2. Files to host at the real domain

Both files must be served over HTTPS, with no redirects, `Content-Type: application/json`, at the exact paths below.

### Apple App Site Association
`https://<LINK_HOST>/.well-known/apple-app-site-association` (no file extension):

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.app.swipeeats.dinner"],
        "components": [{ "/": "/join/*" }]
      }
    ]
  }
}
```

(For iOS < 13 compatibility you may add the legacy form: `"apps": []`, and `"appID": "<TEAM_ID>.app.swipeeats.dinner", "paths": ["/join/*"]` in `details`.)
`<TEAM_ID>` is the 10-character Apple Developer Team ID; the bundle id must equal `ios.bundleIdentifier`.

### Android Digital Asset Links
`https://<LINK_HOST>/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.swipeeats.dinner",
      "sha256_cert_fingerprints": ["<SHA256_SIGNING_CERT_FINGERPRINT>"]
    }
  }
]
```

The fingerprint is the SHA-256 of the key that signs the released build, colon-separated uppercase hex. With Play App Signing use the **App signing key** fingerprint from Play Console > Setup > App integrity (add the upload key's too if you sideload). With EAS-managed keys: `eas credentials`. List several fingerprints for multiple keys.

## 3. App not installed: store / landing fallback

Universal/App Links only open the app when it is installed and the domain is verified. Otherwise the browser loads `https://<LINK_HOST>/join/<CODE>` as a normal web page. The app does not control this; host a landing page at `/join/*` on the same domain that:

1. Shows the join code and "Get Swipe Eats" buttons linking to the App Store and Play Store listings.
2. Optionally tries `swipeeats://join/<CODE>` first (for installed-but-unverified cases), then falls back to the store link.
3. For Play, pass the code through the install referrer (`https://play.google.com/store/apps/details?id=app.swipeeats.dinner&referrer=<CODE>`) if deferred joining is wanted (not implemented in-app).

Set this up wherever the domain is hosted (static site, Firebase Hosting rewrite `/join/**` -> `join.html`, etc.).

## 4. Replace-the-placeholder checklist

- [ ] Change `LINK_HOST` at the top of `app.config.ts` to the real domain.
- [ ] Change the matching host constant in `src/features/join/useDeepLink.ts` (keep both in sync).
- [ ] Confirm `ios.bundleIdentifier` / `android.package` (`app.swipeeats.dinner`) match the hosted AASA `appIDs` and assetlinks `package_name`.
- [ ] Fill in the real Apple Team ID and the release SHA-256 signing fingerprint in the hosted files.
- [ ] Host both `.well-known` files and the `/join/*` landing page; verify with `curl -I` (200, JSON, no redirect).
- [ ] Rebuild the native app (associated domains / intent filters are baked at build time); on Android check `adb shell pm get-app-links app.swipeeats.dinner`.

## 5. Other deployment prerequisites

1. **Firebase config**: set real values via `EXPO_PUBLIC_FIREBASE_*` env vars (API key, auth domain, project id, storage bucket, messaging sender id, app id). Without them the app falls back to a demo config that is only suitable for tests.
2. **Places API key**: store it as the Cloud Function secret: `firebase functions:secrets:set PLACES_API_KEY`. Restrict the key to the Places API (API restriction) in Google Cloud Console; it must never ship in the client.
3. **Android Google Maps key**: set `android.config.googleMaps.apiKey` in `app.config.ts` (Maps SDK for Android enabled, restricted to the package + signing fingerprint). `react-native-maps` uses the default Google provider on Android and Apple Maps on iOS (no key needed there); a rebuild (prebuild/EAS) is required after changing the key.
4. **Firestore rules + indexes**: `firebase deploy --only firestore` (deploys `firestore.rules` and `firestore.indexes.json`).
5. **Installs**: use the committed `.npmrc` (`legacy-peer-deps=true`, because of a transitive react-dom peer mismatch with the Expo SDK's pinned React). Plain `npm install` / `npm ci` picks it up automatically; do not delete it.
