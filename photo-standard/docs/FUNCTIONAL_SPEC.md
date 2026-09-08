# 기능 명세 — photo-standard ("사진규격")

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 (2026-09-08) |
| 상위 문서 | [PRD.md](PRD.md) v0.1 — 요구사항 ID(IN-, PR-, CV-, SV-, AD-, CM-)는 PRD와 동일 |
| 공용 코드 | [../../docs/SHARED_PACKAGE.md](../../docs/SHARED_PACKAGE.md) `@ait/kit` |
| 적용 범위 | **v1.0 (광고 전용, 서버 없음)**. P1 항목은 `[P1]` 표시 |
| 관련 문서 | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), 화면 흐름 ([SCREEN_FLOW.md](SCREEN_FLOW.md)) |

이 문서는 "무엇을 어떻게 동작시키는가"를 구현 가능한 수준으로 적는다. 화면 배치·비주얼은 다음 문서에서 다룬다.

---

## 0. 상수·용어

| 상수 | 값 | 설명 |
|---|---|---|
| `SAVE_FREE_PER_DAY` | 3 | 하루 무료 저장 횟수 |
| `INPUT_MAX_WIDTH` | 2400 | `Device.getPhotos` / `openCamera` 에 넘길 `maxWidth`. 최대 프리셋(비자 1200px)의 2배 |
| `Q_LO` / `Q_HI` | 0.40 / 0.95 | JPEG 품질 이분 탐색 범위 |
| `Q_ITER` | 8 | 이분 탐색 반복 횟수. 해상도 약 0.002 |
| `RATIO_TOL` | 0.01 | 비율 일치 허용 오차(1%) |
| `SOURCE_STALE_DAYS` | 365 | 규격 출처 확인일이 이보다 오래되면 빌드 경고 |
| `SCHEMA_VERSION` | 1 | Storage 스키마 버전 |
| `MM_PER_INCH` | 25.4 | cm/mm ↔ px 환산용 |

용어: **프리셋(Preset)** = 용도별 규격 정의. **판정(Verdict)** = 현재 이미지와 프리셋을 대조한 항목별 결과. **소스(Source)** = 사용자가 고른 원본 이미지. **결과(Output)** = 변환을 마친 이미지. **게이트(gate)** = 리워드 광고로 하루 열리는 저장 상한. **기관 프리셋** = 근거 기관과 URL이 있는 규격. **관행 프리셋** = 근거 고시가 없는 통용 규격.

사용자 화면 용어(PRD 원칙 B): "기준에 맞아요", "기준을 넘었어요", "크기를 맞출게요". **금지: "통과", "합격", "승인", "보장", "무조건", "확실"** (3-12 린트).

### 0-1. 픽셀 환산
물리 규격(cm)에서 픽셀을 낼 때는 300dpi를 쓴다.

```
px = round(cm / 2.54 * 300)
3.5cm → 413,  4.5cm → 531,  3cm → 354,  4cm → 472
```

이 값들은 **런타임에 계산하지 않고 상수로 박는다.** 외교부가 413 × 531을 직접 명시했기 때문에, 환산식이 아니라 원문 수치가 기준이다. 환산식은 "직접 입력"에서 사용자가 cm로 넣을 때만 쓴다.

---

## 1. 데이터 모델

### 1-1. 프리셋 (`src/data/presets.ts`)

```ts
type PresetKind = 'official' | 'convention' | 'custom';
type OutFormat = 'jpeg' | 'png' | 'any';

interface Preset {
  id: string;
  label: string;             // 화면 표기
  kind: PresetKind;
  /** 목표 픽셀 — 변환의 결과 크기 */
  target: { w: number; h: number };
  /** 허용 범위. 없으면 target 정확히 일치가 기준 */
  range?: { wMin: number; wMax: number; hMin: number; hMax: number };
  /** 파일 용량 상한(바이트). 없으면 제한 없음 */
  maxBytes?: number;
  format: OutFormat;
  /** 물리 규격 병기용. 화면 표시에만 쓴다 */
  physical?: { wMm: number; hMm: number };
  /** 기관 프리셋만 가진다 */
  source?: { org: string; url: string; checkedAt: string };
  /** 추가 안내 — 앱이 처리하지 않고 알리기만 하는 조건 */
  notes?: string[];
}
```

v1.0 프리셋 6종:

