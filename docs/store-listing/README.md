# Store listing translations

The extension name stays **Shortcut Override for Netflix** in every language.
The manifest uses `public/_locales/*/messages.json` for the localized name and
short description (the Chrome Web Store's title and summary). The default locale
is English. Vite copies these files into both browser builds.

The extension's interface translations and manual language preference remain in
`src/shared/i18n.ts`; these metadata files do not change the interface language.

## Detailed descriptions

These plain-text files are copy-ready content for the store's **Description**
field. They are not part of the extension package and are not uploaded by the build:

| Package locale | Language | Description |
| --- | --- | --- |
| `en` | English | [en.txt](en.txt) |
| `zh_TW` | Traditional Chinese | [zh-TW.txt](zh-TW.txt) |
| `zh_CN` | Simplified Chinese | [zh-CN.txt](zh-CN.txt) |
| `ja` | Japanese | [ja.txt](ja.txt) |
| `ko` | Korean | [ko.txt](ko.txt) |

Upload the updated extension package, then select each language in the Chrome
Web Store Developer Dashboard's **Store listing** page and paste its description.
Review the localized screenshots and save the listing changes before submission.
Building locally does not update the published store page.

The descriptions cover both browser builds and identify the Chrome/Edge-only
Picture-in-Picture feature explicitly.

## Search terms

The [Microsoft Edge Add-ons search terms](search-terms.md) contain seven suggested
terms for each of the five languages, plus the dashboard's character and word
limits. Enter these separately in Partner Center's **Search terms** field.

Reference: [Chrome Web Store listing localization](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize_your_listing).
