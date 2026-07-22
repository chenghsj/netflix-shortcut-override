# Privacy Policy

Shortcut Override for Netflix does not collect, sell, share, or transfer user data.

The extension only stores user preferences needed for its single purpose: customizing playback keyboard shortcuts on Netflix watch pages. These preferences may include shortcut settings, enabled or disabled state, language preference, seek interval, Space-hold settings, and playback speed settings.

These settings are stored using Chrome storage and are used only by the extension to provide its shortcut customization features.

Shortcut Override for Netflix does not use analytics, tracking, advertising, or external API calls. The extension does not send user data to any external server.

The extension only runs on Netflix pages to listen for user-configured keyboard shortcuts and perform playback actions requested by the user.

When the toolbar popup is opened, it checks the active Netflix tab and may request locally generated compatibility diagnostics. These diagnostics are not sent to an external server. A diagnostics report is written to the clipboard only when the user selects the copy action.

When the toolbar popup is dismissed without opening another destination, the extension may request keyboard focus for the same Netflix watch page. The request runs locally and only when that page is still active and visible. If Netflix is still loading, the request may be kept temporarily in browser session storage for up to 30 seconds so the background service worker can finish the handoff after loading. This temporary record contains only the tab ID, window ID, an opaque request ID, and its deadline; it does not contain the Netflix URL, title, or account information.

If the extension has not connected to an open Netflix tab, the popup can reload that tab only after the user selects the reload action.

This extension is unofficial and is not affiliated with, endorsed by, or sponsored by Netflix.
