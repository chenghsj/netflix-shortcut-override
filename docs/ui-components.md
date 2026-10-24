# UI components

`src/components/ui` contains Neobrutalism Radix registry components. Treat these files as upstream code and keep local changes in `src/components/app-ui`.

Application code imports from `@/components/app-ui/*`. This layer wraps or reexports the upstream components and owns the extension's compact sizes, rounded corners, focus styles, button motion and hover target fix. Pass `className`, native props and refs through the wrappers; caller classes are merged last. `app-ui/app-ui.css` adjusts internal slots that upstream does not expose as props. Portal overlay styles are limited to pages marked with `data-app-ui`.

The palette, fonts, radius, and shadow tokens remain application theme settings in `src/index.css`. Upstream components use the application's theme rather than the website's default theme.

## Add or update a component

1. Fetch the Radix registry JSON from `https://neobrutalism.com/r/radix/<name>.json`.
2. Copy its component content into `src/components/ui`. Review the Git diff against the fetched source and preserve official internal import paths.
3. Add or adjust the corresponding `app-ui` adapter. Keep application changes out of upstream files.
4. Run `npm run lint`, `npm test`, and `npm run build`. Check options, popup, dialogs, comboboxes, and hover edges in the browser. Check reduced-motion behavior when changing animation.

The `components.json` UI alias intentionally points to the upstream directory. Registry installation must not target the application adapters.

`npm run lint` uses ESLint's `no-restricted-imports` rule to reject static imports and reexports from `src/components/ui` outside the `ui` and `app-ui` directories. The rule covers the `@/components/ui` alias and relative paths to `ui`. Application code must use `app-ui` instead. CI runs lint before tests and builds.

This rule does not check dynamic imports, file hashes, or whether upstream files match the registry byte for byte. Review changes to `src/components/ui` in Git and confirm that they come from an upstream update. Local customization belongs in `app-ui`.
