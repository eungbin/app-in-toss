# 공용 패키지 `@ait/kit` 설계

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 (2026-09-07) |
| 결정 | 2026-09-07 사용자 확정: 세 번째 앱을 기다리지 않고 **지금부터** 공용 패키지로 전환 |
| 적용 앱 | fx-replay (기존), net-pay (신규), 이후 모든 앱인토스 미니앱 |
| 위치 | `/Users/covy/dev/app-in-toss/packages/ait-kit` |

## 1. 목표
- 앱인토스 SDK 연동 코드(광고·저장·네비게이션·공유·환경 판별)와 빌드 스크립트(문구 린트·로고 생성·테스트 광고 ID 검사)를 한 곳에서 유지한다.
- 버그를 한 번 고치면 모든 앱에 반영된다. 앱별로 달라지는 값은 전부 **주입**한다.
- 빌드 단계 없이 TypeScript 소스를 그대로 소비한다(Vite·vitest·tsc가 워크스페이스 소스를 직접 읽는다). 배포·퍼블리시 없음, 비용 0.

## 2. 워크스페이스 구조

```
/Users/covy/dev/app-in-toss/
├─ package.json            # "private": true, "workspaces": ["packages/*", "fx-replay", "net-pay"]
├─ packages/ait-kit/
│   ├─ package.json        # name "@ait/kit", "exports": { ".": "./src/index.ts", "./scripts/*": "./scripts/*.ts" }
│   ├─ src/
│   │   ├─ index.ts
│   │   ├─ env.ts          # isTossEnv(), isDev
│   │   ├─ storage.ts      # createStore(prefix) → { get, set, remove, readJson, writeJson, key(name) }
│   │   ├─ ads.ts          # configureAds({ rewarded, banner }), preloadRewarded, showRewarded, initBannerSdk, attachBanner
│   │   ├─ nav.ts          # onBack, onHome, closeApp
│   │   ├─ backstack.ts    # pushBackHandler, runBackHandlers
│   │   ├─ share.ts        # canSaveImage, saveCardImage, shareLink(appName, path, text)
│   │   ├─ anon-user.ts    # loadAnonKey(store) — Profile 타입은 앱이 확장
│   │   └─ react/          # useBackHandler, useRewardedAd, useBanner (P1, 두 앱에서 중복이 확인되면)
│   ├─ scripts/
│   │   ├─ lint-copy.ts    # runCopyLint({ root, targets, rules, allowlist })
│   │   ├─ gen-logo.ts     # 600×600 로고 생성 (앱별 색·글자 주입)
│   │   └─ check-ad-ids.ts # 프로덕션 빌드에 테스트 광고 ID 잔존 시 exit 1
│   └─ vitest.preset.ts
├─ fx-replay/              # 기존. src/platform/* 삭제 → @ait/kit import
└─ net-pay/                # 신규. 처음부터 @ait/kit 사용
```

- 루트는 git 저장소가 아니다. 각 앱 폴더의 git 상태는 마이그레이션 전에 확인하고, 필요하면 루트를 저장소로 만든다(사용자 확인 후).
- `@ait/kit`의 `peerDependencies`: `react`, `@apps-in-toss/web-framework`. 버전은 각 앱이 결정한다.

## 3. 주입 지점 (앱별로 다른 값)

| 값 | fx-replay | net-pay | 주입 방법 |
|---|---|---|---|
| Storage 키 접두어 | `fxr.` | `np.` | `createStore('fxr')` |
| 광고 그룹 ID | env `VITE_AD_*` | 동일 | `configureAds({ rewarded, banner })` 앱 시작 시 1회 |
| 앱 이름(딥링크) | `fx-replay` | `net-pay` | `shareLink(appName, …)` 인자 |
| 금지어 사전 | 원칙 B·C (예측·권고·경쟁) | 원칙 A·B (금융 상품·권고·평가) | `runCopyLint({ rules })` — 사전은 각 앱 `scripts/copy-rules.ts` |
| 린트 대상 파일 | `scenarios/*.json`, `i18n/ko.json` | `i18n/ko.json`, 카드 문구 | `runCopyLint({ targets })` |
| 로고 색·글자 | 파랑·"환" | 앱 확정 후 | `genLogo({ bg, glyph })` |

## 4. 마이그레이션 절차 (fx-replay)
1. 루트 `package.json`·워크스페이스 생성, `packages/ait-kit` 스캐폴딩.
2. fx-replay `src/platform/{env,storage,ads,nav,backstack,share}.ts`를 kit로 이동. `storage.ts`의 `KEY` 상수와 `user.ts`(Profile·SCHEMA_VERSION 의존)는 **앱에 남긴다**. kit의 `createStore('fxr')` 위에 앱의 `KEY`를 얹는다.
3. `scripts/lint-copy.ts` → 규칙 배열만 `scripts/copy-rules.ts`로 남기고 실행 로직은 kit.
4. fx-replay `npm run check`(typecheck + lint:copy + 82개 테스트) 통과 확인. 동작 변경 0.
5. net-pay는 처음부터 kit를 사용한다.

## 5. 원칙
- kit에는 **앱인토스 플랫폼 코드와 빌드 도구만** 넣는다. 계산 엔진·화면·데이터는 앱에 둔다.
- kit 변경은 두 앱의 테스트를 모두 돌린 뒤 반영한다(루트 `npm test --workspaces`).
- SDK(`@apps-in-toss/web-framework`) 메이저 업그레이드는 kit에서 한 번에 처리한다.

## 6. 변경 이력
- 2026-09-07 v0.1 초안. 사용자 결정(즉시 전환) 반영.
