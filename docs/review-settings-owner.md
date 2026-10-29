# Review settings ownership

PiP previously guarded saves with a revision derived from UI notifications. An appearance-only storage event can arrive before subscription hydration and defer its UI notification. That event did not invalidate the PiP read, so a later save could restore the old appearance.

The settings owner now separates raw invalidation, initial hydration, and UI delivery. The production change is confined to `shared/storage.ts`, `shared/use-shortcut-settings-form.ts`, and `content/index.ts`.

## Read in three units

1. Read the storage owner. `storageFields` defines the relevant area, key, and snapshot field once. `watchSnapshotChanges` serves both observation and stable reads. `withStableSnapshot` observes raw changes before reading and keeps revision validation, mutation, and write initiation in one continuation. The write queue belongs here.
2. Read the consumers. The form observes one initial snapshot plus later updates and submits its original pure updater. It retains drafts, optimistic rendering, and save-error request IDs. Content submits only changed PiP fields. Both consumer queues and content's revision counter are gone.
3. Read the behavioral tests. Start with the cold appearance regression and owner contracts, then the existing global-disable and rapid-PiP cases. Test changes defer named read roles rather than assuming two independent startup reads.

## Check each API's intent

| API | Intent |
| --- | --- |
| `getSettings` | Obtain a complete snapshot whose read was not invalidated by an observed raw event. |
| `observeSettings` | Deliver the initial reconciled snapshot and later changes. `ready` settles loading; it returns no snapshot to reapply. |
| `subscribeSettings` | Receive changes only, preserving existing safety and cancellation subscribers. |
| `updateSettings` | Apply a synchronous pure updater to current persisted settings, then save on the shared queue. |
| `saveSettings` | Intentionally replace all preferences, such as restoring a backup. It uses the same queue. |

Use `updateSettings` for ordinary edits. The form evaluates its updater for immediate feedback and storage evaluates it again against current data, so updaters must have no side effects. Default initialization retains its separate default-only, local-before-sync recovery policy.

## Follow the evidence

| Contract | Test file |
| --- | --- |
| Real upgrade initialization cannot be overwritten by a pending PiP save. | `src/content/content-appearance-sync.test.ts` |
| A raw appearance event invalidates a read even while UI delivery is deferred. | `src/shared/settings-owner.test.ts` |
| Replacements and mutations stay ordered; a rejection does not block the queue. | `src/shared/settings-owner.test.ts` |
| Initialization cannot restore older form preferences; loading errors preserve earlier functional delivery. | `src/shared/settings-form-sync.test.tsx`, `src/shared/use-shortcut-settings-form.test.tsx` |
| PiP preserves newer disable, shortcut, appearance, and unrelated PiP preferences. | `src/content/pip/content-pip.test.ts` |
| Functional off/on events remain synchronous and legacy defaults retain their precedence. | `src/shared/settings-upgrade.test.ts` |

The new real-upgrade regression failed before this change with expected `classic`, received `neobrutalism`. Existing stored preferences, backup versions, and storage keys do not change.

Run validation from the repository root:

```sh
npm run test:coverage
npm run lint
npm run build
```

## Compare this task's changes

The checkout already contained an uncommitted UI update when this request began. `.audit/settings-owner-review/before` and `baseline.json` record that starting state. `.audit/settings-owner-review/changes.patch` compares this task against those snapshots, including its new tests and this guide. Git HEAD includes the earlier UI work in its diff and is a broader comparison.

The queue coordinates writes within one extension execution context. Chrome sync retains its last-writer behavior for cross-context changes not yet observable locally. Automated storage mocks do not establish installed-browser update delivery or real cross-device acceptance.
