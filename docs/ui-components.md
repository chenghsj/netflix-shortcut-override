# UI components

For the 0.6.5 change set, start with [Review the UI update](review-ui-update.md).

`src/components/ui` contains Neobrutalism Radix registry components. Treat these files as upstream code and keep local changes in `src/components/app-ui`.

Application code imports from `@/components/app-ui/*`. This layer wraps or reexports the upstream components and owns the extension's control sizes, rounded corners, focus styles, button motion and hover target fix. Pass `className`, native props and refs through the wrappers; caller classes are merged last. `app-ui/app-ui.css` adjusts internal slots that upstream does not expose as props. Portal overlay styles are limited to pages marked with `data-app-ui`.

The palette, radius, and shadow tokens are application theme settings in `src/styles/themes`; `src/index.css` owns shared fonts and utility mappings. Upstream components use the application's theme rather than the website's default theme.

`ChoiceCombobox` handles single choices. `MultiChoiceCombobox` uses a searchable popover with native checkboxes for subtitle languages. Selections stay pending until the user clicks Add; closing the picker preserves them. Arrow keys move between enabled checkboxes, Space toggles a checkbox, and Escape closes the picker. Saved languages stay checked and disabled, and pending choices cannot exceed the remaining favorite slots.

Options shortcut subtables start expanded and sit flush inside their parent table or group. Their collapsible headings and rows share the outer frame, without a separate card border, radius, background, or margin. Favorite subtitles and Favorite audio tracks follow the same layout and also start expanded.

`DeleteButton` confirms removal of custom seek, preferred-speed and subtitle-size shortcuts, and size entries inside the subtitle-size editor. It uses a non-modal popover matching `ResetButton`, with initial focus on Cancel and a destructive Delete action. Cancel, Escape and outside interaction dismiss it without removing anything. Confirmation copy follows the interface language.

Favorite subtitles and Favorite audio tracks share `LanguageFavoritesCard` for multi-language selection, reordering and removal. The audio picker lists standard and Audio Description variants together as separate choices; description rows include an Audio Description label, while standard rows show only the language. The two favorites lists and subtitle-size rows share `useDragPreview` and `useDragReorder`. Drag previews inherit the surrounding background without a custom opacity. While dragging, neighboring rows slide into their preview positions for 200 ms and leave a gap for the dragged row. Hit testing uses the original row slots so moving rows cannot cause repeated swaps. Drop commits the order; cancellation restores it. Keyboard reordering uses `useReorderAnimation`. Both animation paths respect reduced motion.

## Modal sizes

Use `DialogContent` from `@/components/app-ui/dialog`. Set `size` according to the user's task.

| Size | Maximum width | Use | Current dialogs |
| --- | ---: | --- | --- |
| `compact` | 22rem (352px) | Confirm an action, show a short status, or edit a single field or shortcut list | Restore all defaults, compatibility diagnostics, hold speed, shortcut recorder |
| `standard` (default) | 28rem (448px) | Edit a value with its shortcuts | Preferred speed, percentage jumps, forward/rewind |
| `wide` | 32rem (512px) | Edit a reorderable list or inspect a detailed preview | Subtitle size, settings import preview |

Each size leaves at least 1rem at each viewport edge. Height follows content up to the available viewport height with the same margin. Long dialogs scroll as needed. The subtitle-size editor and settings import preview scroll their bodies so their actions stay visible. The sidebar sheet uses the sidebar's navigation layout, and row-level confirmations use their popover layout.

A dialog with one shortcut recording group uses the recording prompt and an accessible name. Shortcut recording fields have a shared minimum height of 4.5rem (72px). Forward/rewind displays a label for each direction.

`ShortcutKeysEditor` composes `ShortcutRecordingArea` into a list of up to three keys per action. It owns Add shortcut, individual removal, recording focus and per-field duplicate, occupied-key and invalid-key feedback. Primary and additional fields accept delivered CapsLock events consistently across general, seek and subtitle-size editors; only Tab, Escape and standalone Ctrl/Alt/Shift/Meta are excluded by the recorder. Its internal rows use an 8px gap; the editor and following alerts use a 12px gap. The editor hooks own drafts, conflict analysis, save/cancel and restore scope. `KeyBindingKbd` displays the primary and additional keys in Options, popup reference and import previews.

## Interface styles

`theme` selects automatic, light, or dark brightness. `uiStyle` independently selects a registered interface style. `useTheme` applies brightness; `useUiStyle` applies `data-ui-style` to the document root. Options and popup share the same persisted settings and component tree.

Both appearance hooks wait for the settings form's `loaded` flag and apply their values in layout effects before the loaded interface is painted. Until then, the page uses system canvas colors; theme stylesheets require an explicit `data-ui-style`, so loading never falls back to Neobrutalism.

