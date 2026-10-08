# Shortcut Override for Netflix

[English](../../README.md) · [繁體中文](zh-TW.md) · [简体中文](zh-CN.md) · 日本語 · [한국어](ko.md)

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Netflix の再生ショートカットをカスタマイズし、字幕に沿って移動したり、字幕付きピクチャーインピクチャーで視聴したりできます。

非公式の拡張機能です。Netflix との提携関係はなく、Netflix による承認や支援も受けていません。

## インストール

[![Chrome Web Store](../assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](../assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox Add-ons](../assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

ブラウザーのストアからインストールし、Netflix の動画を開いてください。ツールバーの拡張機能アイコンから状態を確認したり、設定を開いたりできます。

手動でインストールする場合は、[GitHub Releases](https://github.com/chenghsj/netflix-shortcut-override/releases/latest) からブラウザーに合ったパッケージをダウンロードしてください。

- **Chrome / Edge：**Chromium ZIP を展開し、`chrome://extensions` または `edge://extensions` でデベロッパーモードを有効にします。「パッケージ化されていない拡張機能を読み込む」を選び、`manifest.json` を含むフォルダーを指定します。
- **Firefox：**`about:debugging#/runtime/this-firefox` で「一時的なアドオンを読み込む」を選び、Firefox ZIP を指定します。ブラウザーを再起動すると削除されます。継続して使用し、自動更新を受けるには Firefox Add-ons からインストールしてください。

## 主な機能

- 各ショートカットの変更、有効・無効の切り替え、キーの競合解決。
- 再生、早戻し・早送り、音量、字幕、全画面、イントロのスキップ、再生速度の操作。
- 前後の字幕への移動と、現在の字幕からの再生。
- Chrome と Edge で、Netflix の字幕と再生コントロールを備えたピクチャーインピクチャー。
- 再生／一時停止キーを長押しすると一時的に速度を変更し、離すと元の速度に戻す機能。
- ツールバーのポップアップで互換性を確認し、ローカルの診断情報をコピー。
- ブラウザーのストレージによる設定の同期、バックアップのエクスポート・インポート、5 言語のインターフェース。

## 既定のショートカット

すべてのキーは設定で変更できます。

| 操作 | 既定のキー |
| --- | --- |
| 再生／一時停止 | `Space` |
| 早戻し／早送り | `Left` / `Right` |
| 音量を上げる／下げる | `Up` / `Down` |
| ミュート | `M` |
| Netflix の字幕をオン／オフ | `C` |
| 全画面 | `F` |
| ピクチャーインピクチャー | `Shift + P` |
| イントロをスキップ | `S` |
| 再生速度を上げる／下げる | `Shift + .` / `Shift + ,` |
| 好みの再生速度を適用 | `Shift + "` |
| 再生速度をリセット | `Shift + /` |

長押し速度が有効な場合、再生／一時停止キーを短く押すと再生状態を切り替え、約 250 ミリ秒長押しすると一時的に長押し速度（既定値 `2x`）を適用します。

移動幅は既定で `10s`、設定範囲は `1s`～`60s` です。速度の上下限、変更幅、好みの速度、長押し速度も調整できます。設定範囲とリセットの詳細は[詳しい使い方（英語）](../user-guide.md)をご覧ください。

## 字幕ナビゲーション

字幕ナビゲーションは**既定ではオフ**です。

1. 設定を開き、ショートカットの上書きを有効にします。
2. 字幕ナビゲーションを有効にし、ブラウザーから確認された場合は Netflix と字幕配信サイトへのアクセスを許可します。
3. Netflix で字幕トラックを選択します。

| 操作 | 既定のキー |
| --- | --- |
| 前の字幕 | `A` |
| 次の字幕 | `D` |
| 現在の字幕を再生 | `S` |
| 再生／一時停止 | `W` |

`A` と `D` は再生中・一時停止中の状態を維持します。`S` は現在の字幕の開始位置から再生します。ループ再生や字幕の終わりでの自動停止は行いません。`W` は即座に再生状態を切り替え、長押し速度は適用しません。

**有効な字幕ナビゲーションキーは通常のショートカットより優先されます。**既定の設定では、字幕ナビゲーションを有効にすると `S` は字幕の再生に使われます。この操作または字幕ナビゲーションを無効にすると、`S` でイントロをスキップできます。

サイトへのアクセスを拒否した場合、機能はオフのままです。再度有効にして許可を要求できます。これらのキーは Chrome と Edge の拡張機能が管理するピクチャーインピクチャーウィンドウでも使えます。

## 表示言語

英語、繁体字中国語、簡体字中国語、日本語、韓国語に対応しています。対応するブラウザーの表示言語に自動で合わせるか、設定で手動選択できます。

## 対応ブラウザーと制限

- デスクトップ版 Chrome、Edge、Firefox に対応しています。字幕付きピクチャーインピクチャーは Chrome または Edge が必要で、Firefox では無効です。
- ショートカットは Netflix の視聴ページやプレーヤーが表示されているページで動作します。入力欄などでの文字入力中はキーを処理しません。
- 全画面は Netflix ページでのみ利用できます。イントロのスキップには Netflix のスキップボタンが表示されている必要があります。
- シーク、字幕切り替え、字幕ナビゲーションは Netflix の非公開プレーヤーインターフェースに依存するため、Netflix の変更に伴い拡張機能の更新が必要になる場合があります。

## 権限とプライバシー

- **Netflix サイトへのアクセス：**再生ショートカットの実行と、選択中の字幕トラックの読み取りに使用します。
- **任意の `https://*.nflxvideo.net/*` へのアクセス：**字幕ナビゲーションを有効にする際に許可を要求し、移動操作時に字幕文書を取得します。この CDN サイトではコンテンツスクリプトを実行しません。
- **ストレージ、スクリプト実行、アクティブなタブ：**設定の保存、再生操作、互換性の確認、再生画面へのフォーカス復元に使用します。Netflix の再読み込みは、ポップアップで復旧操作を選択した場合にのみ行います。

字幕ナビゲーションを無効にしても、許可済みのサイトアクセスは取り消されません。[権限の詳細（英語）](../user-guide.md#permissions)と[アクセス権限のトラブルシューティング（英語）](../troubleshooting.md#subtitle-website-access)をご覧ください。

アクセス解析、追跡、第三者による処理サービスは使用しません。字幕文書は Netflix の配信ホストから取得してローカルで解析し、時間情報のキャッシュはメモリ内にのみ保持します。設定はブラウザーの同期ストレージに保存します。互換性の診断情報は、自分でコピーして共有しない限り端末内に留まります。詳しくは[プライバシーポリシー（英語）](../../PRIVACY.md)をご覧ください。

## 開発とドキュメント

Node.js 22 以上と npm が必要です。リポジトリのルートで実行します。

```sh
npm ci
npm run build
```

Chrome / Edge では `dist/chromium` を、Firefox では `dist/firefox/manifest.json` を一時的なアドオンとして読み込みます。

詳細なドキュメントは英語で管理しています。

- [詳しい使い方](../user-guide.md)：設定、字幕ナビゲーション、権限、プライバシー。
- [開発ガイド](../development.md)：HMR、コマンド、構成、テスト。
- [リリースガイド](../release.md)：バージョンタグ、パッケージ、チェックサム、Firefox への提出。
- [トラブルシューティング](../troubleshooting.md)：ショートカット、サイトアクセス、開発時の問題。
- [動作仕様](../behavior-spec.md) · [Chrome ブラウザーテスト](../chrome-real-browser-test.md) · [Firefox ブラウザーテスト](../firefox-real-browser-test.md)

## 不具合の報告とライセンス

[GitHub issue](https://github.com/chenghsj/netflix-shortcut-override/issues/new/choose) にブラウザーと拡張機能のバージョン、失敗した操作、取得できる場合はツールバーのポップアップからコピーした互換性の診断情報を記載してください。

[MIT ライセンス](../../LICENSE)で公開しています。
