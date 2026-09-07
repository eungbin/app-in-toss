# fx-replay — 그때 환전했다면

한국은행 ECOS가 공개한 **과거 환율 통계**를 하루씩 리플레이하며 판단을 복기하는 앱인토스 미니앱.

- 기획·설계: [PRD](docs/PRD.md) → [기능 명세](docs/FUNCTIONAL_SPEC.md) → [화면 흐름](docs/SCREEN_FLOW.md)
- 데이터 라이선스 확인 결과: [docs/DATA_VERIFICATION.md](docs/DATA_VERIFICATION.md)
- 시나리오 사실관계 검증: [docs/FACT_CHECK.md](docs/FACT_CHECK.md)
- 콘솔 등록·사전 상담 자료: [docs/SUBMISSION.md](docs/SUBMISSION.md)

## 시작하기

```bash
# 의존성은 모노레포 루트에서 설치한다 (공용 패키지 @ait/kit 심링크 포함)
(cd .. && npm install)
npm run data:dev   # 개발용 합성 시계열 생성 (ECOS 키 없이 앱 실행)
npm run dev
```

앱인토스 SDK 연동(광고·저장·네비게이션·공유)은 [`packages/ait-kit`](../packages/ait-kit)에 있다. 설계: [docs/SHARED_PACKAGE.md](../docs/SHARED_PACKAGE.md).

실데이터로 교체하려면 [ECOS](https://ecos.bok.or.kr/api/)에서 인증키를 무료로 발급받은 뒤:

```bash
cp .env.example .env   # ECOS_API_KEY 입력
npm run data:fetch
```

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (5173) |
| `npm run check` | 타입체크 + 문구 린트 + 테스트 |
| `npm run build` | check → 프로덕션 데이터 확인 → vite build → `ait build` |
| `npm run data:fetch` | ECOS 실데이터 수집 (연 1회, 인증키 필요) |
| `npm run data:dev` | 개발용 합성 데이터 생성 |
| `npm run lint:copy` | 문구 린트 (원칙 B·C 금지어) |
| `npx tsx scripts/gen-logo.ts` | 콘솔 등록용 600×600 로고 PNG 생성 |

## 구조

```
src/
  engine/     리플레이 상태머신·포지션 계산·구간 추첨 (순수 함수, 테스트 대상)
  data/       시세 JSON, 시나리오 정의, 해설 문구
  platform/   앱인토스 SDK 래퍼 (Storage, User, Ads)
  screens/    홈·플레이·결과·시나리오·기록·설정
  components/ 캔들 차트 (canvas)
scripts/      데이터 파이프라인, 문구 린트, 빌드 가드, 로고 생성
assets/       콘솔 등록용 이미지
```

## 반드시 지켜야 하는 것

세 가지는 심사 통과의 전제이며 코드로 강제된다. 근거는 [PRD 2장](docs/PRD.md).

1. **데이터 컷오프 12개월** — 번들의 마지막 날짜는 빌드일 기준 12개월 이전. `scripts/verify-data.test.ts`가 검증한다.
2. **한국은행 작성 통계만 사용** — KOSPI(한국거래소) 등 타 기관 통계는 승인 전까지 쓰지 않는다.
3. **예측·권고·경쟁 문구 금지** — `npm run lint:copy`가 금지어를 차단한다.

## 릴리즈 계획

- **v1.0** 광고 전용. 서버·토스 로그인 없음. (현재 개발 중)
- **v1.1** 토스 로그인 + 인앱결제 + 최소 서버(무료 티어, mTLS 주문 상태 조회).

## 데이터 출처

출처: ECOS(한국은행) — 원화의 대미달러·대위안 환율(731Y003), 한국은행 기준금리(722Y001).
한국은행이 작성한 통계는 출처를 표시하는 조건으로 상업적 이용이 허용된다.
본 서비스는 한국은행과 무관하며 한국은행이 보증·제휴하지 않는다.