| id | label | kind | target | range | maxBytes | format |
|---|---|---|---|---|---|---|
| `passport-online` | 여권 (온라인 신청) | official | 413 × 531 | 395–431 × 507–550 | 512,000 | jpeg |
| `passport-print` | 여권 (인화용) | official | 413 × 531 | — | — | any |
| `driver-online` | 운전면허 (온라인) | official | 350 × 450 | — | — | any |
| `us-visa` | 미국 비자 | official | 600 × 600 | 600–1200 × 600–1200 | 245,760 | jpeg |
| `id-3x4` | 증명사진 3 × 4 cm | **convention** | 354 × 472 | — | — | any |
| `custom` | 직접 입력 | custom | 사용자 지정 | — | 사용자 지정 | any |

- `maxBytes` 는 **KB가 아니라 바이트**다. 500KB = 512,000 (10진 KB, 기관 표기 기준). 240KB = 245,760.
- `us-visa` 는 정사각 필수 → `target.w === target.h`. 자르기에서 1:1 고정.
- `id-3x4` 는 `source` 가 없다. 화면에서 "일반 관행" 배지를 단다 (PR-4).
- `notes` 예: 여권 = ["배경은 흰색이어야 해요", "6개월 이내에 찍은 사진이어야 해요"]. 앱이 검사하지 않고 안내만 한다.

### 1-2. 이미지 상태 (런타임)

```ts
interface SourceImage {
  dataUri: string;          // Device.getPhotos / openCamera 결과
  width: number;            // 디코딩 후 실측
  height: number;
  bytes: number;            // 1-4 로 계산
  mime: string;             // dataUri 헤더에서 파싱
}

interface CropBox {
  x: number; y: number; w: number; h: number;   // 소스 이미지 좌표계(px)
}

interface OutputImage {
  dataUri: string;
  width: number; height: number; bytes: number;
  quality: number | null;   // JPEG 압축을 거쳤으면 최종 품질, 아니면 null
}
```

### 1-3. 앱 상태

```ts
interface AppState {
  presetId: string;
  custom: { w: number; h: number; maxKb: number | null };
  source: SourceImage | null;
  crop: CropBox | null;
  output: OutputImage | null;
  savedToday: number;       // 오늘 저장 횟수
  gateOpenUntil: number | null;  // 자정 타임스탬프. null이면 안 열림
}
```

### 1-4. dataUri 바이트 계산 — `dataUriBytes(uri: string): number`

base64 페이로드 길이에서 실제 바이트를 낸다. **문자열 길이를 그대로 쓰면 약 33% 과대평가된다.**

```
payload = uri.slice(uri.indexOf(',') + 1)
pad     = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
bytes   = floor(payload.length * 3 / 4) - pad
```

이 함수는 순수 함수이며 골든 테스트 대상이다(5장).

---

## 2. 화면 목록과 라우팅

| ID | 경로 | 화면 | 진입 |
|---|---|---|---|
| S01 | `/` | 홈 — 사진 고르기 + 프리셋 선택 | 딥링크 `intoss://photo-standard/` |
| S02 | `/check` | 판정 — 항목별 결과 | 사진 선택 후 |
| S03 | `/crop` | 자르기 — 비율 고정 | 판정에서 비율 불일치이거나 사용자가 직접 |
| S04 | `/result` | 결과 — 미리보기 + 저장 | 변환 후 |
| S05 | `/sources` | 규격 출처 | 홈·판정 하단 링크 |

- 딥링크 진입점은 **`/` 하나뿐이다** (콘솔 등록값). 나머지는 앱 내부 이동이다.
- 뒤로가기는 kit `backstack`. 토스 네비게이션 바를 쓰고 자체 헤더를 만들지 않는다 (CM-2).
- S02 → S04 는 비율이 이미 맞으면 자르기를 건너뛴다.

---

## 3. 기능 명세

### 3-1. 앱 시작·부트스트랩 (CM-1 ~ CM-4)
1. `configureAds()` 로 광고 그룹 ID 주입. `.env` 가 비면 빈 문자열 → 광고를 붙이지 않는다 (AD-3).
2. kit `safe-area` 초기화. CSS `env(safe-area-inset)` 는 쓰지 않는다.
3. Storage 로드 → `savedToday`, `gateOpenUntil`, 마지막 프리셋 복원 (3-11).
4. 날짜가 바뀌었으면 `savedToday = 0`, `gateOpenUntil = null`.
5. 배너 광고 프리로드. 리워드는 **상한에 닿기 전까지 로드하지 않는다.**

### 3-2. 사진 입력 (IN-1 ~ IN-5)

```ts
async function pickFromAlbum(): Promise<SourceImage>
async function shootWithCamera(): Promise<SourceImage>
```

