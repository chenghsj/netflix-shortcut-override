# Reusing feature announcements

The announcement flow lives in `src/shared/feature-announcement.ts`. Each definition owns its release gate, eligibility, seen state, dismissal, and storage subscription. `src/background/feature-announcements.ts` manages the shared toolbar badge. `FeatureAnnouncementCard` manages the popup introduction, recording a view only after the card renders in a visible document.

## Add a feature

1. Create a stable, module-level definition in `src/shared/feature-announcements.ts`:

   ```ts
   export const subtitleNavigationAnnouncement = createFeatureAnnouncement({
     id: 'subtitle-navigation',
     introducedIn: '0.6.2',
     isEnabled: settings => settings.subtitlePractice.enabled,
   })
   ```

   Use a unique lowercase ID containing letters, numbers, and hyphens. Keep the same ID and release version across later releases. `isEnabled` receives normalized, persisted settings; an optimistic toggle does not retire an announcement. Omit `isEnabled` for an informational feature that has no activation setting.

2. Add the definition to `FEATURE_ANNOUNCEMENTS`. The background records eligible upgrades for all definitions and keeps `NEW` while **any** registered feature remains unread. No new background event handlers are needed.

3. Provide localized copy and render the shared card inside the loaded popup:

   ```tsx
   <FeatureAnnouncementCard
     announcement={subtitleNavigationAnnouncement}
     copy={FEATURE_ANNOUNCEMENT_COPY[locale]}
     onEnable={openSubtitleOptions}
   />
   ```

   Copy supplies `title`, `description`, `enable`, `dismiss`, and `error`. Clicking the primary action retires the card and invokes the navigation callback without activating the feature. Keep a separate action in the feature's regular inactive summary so users can find it after reading the announcement. When rendering a list, use `key={announcement.id}`. Cards have independent accessible labels and state.

## Lifecycle

| Event | Introduction | Badge (`unread`) |
| --- | --- | --- |
| First installation, reinstallation, browser update, same-version reload | Not created | Not created |
| Upgrade from before the feature release to that release or later | Available | `NEW` |
| Visible popup displays the introduction | Kept for this visit; hidden on later visits | Cleared |
| User goes to settings | Cleared; regular feature summary retains navigation | Cleared |
| User dismisses or activation is successfully persisted | Cleared | Cleared |
| Later update or worker restart | Existing state retained | Existing state retained |

Skipped releases qualify. Later routine updates never create an announcement for a feature already present in the previous version. Loading and hidden popups do not mark an introduction seen. Storage failures reject the operation; a failed dismissal shows the card's retryable error, and a failed view recording is retried on the next visit. Activating then immediately disabling a feature still retires its announcement.

## Interface and storage

Definitions expose `recordInstall(details, currentVersion)`, `getState()`, `markSeen()`, `dismiss()`, and `subscribe(callback)`. The background owns installation events and serialized badge refreshes; popup callers use the card or `useFeatureAnnouncement(definition, visible)` instead of handling that ordering themselves. Call the unsubscribe returned by `registerFeatureAnnouncements` when disposing an embedded/test background.

The persisted `pending` value means eligible and not dismissed/activated. Popup presentation additionally checks whether that announcement is unread when a visit begins. Recording a view keeps the currently displayed card readable without making it reappear on a later visit.

Flags are local to the browser profile and separate from synced settings and backups:

- `announcement:<id>`: dismissed or activated. This retains the original subtitle-navigation acknowledgement key.
- `announcement:<id>:eligible`: arrived through a qualifying upgrade.
- `announcement:<id>:seen`: viewed the introduction.

Existing subtitle-navigation state requires no migration. Chrome storage and the localStorage development fallback use the same keys.

To repeat a popup test, close the popup, keep the feature disabled, and set its local eligibility to `true`, dismissed to `false`, and seen to `false` in its Service Worker console. Open the popup and confirm `NEW` clears. Close and reopen it: the introduction should be gone while the inactive feature summary retains its navigation action. Clicking the introduction's primary action should also retire it immediately without requiring activation. This simulates state only; validating the actual version gate requires loading the older build and upgrading the same extension ID to the new build.
