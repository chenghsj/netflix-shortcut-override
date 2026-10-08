# Troubleshooting

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

## Troubleshooting

### Options page shows "CRXJS DEV MODE"

This means Chrome is using a CRXJS dev build and the Vite dev server is not reachable.

Start the dev server and keep it running:

```sh
npm run dev
```

Then reload the extension in:

```text
chrome://extensions
```

If you want a non-dev-server build, stop any running Vite dev server for this project and run:

```sh
npm run build
```

Then reload the unpacked extension again.

### Changes do not appear in Chrome

During `npm run dev`, CRXJS HMR should update UI code while the dev server is running. Some extension changes still require a manual reload.

1. Confirm Chrome loaded the `dist/chromium` folder for a production build, or `dist` while using `npm run dev`.
2. Confirm `npm run dev` is still running.
3. Click reload for the extension in `chrome://extensions` if the change touches the manifest, service worker, or content script registration.
4. Refresh any open Netflix watch tabs.

### Icon changes do not appear

Regenerate icons and rebuild:

```sh
npm run icons
npm run build
```

Then reload the extension. Chrome may cache toolbar icons, so opening a new Chrome window can help confirm the current icon.

### Rewind or forward does not work

The extension uses Netflix's player API for seeking. If Netflix changes its internal player API, seeking may fail until the bridge is updated.

Check the browser console for shortcut bridge errors and run:

```sh
npm test
```

### Shortcut does not trigger

Check the options page:

1. Make sure shortcut override is enabled.
2. Make sure the specific action is enabled.
3. Check whether another action already uses the same key.
4. Open the toolbar popup in the Netflix playback context.
5. If the popup shows that the extension is not active, select Reload Netflix. The popup closes after starting the reload so keyboard focus returns to Netflix.
6. If the compatibility button is available, open it and confirm the required playback features are ready.

If Netflix is still loading, compatibility remains in the checking state. After ten seconds the popup explains that it will recheck automatically; wait for loading to finish instead of reloading again.

## Bug Reports

GitHub's bug-report form asks for:

- Browser name and version.
- Extension version.
- The Netflix page type where the issue happened.
- The shortcut or action that failed.
- Compatibility diagnostics copied from the toolbar popup when available, or a note that the popup reported the extension was not active.
- Any console errors from the Netflix tab or extension service worker.

## Subtitle website access

If subtitle navigation reports missing website access, turn its master switch off and on in Options to request access again. If approval is denied, the feature stays off. In Firefox, you can also open `about:addons` → this extension → **Permissions and Data**, grant Netflix and subtitle website access, and retry. Turning subtitle navigation off does not revoke previously granted website access.