- 앨범: `Device.getPhotos({ maxCount: 1, maxWidth: INPUT_MAX_WIDTH, base64: true })`
- 카메라: `Device.openCamera({ maxWidth: INPUT_MAX_WIDTH, base64: true })`
- 반환된 `dataUri` 를 `Image` 로 디코딩해 실측 `width`/`height` 를 얻는다. **SDK가 준 값을 믿지 않고 직접 잰다.**
- `bytes` 는 1-4로 계산. `mime` 은 dataUri 헤더에서 파싱.
- 빈 배열(사용자 취소)이면 아무 것도 하지 않고 홈에 머문다.

권한 (IN-4):
- 권한 요청은 **사용자가 [앨범에서 고르기] 또는 [카메라로 찍기]를 누른 시점에만** 한다 (PRD 원칙 A5).
- `FetchAlbumPhotosPermissionError` / `OpenCameraPermissionError` 를 잡아 안내 화면을 띄우고, `openPermissionDialog` 로 재요청 경로를 준다.
- 거부 상태에서 기능을 계속 시도하지 않는다.

오류 (IN-5): 디코딩 실패·0바이트·지원하지 않는 mime 이면 "이 사진은 열 수 없어요"로 처리하고 홈으로 되돌린다.

### 3-3. 판정 엔진 (PR-3) — 순수 함수

```ts
type CheckStatus = 'ok' | 'over' | 'under' | 'mismatch';
type Overall = 'pass' | 'fixable' | 'blocked';

interface Verdict {
  width: CheckStatus;
  height: CheckStatus;
  bytes: CheckStatus;
  ratio: CheckStatus;
  format: CheckStatus;
  overall: Overall;
  /** blocked 사유 — 화면 문구 키 */
  blockedReason?: 'too-small';
}

function judge(src: SourceImage, preset: Preset): Verdict
```

판정 규칙:

| 항목 | 규칙 |
|---|---|
| `width` / `height` | `range` 가 있으면 그 안이면 `ok`, 크면 `over`, 작으면 `under`. 없으면 `target` 과 정확히 같을 때만 `ok` |
| `bytes` | `maxBytes` 이하면 `ok`, 넘으면 `over`. `maxBytes` 가 없으면 항상 `ok` |
| `ratio` | `|srcRatio − targetRatio| / targetRatio <= RATIO_TOL` 이면 `ok`, 아니면 `mismatch` |
| `format` | `preset.format === 'any'` 면 `ok`. `jpeg` 인데 소스가 jpeg 가 아니면 `mismatch` (변환으로 해결되므로 blocked 아님) |

`overall` 판정:
- **`blocked`**: 소스의 가로 또는 세로가 목표보다 **작을 때**. 확대하면 화질이 무너지고, 외교부가 "저해상도"를 반려 사유로 든다. **앱은 확대하지 않는다** (IN-3, PRD 원칙 C3).
- **`pass`**: 모든 항목이 `ok`.
- **`fixable`**: 그 밖의 모든 경우. 변환으로 해결 가능하다.

`blocked` 일 때 화면은 "이 사진은 기준보다 작아요. 더 큰 원본으로 다시 골라 주세요"를 보여 주고 저장 경로를 막는다.

### 3-4. 자르기 (CV-2)

목표 비율 `r = target.w / target.h` 로 **고정된** 크롭 박스를 소스 위에 올린다.

```ts
/** 소스 중앙에 최대 크기로 놓인 초기 크롭 박스 */
function initialCrop(src: SourceImage, r: number): CropBox
```

- 초기 박스: 소스에 들어가는 가장 큰 `r` 비율 사각형을 중앙 정렬.
- 사용자는 **이동과 확대·축소만** 할 수 있다. 비율은 바꿀 수 없다 (PRD 원칙 C3).
- 박스는 항상 소스 경계 안에 머문다 (클램프).
- 축소 하한: 박스의 짧은 변이 `target` 의 대응 변보다 작아지면 더 줄일 수 없다. 확대하는 결과를 막기 위함이다.
- 비율이 이미 맞으면(`ratio === 'ok'`) 자르기를 건너뛰고 전체 이미지를 크롭 박스로 삼는다.

### 3-5. 리사이즈 (CV-1)

```ts
function drawResized(src: HTMLImageElement, crop: CropBox, w: number, h: number): HTMLCanvasElement
```

- Canvas 2D `drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h)` 한 번으로 크롭과 리사이즈를 동시에 한다.
- `imageSmoothingQuality = 'high'`.
- **축소 배율이 클 때(1/2 미만) 단계적으로 줄인다.** 한 번에 크게 줄이면 계단 현상이 생긴다. 2단계씩 절반으로 줄이다 마지막에 목표 크기로 맞춘다.
- 출력 크기는 항상 `preset.target` 이다. `range` 가 있어도 권장값으로 맞춘다.

