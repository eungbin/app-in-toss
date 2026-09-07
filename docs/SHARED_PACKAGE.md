# 공용 패키지 `@ait/kit` 설계

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.5 (2026-09-08) |
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
│   │   ├─ share.ts        # canSaveImage, saveCardImage, shareLink(appName, path, text)
│   │   ├─ i18n.ts         # createT(dict) → t(key, vars). 키 타입은 앱 사전에서 추론
│   │   └─ anon-user.ts    # loadAnonProfile(store, key, schema), AnonProfile
│   └─ scripts/
│       ├─ copy-lint.ts    # createCopyLinter(rules, allow).check(...), reportAndExit(findings, hint)
│       ├─ png.ts          # renderSupersampled, encodePng, writeSquarePng, mix — 로고·카드 이미지 공용
│       ├─ env.ts          # loadEnv(path) — 빌드 스크립트용 .env 로더
│       └─ bundle-scan.ts  # scanBundle / reportBundleScan — 빌드 산출물 문자열 검사
│
│   (보류) react/ 훅, check-ad-ids.ts — net-pay 개발 중 중복이 확인되면 추가.
│   (보류) scripts/env.ts — .env 로더. fx-replay만 쓰므로 두 번째 소비자가 생기면 추출.
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
| 문구 사전 | `i18n/ko.json` | 동일 | `createT(ko)` — 키 타입이 앱 사전에서 추론된다 |
| 프로필 저장 키 | `fxr.profile` | `np.profile` | `loadAnonProfile(store, KEY.profile, SCHEMA_VERSION)` |

## 4. 마이그레이션 결과 (fx-replay, 2026-09-07 완료)
1. 루트 `package.json`(workspaces: `packages/*`, `fx-replay`)·`packages/ait-kit` 생성.
2. fx-replay `src/platform/{env,ads,nav,backstack,share}.ts` 삭제 → `@ait/kit` import. `src/platform/storage.ts`는 `createStore('fxr')` 위에 앱 `KEY`만 남김. `user.ts`는 앱에 유지.
3. `main.tsx`에서 `configureAds()`로 env의 광고 ID 주입(없으면 kit 테스트 ID).
4. `scripts/lint-copy.ts`는 규칙(RULES)·예외(ALLOW)·대상 함수만 남기고 검사·보고는 kit `copy-lint.ts`. `scripts/gen-logo.ts`는 도형 정의만 남기고 렌더·인코딩은 kit `png.ts`.
5. 검증: `npm run check` 통과(타입체크·문구 린트·테스트 114개), `vite build` 성공, 재생성한 로고 PNG가 기존과 바이트 단위로 동일, kit 단독 `tsc` 통과.
6. net-pay는 처음부터 kit를 사용한다(워크스페이스에 추가 예정).

## 4-1. 번들 산출물 검사 — 심사 반려로 얻은 교훈

앱인토스 심사는 런타임 동작이 아니라 **번들에 문자열이 있는지**를 본다.
fx-replay 는 kit 의 `ads.ts` 가 테스트 광고 ID 상수를 모듈 최상위에서 참조해
트리셰이킹이 되지 않아 출시 번들에 문자열이 남았고, **그것만으로 반려**됐다.
`configureAds()` 로 런타임에 실 ID를 덮어써서 동작에는 문제가 없었다.

그래서 두 가지를 바꿨다.
- kit `ads.ts` 는 광고 그룹 ID의 **기본값을 두지 않는다**. 비면 광고를 붙이지 않는다.
  테스트용 ID가 필요하면 앱 `.env` 에 넣는다.
- `scripts/bundle-scan.ts` 로 **빌드된 산출물을 직접 스캔**한다. 설정값만 보는
  `check-prod-config.ts` 로는 이 건을 잡을 수 없었다.

각 앱은 자기 금지 목록만 정의하고 스캔·보고는 kit 을 쓴다.
`build` 에서는 알려만 주고, `build:release` 에서는 막는다.

## 4-2. 세이프 에어리어 — CSS env() 를 쓰지 않는다

앱인토스는 CSS `env(safe-area-inset-*)` 대신 SDK `SafeArea` 를 쓰라고 한다.
env() 를 쓰면 호스트가 이미 처리한 값과 겹쳐 **이중 적용**된다. fx-replay 가 실기기에서
하단 탭 바가 너무 위로 올라온 문제를 겪고 확인했다.

