# Privacy Policy

Shortcut Override for Netflix does not collect user data for the developer, sell user data, or send it to analytics, advertising, or third-party processing services.

The extension only stores user preferences needed for its single purpose: customizing playback keyboard shortcuts in Netflix playback contexts. These preferences may include ordinary and subtitle navigation shortcut settings, enabled or disabled state, language and theme preferences, seek interval, hold-speed settings, playback speed settings, and Picture-in-Picture subtitle appearance settings.

These settings are stored using browser sync storage (`chrome.storage.sync`) and are used only by the extension to provide its shortcut customization features.

The extension also stores a local acknowledgement (`chrome.storage.local`) when a new-feature announcement is dismissed or its feature is enabled, so the same announcement is not repeated. This record contains only a feature identifier and acknowledgement flag; it is not synced or sent to an external service.

Shortcut Override for Netflix does not use analytics, tracking, advertising, or third-party processing APIs.

When subtitle navigation is enabled and the user requests a previous, next, or replay action, the extension reads the selected Netflix subtitle track and retrieves its timed-text document from an HTTPS Netflix delivery host (`netflix.com` or `nflxvideo.net`, including subdomains). Access to `nflxvideo.net` is optional and requested when the user enables subtitle navigation. The request uses the subtitle URL supplied by the active Netflix player and may include browser-managed cookies for the delivery host. The extension does not send those URLs, cookies, or subtitle documents to the developer or another processing service.

Subtitle documents are parsed locally. The navigation timing cache is held in content-script memory and is not written to browser sync storage. User-facing subtitle failure diagnostics use error codes rather than signed delivery URLs, cookies, or subtitle content. The CDN host permissions are used for document retrieval; content scripts still run only on Netflix pages.

The extension only runs on Netflix pages to listen for user-configured keyboard shortcuts and perform playback actions requested by the user.

When the toolbar popup is opened, it checks the active Netflix tab and may request locally generated compatibility diagnostics. These diagnostics are not sent to an external server. A diagnostics report is written to the clipboard only when the user selects the copy action.

When the toolbar popup is dismissed without opening another destination, the extension may request keyboard focus for the same Netflix playback context. The request runs locally and only when that page is still active and visible. If Netflix is still loading, the request may be kept temporarily in browser session storage for up to 30 seconds so the background service worker can finish the handoff after loading. This temporary record contains only the tab ID, window ID, an opaque request ID, and its deadline; it does not contain the Netflix URL, title, or account information.

If the extension has not connected to an open Netflix tab, the popup can reload that tab only after the user selects the reload action.

This extension is unofficial and is not affiliated with, endorsed by, or sponsored by Netflix.