### 3-6. 용량 압축 (CV-3, CV-4) — 이분 탐색

```ts
interface CompressResult { dataUri: string; bytes: number; quality: number }

function compressToLimit(canvas: HTMLCanvasElement, maxBytes: number): CompressResult | null
```

알고리즘:
```
lo = Q_LO, hi = Q_HI
best = null
반복 Q_ITER 회:
  mid = (lo + hi) / 2
  uri = canvas.toDataURL('image/jpeg', mid)
  b   = dataUriBytes(uri)
  if b <= maxBytes:  best = {uri, b, mid};  lo = mid    // 더 좋은 품질을 노린다
  else:                                     hi = mid
best 가 null 이면 Q_LO 로 한 번 더 시도. 그래도 초과면 null 반환
```

- **목표 이하를 만족하는 가장 높은 품질**을 고른다. 무조건 낮추지 않는다.
- `maxBytes` 가 없는 프리셋은 압축을 하지 않는다. `format` 이 `jpeg` 면 품질 0.92로 한 번만 인코딩한다.
- `null`(실패) 이면 **숨기지 않고 알린다** (CV-4): "이 크기에서는 용량을 맞출 수 없어요. 더 단순한 배경으로 다시 찍어 주세요." 저장은 막지 않되 기준 초과를 명시한다.

### 3-7. 변환 파이프라인 (조립)

```
소스 → [자르기 필요?] → 크롭 박스 → drawResized(target) → [maxBytes?] → compressToLimit → OutputImage
```

- 파이프라인은 **한 번의 사용자 동작(맞추기)에서 동기적으로** 실행한다. 중간 저장 없음.
- 완료 후 소스 캔버스·이미지 참조를 끊는다 (PRD 7장 메모리 주의).
- 처리 중에는 광고를 띄우지 않는다 (PRD 원칙 D3).

### 3-8. 저장 (SV-1, SV-2)

```ts
await saveCardImage(base64WithoutHeader, fileName)   // kit share.ts
```
- 파일명: `photo-standard_<presetId>_<w>x<h>.jpg` (예: `photo-standard_passport-online_413x531.jpg`).
- kit `canSaveImage()` 가 false 면 저장 버튼을 비활성화하고 이유를 표시한다.
- 성공 시 `savedToday += 1` 후 Storage 반영.
- **결과 이미지를 앱 저장소에 남기지 않는다** (PRD 원칙 A2).

`[P1]` SV-3 공유: kit `shareLink('photo-standard', '/', 문구)` 로 **딥링크와 텍스트만** 보낸다. 결과 사진은 공유 대상이 아니다.

### 3-9. 게이트 (AD-1 ~ AD-3)

```ts
type SaveGate = 'allow' | 'gate';

function checkGate(state: AppState, now: Date): SaveGate
```

| 조건 | 결과 |
|---|---|
| 광고 미지원 또는 그룹 ID 없음 | `allow` — **광고 때문에 기능이 막히면 안 된다** (AD-3) |
| `gateOpenUntil` 이 오늘 자정 이후 | `allow` |
| `savedToday < SAVE_FREE_PER_DAY` | `allow` |
| 그 밖 | `gate` |

- `gate` 면 저장 버튼이 리워드 시트를 연다.
- `userEarnedReward` 이벤트에서만 `gateOpenUntil = 오늘 자정` 을 세운다. `dismissed` 만으로는 절대 지급하지 않는다 (kit `ads.ts` 규약).
- 해제되면 그날 자정까지 **저장 횟수 제한이 없다.**

### 3-10. 광고 (AD-4) — `@ait/kit` ads
- 배너: S01 홈 하단, S04 결과 하단. 스크롤 영역 안에 둔다.
- 리워드: 게이트 시트에서만. 프리로드는 상한에 닿았을 때 시작한다.
- 사진 선택 중·처리 중·자르기 화면(S03)에는 광고를 두지 않는다.
- 진입 즉시 광고·바텀시트 자동 오픈 금지.

### 3-11. 저장소 스키마 — `createStore('ps')`

```ts
interface PersistedV1 {
  schemaVersion: 1;
  lastPresetId: string;
  savedToday: number;
  lastSavedDate: string;        // 'YYYY-MM-DD' (로컬)
  gateOpenUntil: number | null; // epoch ms
  customPreset: { w: number; h: number; maxKb: number | null } | null;
}
```

- **이미지는 어떤 형태로도 저장하지 않는다.**
- 부트스트랩에서 `lastSavedDate !== 오늘` 이면 `savedToday = 0`, `gateOpenUntil = null`.
- 스키마 버전이 다르면 기본값으로 초기화한다.

