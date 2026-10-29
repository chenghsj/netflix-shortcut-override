# UI components

For the 0.6.5 change set, start with [Review the UI update](review-ui-update.md).

`src/components/ui` contains Neobrutalism Radix registry components. Treat these files as upstream code and keep local changes in `src/components/app-ui`.

Application code imports from `@/components/app-ui/*`. This layer wraps or reexports the upstream components and owns the extension's control sizes, rounded corners, focus styles, button motion and hover target fix. Pass `className`, native props and refs through the wrappers; caller classes are merged last. `app-ui/app-ui.css` adjusts internal slots that upstream does not expose as props. Portal overlay styles are limited to pages marked with `data-app-ui`.

The palette, radius, and shadow tokens are application theme settings in `src/styles/themes`; `src/index.css` owns shared fonts and utility mappings. Upstream components use the application's theme rather than the website's default theme.

## Interface styles

`theme` selects automatic, light, or dark brightness. `uiStyle` independently selects a registered interface style. `useTheme` applies brightness; `useUiStyle` applies `data-ui-style` to the document root. Options and popup share the same persisted settings and component tree.

The Classic palette and component styling use `master` at `44aa919` as their reference. All three styles retain the current layout, accessibility fixes, and shortcut behavior. Classic uses flat surfaces and the original rendered 32 × 18.4 px switches in Options and popup. Neobrutalism keeps hard shadows and larger switches. Markdown uses a monospace font, square controls, and text-style switch indicators.

Theme tokens live in `src/styles/themes/*.css`. `src/index.css` maps them to Tailwind utilities, and application adapters use the same tokens for borders, radii, font weights, shadows, switch geometry, menu highlights, and press offsets. Stylesheets are loaded automatically by `src/styles/ui-themes.ts`; content scripts do not import that UI module.

To add a style:

1. Add an entry to `UI_STYLE_DEFINITIONS` in `src/shared/ui-styles.ts`, including its ID and names in all five languages. The `UiStyle` type, setting validator, and both selectors derive from this registry.
2. Add `src/styles/themes/<id>.css`, scoped to `:root[data-ui-style='<id>']` and its `.dark` variant. Copy an existing theme's complete token contract, then change its values.
3. Run the theme contract tests and check light/dark Options, popup, menus, dialogs, switches, and keyboard focus. The contract tests reject duplicate IDs, missing or unregistered stylesheets, and incomplete light/dark tokens.

Settings version 13 includes `uiStyle`. Older stored settings and version 8–12 backups normalize to `classic`. Fresh installs default to `neobrutalism`. A separate synchronized selection preserves appearance when an older client replaces the settings object; a separate bootstrap default records the install/update choice without overwriting explicit selections. Local bootstrap provenance allows failed sync initialization to retry on worker restart. Current backups require a registered style and preserve it when restored.

## Popup navigation

The popup uses the official Neobrutalism Radix Tabs in `components/ui/tabs` through `app-ui/tabs`, with the same theme tokens as other controls. The upstream file matches the registry source; the adapter owns application geometry, active-state colors, and saving focused inputs before a panel unmounts. It opens on Shortcuts; Settings contains general and playback settings. The global enable switch stays outside both panels. The subtitle navigation header has its own switch; Options and popup share `useSubtitleActivation` for permission requests and cancellation when the extension is disabled or the view closes. `PopupShortcutsPanel` and `PopupSettingsPanel` render controlled tab content. Form state and subtitle activation remain in `PopupApp` so changing panels does not discard numeric drafts or restart permission attempts. General settings uses the official Collapsible and starts closed. Its open state stays in `PopupApp` across tab changes and resets when the popup closes. Tab selection and disclosure state are temporary UI state and are not included in settings backups.

## Add or update a component

1. Fetch the Radix registry JSON from `https://neobrutalism.com/r/radix/<name>.json`.
2. Copy its component content into `src/components/ui`. Review the Git diff against the fetched source and preserve official internal import paths.
3. Add or adjust the corresponding `app-ui` adapter. Keep application changes out of upstream files.
4. Run `npm run lint`, `npm test`, and `npm run build`. Check options, popup, dialogs, comboboxes, and hover edges in the browser. Check reduced-motion behavior when changing animation.

The `components.json` UI alias intentionally points to the upstream directory. Registry installation must not target the application adapters.

`npm run lint` uses ESLint's `no-restricted-imports` rule to reject static imports and reexports from `src/components/ui` outside the `ui` and `app-ui` directories. The rule covers the `@/components/ui` alias and relative paths to `ui`. Application code must use `app-ui` instead. CI runs lint before tests and builds.

This rule does not check dynamic imports, file hashes, or whether upstream files match the registry byte for byte. Review changes to `src/components/ui` in Git and confirm that they come from an upstream update. Local customization belongs in `app-ui`.
