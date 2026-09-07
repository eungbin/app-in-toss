# 공용 패키지 `@ait/kit` 설계

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.2 (2026-09-07) — 구현 완료 상태 반영 |
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
│   ├─ tsconfig.json       # 단독 타입체크용 (npx tsc -p)
│   ├─ src/
│   │   ├─ index.ts
│   │   ├─ env.ts          # isTossEnv(), isDev
│   │   ├─ storage.ts      # createStore(prefix) → { get, set, remove, readJson, writeJson, key(name) }
│   │   ├─ ads.ts          # configureAds({ rewarded, banner }), getAdGroups, TEST_AD_GROUPS, preloadRewarded, showRewarded, initBannerSdk, attachBanner
│   │   ├─ nav.ts          # onBack, onHome, closeApp
│   │   ├─ backstack.ts    # pushBackHandler, runBackHandlers
│   │   └─ share.ts        # canSaveImage, saveCardImage, shareLink(appName, path, text)
│   └─ scripts/
│       ├─ copy-lint.ts    # createCopyLinter(rules, allow).check(...), reportAndExit(findings, hint)
│       └─ png.ts          # renderSupersampled, encodePng, writeSquarePng, mix — 로고·카드 이미지 공용
│
│   (보류) anon-user.ts — Profile 타입이 앱마다 달라 v1.0은 앱에 둔다. net-pay에서 두 번째 구현이 생기면 추출.
│   (보류) react/ 훅, check-ad-ids.ts — net-pay 개발 중 중복이 확인되면 추가.
├─ fx-replay/              # 기존. src/platform/* 삭제 → @ait/kit import
└─ net-pay/                # 신규. 처음부터 @ait/kit 사용
```

- 루트가 git 저장소이자 GitHub 비공개 저장소 `eungbin/app-in-toss`의 루트다(2026-09-07 생성). 모든 앱인토스 앱을 이 저장소에서 관리한다.
- `npm install`은 **루트에서** 실행한다. 의존성은 루트 `node_modules`로 호이스팅되고 `@ait/kit`은 심링크로 연결된다. 앱 폴더의 `package-lock.json`은 없고 루트 lockfile만 쓴다.
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

## 4. 마이그레이션 결과 (fx-replay, 2026-09-07 완료)
1. 루트 `package.json`(workspaces: `packages/*`, `fx-replay`)·`packages/ait-kit` 생성.
2. fx-replay `src/platform/{env,ads,nav,backstack,share}.ts` 삭제 → `@ait/kit` import. `src/platform/storage.ts`는 `createStore('fxr')` 위에 앱 `KEY`만 남김. `user.ts`는 앱에 유지.
3. `main.tsx`에서 `configureAds()`로 env의 광고 ID 주입(없으면 kit 테스트 ID).
4. `scripts/lint-copy.ts`는 규칙(RULES)·예외(ALLOW)·대상 함수만 남기고 검사·보고는 kit `copy-lint.ts`. `scripts/gen-logo.ts`는 도형 정의만 남기고 렌더·인코딩은 kit `png.ts`.
5. 검증: `npm run check` 통과(타입체크·문구 린트·테스트 114개), `vite build` 성공, 재생성한 로고 PNG가 기존과 바이트 단위로 동일, kit 단독 `tsc` 통과.
6. net-pay는 처음부터 kit를 사용한다(워크스페이스에 추가 예정).

## 5. 원칙
- kit에는 **앱인토스 플랫폼 코드와 빌드 도구만** 넣는다. 계산 엔진·화면·데이터는 앱에 둔다.
- kit 변경은 두 앱의 테스트를 모두 돌린 뒤 반영한다(루트 `npm test --workspaces`).
- SDK(`@apps-in-toss/web-framework`) 메이저 업그레이드는 kit에서 한 번에 처리한다.

## 6. 변경 이력
- 2026-09-07 v0.1 초안. 사용자 결정(즉시 전환) 반영.
- 2026-09-07 v0.2 구현 완료 반영. anon-user·react 훅·check-ad-ids는 보류 목록으로.