The Classic palette and component styling use `master` at `44aa919` as their reference. All three styles retain the current layout, accessibility fixes, and shortcut behavior. Classic uses flat surfaces and the original rendered 32 × 18.4 px switches in Options and popup. Neobrutalism keeps hard shadows and larger switches. Markdown uses a monospace font, square controls, and text-style switch indicators. New style choices offer Classic and Neobrutalism; an existing/imported Markdown selection remains visible and accurately labeled until the user changes away. Storage and backups continue accepting Markdown.

Theme tokens live in `src/styles/themes/*.css`. `src/index.css` maps them to Tailwind utilities, and application adapters use the same tokens for borders, radii, font weights, shadows, switch geometry, menu highlights, and press offsets. Stylesheets are loaded automatically by `src/styles/ui-themes.ts`; content scripts do not import that UI module.

To add a style:

1. Add an entry to `UI_STYLE_DEFINITIONS` in `src/shared/ui-styles.ts`, including its ID and names in all supported languages. The `UiStyle` type, setting validator, and both selectors derive from this registry.
2. Add `src/styles/themes/<id>.css`, scoped to `:root[data-ui-style='<id>']` and its `.dark` variant. Copy an existing theme's complete token contract, then change its values.
3. Run the theme contract tests and check light/dark Options, popup, menus, dialogs, switches, and keyboard focus. The contract tests reject duplicate IDs, missing or unregistered stylesheets, and incomplete light/dark tokens.

Settings version 13 includes `uiStyle`. Older stored settings and version 8–12 backups normalize to `classic`. Fresh installs default to `neobrutalism`. A separate synchronized selection preserves appearance when an older client replaces the settings object; a separate bootstrap default records the install/update choice without overwriting explicit selections. Local bootstrap provenance allows failed sync initialization to retry on worker restart. Current backups require a registered style and preserve it when restored.

## Popup navigation

The popup opens directly on shortcut reference without tabs or preference controls. Its search input uses native `autoFocus` when mounted after settings load; subsequent rerenders keep focus on the user's selected control. Options has no initial search autofocus, and explicit page/section navigation retains its existing focus target. Both surfaces keep `⌘K` / `Ctrl+K` for search. Its shell has an intrinsic size of 416 × 560 px, with a fixed header and footer and independently scrolling content. Do not cap its height with viewport units: the browser initially measures a small popup viewport, which would constrain the shell and collapse the content instead of allowing the popup to grow. The single-row header combines the global enable switch and icon-only compatibility diagnostics. Secondary messages appear only while checking, on compatibility problems, or on detected non-playback pages. Playback automation, subtitle navigation activation, hold speed, preferred speed, language, appearance, speed limits, step, and hint controls are edited in Options. The global switch is the popup's only preference mutation and uses the shared settings form; Options owns subtitle permission requests through `useSubtitleActivation`, which also observes global-disable changes from the popup to cancel pending attempts. Shortcut category and search remain in `PopupApp` for the current popup visit. Eligible feature announcements appear above the reference and link to their Options category. The full-settings icon stays at the top right. The fixed footer keeps GitHub, the other-products Store selector, and rating visible in the original two-row layout. Temporary navigation and search are not included in settings backups.

Options and popup share the built-in action lists in `src/shared/shortcut-groups.ts`. Options uses `OptionsLayout` with the official shadcn Sidebar component. Its shortcut group contains five pages; Subtitles includes Subtitle language and size and Sentence jumps and replay sections; its settings group contains General settings, Playback preferences, and Backup and restore. Desktop uses a collapsible sidebar with the global enable switch in a single row at the top, with its label and help on the left and the switch aligned to the right; narrow windows use a Sheet navigation drawer and keep the global switch in a full-width block below the header actions, sharing the search field’s height, border, background, and corner radius. Global action/key search includes subtitle-navigation bindings. Sidebar colors, selection, borders, and Markdown bracket markers follow the active UI theme. Both surfaces use the same five category names and order. The popup shows one category at a time; search matches actions and physical keys across all categories, including custom seeking, subtitle-size, and subtitle-navigation bindings. Shared navigation labels and Options URL fragments live in `src/shared/options-navigation.ts`; the Open settings button uses visible text and an external-link icon to open the corresponding Options page, with a tooltip explaining that editing happens on the settings page. The same button appears in search result category headings. Options displays shortcut keys as static labels and provides a pencil edit button in each shortcut row’s Actions column. Shortcut recording fields have a localized clear control, allow saving an empty key, and display unassigned rows as Not set. Favorite subtitles starts expanded with a count. Subtitle-size shortcuts remain regular entries under the Subtitle language and size section without an extra subgroup or Add control. The popup lists configured shortcuts, including disabled seek directions and subtitle-navigation keys while their master is off. Disabled rows show their state. Legacy overlaps are reported on subtitle-navigation rows as Shortcut priority. Popup category and search reset on reopening. Options starts its subtables expanded and preserves seek and hold disclosure state while changing categories. Neither interface saves navigation or disclosure state in extension settings.

