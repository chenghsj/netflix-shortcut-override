# Shortcut Override for Netflix

[English](../../README.md) · [繁體中文](zh-TW.md) · [简体中文](zh-CN.md) · [日本語](ja.md) · 한국어

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Netflix 재생 단축키를 설정하고, 자막 위치로 이동하거나 자막이 유지되는 화면 속 화면으로 시청하세요.

비공식 확장 프로그램이며 Netflix와 제휴 관계가 없고 Netflix의 승인이나 후원을 받지 않습니다.

## 설치

[![Chrome Web Store](../assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](../assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox Add-ons](../assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

브라우저 스토어에서 설치한 뒤 Netflix 동영상을 여세요. 도구 모음의 확장 프로그램 아이콘을 누르면 상태를 확인하거나 설정을 열 수 있습니다.

수동으로 설치하려면 [GitHub Releases](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)에서 브라우저에 맞는 패키지를 다운로드하세요.

- **Chrome / Edge:** Chromium ZIP의 압축을 풀고 `chrome://extensions` 또는 `edge://extensions`에서 개발자 모드를 켜세요. 압축 해제된 확장 프로그램을 로드하는 항목을 선택한 뒤 `manifest.json`이 들어 있는 폴더를 지정하세요.
- **Firefox:** `about:debugging#/runtime/this-firefox`에서 임시 부가 기능을 로드하는 항목을 선택하고 Firefox ZIP을 지정하세요. 브라우저를 다시 시작하면 제거됩니다. 계속 사용하고 자동 업데이트를 받으려면 Firefox Add-ons에서 설치하세요.

## 주요 기능

- 각 단축키 변경, 개별 활성화·비활성화, 설정에서 키 충돌 해결.
- 재생, 되감기·빨리 감기, 음량, 자막, 전체 화면, 인트로 건너뛰기, 재생 속도 제어.
- 이전·다음 자막으로 이동하거나 현재 자막 다시 재생.
- Chrome과 Edge에서 Netflix 자막과 재생 컨트롤이 포함된 화면 속 화면 사용.
- 재생/일시정지 키를 길게 눌러 일시적으로 속도를 바꾸고, 놓으면 원래 속도로 복원.
- 도구 모음 팝업에서 호환성 확인 및 로컬 진단 정보 복사.
- 브라우저 저장소를 통한 설정 동기화, 백업 내보내기·가져오기, 5개 인터페이스 언어 지원.

## 기본 단축키

모든 키는 설정에서 변경할 수 있습니다.

| 동작 | 기본 키 |
| --- | --- |
| 재생/일시정지 | `Space` |
| 되감기/빨리 감기 | `Left` / `Right` |
| 음량 높이기/낮추기 | `Up` / `Down` |
| 음소거 | `M` |
| Netflix 자막 켜기/끄기 | `C` |
| 전체 화면 | `F` |
| 화면 속 화면 | `Shift + P` |
| 인트로 건너뛰기 | `S` |
| 재생 속도 높이기/낮추기 | `Shift + .` / `Shift + ,` |
| 선호 재생 속도 적용 | `Shift + "` |
| 재생 속도 초기화 | `Shift + /` |

길게 누르기 속도가 활성화되어 있으면 재생/일시정지 키를 짧게 눌러 재생 상태를 전환하거나 약 250밀리초 동안 눌러 길게 누르기 속도(기본 `2x`)를 일시적으로 적용할 수 있습니다.

이동 간격은 기본 `10s`이며 `1s`부터 `60s`까지 설정할 수 있습니다. 속도의 최솟값·최댓값, 변경 간격, 선호 속도, 길게 누르기 속도도 조절할 수 있습니다. 전체 범위와 초기화 동작은 [상세 사용 가이드(영어)](../user-guide.md)를 참고하세요.

## 자막 탐색

자막 탐색은 **기본적으로 꺼져 있습니다**.

1. 설정을 열고 단축키 재정의를 활성화하세요.
2. 자막 탐색을 활성화하고, 브라우저가 요청하면 Netflix와 자막 사이트 접근을 허용하세요.
3. Netflix에서 자막 트랙을 선택하세요.

| 동작 | 기본 키 |
| --- | --- |
| 이전 자막 | `A` |
| 다음 자막 | `D` |
| 현재 자막 다시 재생 | `S` |
| 재생/일시정지 | `W` |

`A`와 `D`는 현재 재생 또는 일시정지 상태를 유지합니다. `S`는 현재 자막의 시작 위치에서 재생하며 반복하거나 자막 끝에서 자동으로 멈추지 않습니다. `W`는 재생 상태를 즉시 전환하고 길게 누르기 속도를 적용하지 않습니다.

**활성화된 자막 탐색 키는 일반 단축키보다 우선합니다.** 기본 설정에서는 자막 탐색이 켜져 있을 때 `S`로 자막을 다시 재생합니다. 해당 동작이나 자막 탐색을 끄면 `S`로 인트로를 건너뛸 수 있습니다.

사이트 접근을 거부하면 기능은 꺼진 상태로 유지됩니다. 다시 켜서 권한을 요청할 수 있습니다. 이 키들은 Chrome과 Edge에서 확장 프로그램이 관리하는 화면 속 화면 창에서도 사용할 수 있습니다.

## 인터페이스 언어

영어, 번체 중국어, 간체 중국어, 일본어, 한국어를 지원합니다. 지원되는 브라우저 인터페이스 언어를 자동으로 따르거나 설정에서 직접 선택할 수 있습니다.

## 지원 브라우저 및 제한 사항

- 데스크톱 Chrome, Edge, Firefox를 지원합니다. 자막을 유지하는 화면 속 화면 기능은 Chrome 또는 Edge가 필요하며 Firefox에서는 비활성화됩니다.
- 단축키는 Netflix 시청 페이지 또는 플레이어가 표시된 페이지에서 작동합니다. 편집 가능한 입력란에서 입력할 때는 키를 가로채지 않습니다.
- 전체 화면은 Netflix 페이지에서만 사용할 수 있습니다. 인트로 건너뛰기는 Netflix 건너뛰기 버튼이 표시되어야 작동합니다.
- 탐색, 자막 전환, 자막 탐색은 Netflix의 비공개 플레이어 인터페이스에 의존하므로 Netflix 변경 시 확장 프로그램 업데이트가 필요할 수 있습니다.

## 권한 및 개인정보

- **Netflix 사이트 접근:** 재생 단축키를 실행하고 현재 선택된 자막 트랙을 읽습니다.
- **선택적 `https://*.nflxvideo.net/*` 접근:** 자막 탐색을 켤 때 권한을 요청하고 탐색 동작 시 자막 문서를 다운로드합니다. 이 CDN 사이트에서는 콘텐츠 스크립트를 실행하지 않습니다.
- **저장소, 스크립트 실행, 활성 탭:** 설정 저장, 재생 동작 실행, 호환성 확인, 재생 화면으로 포커스 복원에 사용됩니다. 팝업은 사용자가 복구 동작을 선택한 경우에만 Netflix를 새로고침합니다.

자막 탐색을 꺼도 이미 허용한 사이트 접근 권한은 취소되지 않습니다. [권한 설명(영어)](../user-guide.md#permissions)과 [사이트 접근 문제 해결(영어)](../troubleshooting.md#subtitle-website-access)을 참고하세요.

사용 통계 수집, 추적 또는 제삼자 처리 서비스를 사용하지 않습니다. 자막 문서는 Netflix 배포 호스트에서 받아 로컬에서 분석하며 시간 정보 캐시는 메모리에만 유지됩니다. 설정은 브라우저 동기화 저장소를 사용합니다. 호환성 진단 정보는 직접 복사해 공유하지 않는 한 기기에 남습니다. 전체 내용은 [개인정보 처리방침(영어)](../../PRIVACY.md)을 참고하세요.

## 개발 및 문서

Node.js 22 이상과 npm이 필요합니다. 저장소 루트에서 실행하세요.

```sh
npm ci
npm run build
```

Chrome / Edge에서는 `dist/chromium`을 로드하고, Firefox에서는 `dist/firefox/manifest.json`을 임시 부가 기능으로 로드하세요.

상세 문서는 영어로 유지합니다.

- [사용 가이드](../user-guide.md): 설정, 자막 탐색, 권한 및 개인정보 세부 사항.
- [개발 가이드](../development.md): HMR, 명령어, 구조 및 테스트.
- [출시 가이드](../release.md): 버전 태그, 패키징, 체크섬 및 Firefox 제출.
- [문제 해결](../troubleshooting.md): 단축키, 사이트 권한 및 개발 문제.
- [동작 명세](../behavior-spec.md) · [Chrome 브라우저 테스트](../chrome-real-browser-test.md) · [Firefox 브라우저 테스트](../firefox-real-browser-test.md)

## 문제 보고 및 라이선스

[GitHub issue](https://github.com/chenghsj/netflix-shortcut-override/issues/new/choose)에 브라우저와 확장 프로그램 버전, 실패한 동작, 가능한 경우 도구 모음 팝업에서 복사한 호환성 진단 정보를 포함하세요.

[MIT 라이선스](../../LICENSE)를 따릅니다.