kit `safe-area.ts` 의 `useSafeArea()` 가 `SafeArea.get()` 으로 읽고 `subscribe` 로
화면 모드 변경까지 반영해 `--safe-top` / `--safe-bottom` CSS 변수로 내보낸다.
앱은 그 변수만 쓴다. 토스 앱 밖(브라우저)에서는 0 이다.

**안드로이드는 뷰포트가 시스템 내비게이션 바 아래까지 이어진다.** 흐름상 마지막 요소가
그 뒤로 들어가 잘리므로 컨테이너 쪽에서 `padding-bottom` 에 `--safe-bottom` 을 더한다.
고정 위치 요소(바텀시트·토스트)도 같은 값을 더해야 홈 인디케이터를 비켜 선다.

## 5. 원칙
- kit에는 **앱인토스 플랫폼 코드와 빌드 도구만** 넣는다. 계산 엔진·화면·데이터는 앱에 둔다.
- kit 변경은 두 앱의 테스트를 모두 돌린 뒤 반영한다(루트 `npm test --workspaces`).
- SDK(`@apps-in-toss/web-framework`) 메이저 업그레이드는 kit에서 한 번에 처리한다.

## 6. 변경 이력
- 2026-09-07 v0.1 초안. 사용자 결정(즉시 전환) 반영.
- 2026-09-08 v0.5 safe-area.ts 추가(실기기 문제 대응). 4-2 절 신설.
- 2026-09-08 v0.4 bundle-scan.ts 추가(심사 반려 대응). 4-1 절 신설.
- 2026-09-07 v0.3 env.ts 추가. anon-user·i18n 2차 추출 반영, check-prod-config 추출 예정으로.
- 2026-09-07 v0.2 구현 완료 반영. anon-user·react 훅·check-ad-ids는 보류 목록으로.


## 5. 2차 추출 (2026-09-07)

net-pay에 두 번째 구현이 생겨 설계 문서의 추출 조건이 충족된 항목이다.

### 5-1. `anon-user.ts` — 익명 사용자 식별

두 앱의 `platform/user.ts`가 주석 한 줄 빼고 동일했다. `AnonProfile`(anonKey·schema·createdAt·anonKeyPending)을 kit이 갖고, 앱은 저장소·키·스키마 버전만 넘긴다. 필드를 더 붙여야 하면 인터페이스를 확장한다.

```ts
// fx-replay/src/types.ts
export interface Profile extends AnonProfile {
  userKey?: string;   // v1.1 토스 로그인
}
// fx-replay/src/platform/user.ts — 전체
export const loadProfile = (): Promise<Profile> =>
  loadAnonProfile(store, KEY.profile, SCHEMA_VERSION);
```

원래 보류 사유였던 "Profile 타입이 앱마다 다르다"는 확장으로 해결된다. 앱이 추가하는 필드는 전부 선택 필드이므로 `AnonProfile`을 그대로 할당할 수 있다.

### 5-2. `i18n.ts` — 문구 조회

`createT(dict)`가 사전을 받아 `t()`를 만든다. **키 타입은 사전에서 추론**되므로 앱마다 자기 키만 쓸 수 있고 오타는 타입 오류로 잡힌다.

net-pay 쪽 구현이 더 나아서 그쪽을 채택했다. 값이 없는 자리표시자를 `{name}` 그대로 남겨 누락이 화면에서 보인다(기존 fx-replay 구현은 조용히 넘어갔다).

```ts
// 앱 i18n/index.ts
export const t = createT(ko);
export type CopyKey = keyof typeof ko;
```

앱 고유 헬퍼는 앱에 남긴다(fx-replay `progressLabel` 등).

### 5-3. 추출하지 않은 것

| 후보 | 판단 |
|---|---|
| `platform/storage.ts` | 이미 얇다(createStore + 앱 키). 키 이름은 앱 고유 |
| `scripts/check-data.ts` / `check-prod-data.ts` | 이름만 비슷하고 검사 내용이 완전히 다르다(fx-replay는 합성 데이터 플래그, net-pay는 추정치·유효기간) |
| `scripts/env.ts` | 소비자가 fx-replay 하나뿐. 두 번째가 생기면 추출 |
| `components/BannerAd.tsx` | net-pay에 아직 없다. 배너를 넣으면 그때 추출 |