Popup nested groups (Hold speed under Play / Pause, Forward / Rewind, Jump to position, Preferred speed, Favorite subtitles, and Favorite audio tracks) start expanded and can be collapsed individually from their parent row or heading. Disclosure state survives category changes during the current popup visit and resets when reopening. Search temporarily expands matching groups and disables their disclosure buttons; clearing search restores the prior state. Disclosure does not change extension settings.

### Popup reference typography

| Role | Weight | Examples |
| --- | --- | --- |
| Primary shortcut names and section titles | 400 | Play / Pause, Fullscreen, Picture-in-Picture, Forward / Rewind, Favorite subtitles |
| Nested labels and values | 400 | Hold speed, speed multipliers, seek intervals, favorite languages |
| Keycaps, status badges, and controls | Existing theme tokens | `--ui-key-weight`, `--ui-strong-weight`, `--ui-control-weight` |

Reference text uses regular weight in every UI style; indentation, spacing, and grouping establish the hierarchy. Primary shortcut names keep the same weight whether or not they have visible children. Hiding Hold speed must not change the weight of Play / Pause. Theme tokens still control the separate keycap, badge, and control roles. The primary-label and section-title classes share one CSS rule in `src/components/app-ui/app-ui.css`.

## Add or update a component

1. Fetch the Radix registry JSON from `https://neobrutalism.com/r/radix/<name>.json`.
2. Copy its component content into `src/components/ui`. Review the Git diff against the fetched source and preserve official internal import paths.
3. Add or adjust the corresponding `app-ui` adapter. Keep application changes out of upstream files.
4. Run `npm run lint`, `npm test`, and `npm run build`. Check options, popup, dialogs, comboboxes, and hover edges in the browser. Check reduced-motion behavior when changing animation.

The `components.json` UI alias intentionally points to the upstream directory. Registry installation must not target the application adapters.

`npm run lint` uses ESLint's `no-restricted-imports` rule to reject static imports and reexports from `src/components/ui` outside the `ui` and `app-ui` directories. The rule covers the `@/components/ui` alias and relative paths to `ui`. Application code must use `app-ui` instead. CI runs lint before tests and builds.

This rule does not check dynamic imports, file hashes, or whether upstream files match the registry byte for byte. Review changes to `src/components/ui` in Git and confirm that they come from an upstream update. Local customization belongs in `app-ui`.

Full screen and Picture-in-Picture shortcuts are part of Playback. Legacy `#display` links open Playback, and the former Display category names remain searchable in every language. The speed range card directly shows its minimum, maximum and step fields. Blur, Enter, and label dragging commit changes automatically; its scoped reset preserves preferred speeds and bindings. Editing does not open a dialog.

Subtitles has one shared navigation entry in Options and popup. Its two sections stay visible without another disclosure. Sentence navigation keeps its own activation and reset controls; `#subtitle-navigation` still opens and focuses that section on the shared Subtitles page. Search filters the two sections independently.

The Sentence jumps and replay heading displays its title without an information button or tooltip. The activation guide remains a separate entry-specific popover, and inline guidance explains the prerequisite when the global switch is off.

Seeking editors keep numeric-label drags local until Save. Every eight horizontal pixels adjust seconds by 1 or progress by 5 percentage points; direct input still accepts any whole percentage from 0 to 100. Cancelling the pointer gesture restores the starting draft.

Reset controls use `ResetButton` and localized scope descriptions from `src/shared/reset-scopes.ts`. Text buttons and row icons retain descriptive accessible names and descriptions without hover or focus tooltips. Clicking still opens the confirmation popover. These controls retain their existing behavior:

| Control | Reset scope |
| --- | --- |
| Reset general shortcuts | Restore all general keys and enabled states, remove custom seek/preferred-speed/subtitle-size entries, and restore the built-in size cycle. Preserve sentence shortcuts and all other preferences. |
| Reset sentence shortcuts | Restore the four sentence keys and enabled states; leave default keys disabled when owned by an enabled general shortcut. Preserve the sentence master switch. |
| Ordinary shortcut row | Restore that action's default key and enabled state. Conflicts still require an explicit key change or transfer. |
| Built-in preferred-speed row | Restore its speed value, key and enabled state. Preserve added preferred speeds. |
| Built-in seek row | Restore only the built-in interval, preserving keys, enabled states and custom seek entries. |
| Built-in subtitle-size row | Restore only the sizes and order of the built-in cycle, preserving its binding and custom size entries. |
| Hold-speed row | Restore the hold speed, enable switch and hint switch, preserving the Play / Pause binding. |
| Range and step card | Restore only minimum, maximum and step, preserving preferred speeds and bindings. |