### 3-12. 문구 규칙·린트 (PRD 원칙 B) — `scripts/copy-rules.ts`

`src/i18n/ko.json` 전체를 검사한다. 금지어에 걸리면 빌드가 실패한다.

| 규칙 | 금지 | 이유 |
|---|---|---|
| B1 | 통과, 합격, 승인, 보장, 무조건, 확실, 100% | 기관 심사 결과를 예단한다 |
| B1 | 발급돼요, 받을 수 있어요 | 같은 이유 |
| C | 배경 제거, 누끼, 보정, 리터칭 | 제공하지 않는 기능이고 반려 사유다 |

허용 예외(ALLOW): 출처 문구에 포함된 기관명 등은 화이트리스트로 통과시킨다.

### 3-13. 이벤트 로그
`eventLog` 로 남긴다: `photo_picked`(source: album|camera), `preset_selected`(id), `verdict`(overall), `crop_used`(bool), `compress_result`(ok|fail, quality), `saved`, `gate_shown`, `reward_earned`.
**이미지 자체·파일명·크기 이외의 개인 식별 정보는 남기지 않는다.**

---

## 4. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 처리 시간 | 2400px 소스 기준 변환 파이프라인 1.5초 이내(중급 안드로이드) |
| 메모리 | 동시 유지 캔버스 2개 이내. 처리 후 참조 해제 |
| 번들 | 압축 해제 기준 100MB 이하 (심사 요건). 이 앱은 데이터가 없어 여유롭다 |
| 오프라인 | 광고를 제외한 모든 기능이 오프라인에서 동작한다 |
| 접근성 | 판정 결과를 색만으로 구분하지 않는다. 아이콘·문구를 함께 쓴다 |
| 세이프 에어리어 | kit SDK 값. CSS `env()` 금지 |

---

## 5. 테스트 매트릭스

순수 함수는 전부 골든 테스트를 만든다. 기대값은 **원문 수치 리터럴**로 계산하고 구현 코드를 거치지 않는다.

| # | 대상 | 케이스 |
|---|---|---|
| T1 | `dataUriBytes` | 패딩 0·1·2개, 빈 페이로드, 헤더 없는 문자열 |
| T2 | `judge` | 프리셋 6종 × (정확히 일치 / 범위 안 / 범위 초과 / 미달 / 비율 불일치 / 용량 초과 / 형식 불일치) |
| T3 | `judge` blocked | 소스가 목표보다 작은 경우 — 확대를 시도하지 않는지 |
| T4 | `initialCrop` | 가로 긴 소스·세로 긴 소스·정사각 소스 × 목표 비율 3종. 경계 클램프 |
| T5 | `compressToLimit` | 목표 달성, 최저 품질에서도 초과(→ null), `maxBytes` 없음 |
| T6 | 프리셋 상수 | 여권 413×531·512000, 비자 600×600·245760 등 **원문 수치와 일치** |
| T7 | 게이트 | 3장 무료 → 4장째 gate → 리워드 후 allow → 자정 넘어가면 초기화 |
| T8 | 게이트 폴백 | 광고 미지원·그룹 ID 없음이면 항상 allow |
| T9 | 문구 린트 | 금지어가 들어간 문구를 넣으면 빌드가 실패하는지 |
| T10 | 출처 신선도 | `checkedAt` 이 365일을 넘으면 `check:data` 가 경고하는지 |

실기기 QR 테스트 (문서로 못 닫는 것):
- 앨범·카메라 권한 허용·거부·재요청
- `maxWidth` 실질 상한
- 저사양 기기 메모리
- 저장 결과가 실제 앨범에 규격대로 들어가는지
- 배너·리워드 노출과 복귀
- 네비게이션 바·세이프 에어리어

---

## 6. 오픈 이슈

| # | 이슈 | 닫는 주체 |
|---|---|---|
| 1 | `Device.getPhotos` 의 `maxWidth` 실질 상한 — `INPUT_MAX_WIDTH` 2400이 통하는지 | 실기기 |
| 2 | `toDataURL` 이 아주 큰 캔버스에서 실패하는 기기가 있는지 | 실기기 |
| 3 | 광고 그룹 ID 발급 (리워드·배너) | 사용자 — 콘솔 |
| 4 | 2.x 앱에 3.x 번들 첫 배포 시 추가 절차 | 콘솔 배포 시점 |

---

## 7. 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v0.1 | 2026-09-08 | 최초 작성. 판정·크롭·이분 탐색 압축 엔진, 프리셋 6종, 게이트 규칙 |