Editor actions distinguish undoing edits from loading defaults: Undo edits restores the opening snapshot; the built-in subtitle-size editor instead offers Use defaults, which loads default sizes, order and key. Both edit the draft and require Save to apply.

Each shortcut section has an icon-only **Manage page features** button at its top right. `PageFeatureManager` opens a popover checklist containing names and `FeatureCheckbox` controls. Edit, reset, delete, and add controls remain in the original settings tables. Unchecking previews hidden rows locally; Apply persists visibility and disabled states, while Cancel or dismissal restores the saved view. Hidden entries retain their keys and parameters and can be shown again from the checklist. The checklist uses plain option rows and a fixed Apply/Cancel footer. Seek directions share one checkbox; custom combinations have separate entries. Checklist checkboxes control visibility: rechecking shows the item and enables it only if its keys are unoccupied. Conflicting items remain disabled without opening a transfer prompt. `ShortcutConflictSwitch` retains the explicit conflict workflow for ordinary table switches. `useFeatureManagement` stages updates until Apply and detects external feature changes. Schema v30 persists `hiddenFeatures`; ordinary row switches can disable a feature while keeping it visible. There is no Undo notice. Popover visibility is local UI state.

Playback contains Play / Pause, its hold-speed settings, and the previous and next episode shortcuts. Its Display subsection contains Fullscreen and Picture-in-Picture. Play / Pause uses the same disclosure button as Forward / Rewind, with its key, enable switch, edit, and reset controls available even when collapsed. The expanded child table has a single header row for Hold speed, Hint, Enabled, and Action, followed by the speed value and its controls. It has no separate collapse control, inset frame, or repeated shortcut key. Its column widths match the parent table so Enabled and Action remain aligned with the other shortcut rows. This group starts expanded; matching search results reveal the child settings with their parent and restore the previous expansion state when search is cleared. Seeking and navigation contains previous/next frame, skip intro, relative seeking, and percentage jumps. Options, popup, search, and the page feature checklist share the same action groups. The existing `#seeking` link and former translated category names remain supported.

The page feature checklist follows the settings hierarchy. Forward / Rewind, Jump to position, and Preferred speed have parent checkboxes with independent nested entries and a mixed state for partial selection. Hold speed is nested under Play / Pause. Nested checklists open expanded and can be collapsed without changing selections. Group toggles preview hiding or restoring the whole group. Restored entries with key conflicts remain visible but disabled; unoccupied entries are enabled, while existing enabled owners retain their keys. Duplicate restored keys stay disabled. Apply saves the preview. Forward / Rewind, Jump to position, Preferred speed, Favorite subtitles, and Favorite audio tracks use ordinary table-row styling in Options, with no inset background panel. Both favorites lists keep their default expanded state and language-list controls.

Interactive group headings highlight their full row on hover and keyboard focus in every UI style. Favorite-language rows also highlight on hover. Plain row headings have no persistent fill.

Page feature management includes the Favorite subtitles and Favorite audio tracks rows. Their visibility controls use the existing staged Apply/Cancel flow and preserve list contents, order, and Audio Description selections. Playback commands use active favorites only; a hidden favorites feature passes no filtering preferences to the playback session.

Preferred speed is the last group in the playback-speed shortcut table, after Reset speed. Its add control uses a short localized Add label while preserving the descriptive accessible name. The checklist and popup use the same action order.

The Traditional Chinese undo-edit action is labeled **還原**. Its tooltip explains that it restores the editor’s starting values and requires Save to apply.

Preferred-speed editors use the seek editor's horizontal field layout: the draggable **Speed / 倍速** label with the visible `0.25–5 ×` range beneath it on the left, and a compact numeric input plus `×` unit on the right. The range describes the input for assistive technology. The field has no help-icon tooltip; autofocus, numeric stepping, label dragging and Save/Cancel behavior are retained for built-in and added preferred speeds.

Modal descriptions use short, complete instructions in all supported interface languages. Preferred speed says **設定倍速，快捷鍵可留空。**; seeking says **設定跳轉值，快捷鍵可留空。**; subtitle-size editors describe the size/order and optional key. Hold speed identifies the Play / Pause hold action. Import explicitly warns that all current settings will be replaced. Compatibility's screen-reader description identifies the results rather than announcing a permanent loading state. Range, validation and conflict messages stay next to their controls.
