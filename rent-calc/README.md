# 월세 이거 맞아? (rent-calc)

갱신이나 계약 기간 중에 집주인이 제안한 보증금·월세가 **주택임대차보호법의 법정 상한 안인지 판정**하는 앱인토스 미니앱. 전세↔월세 환산, 중개보수 상한, 임대차 신고 대상 판정을 함께 제공한다.

문서는 [docs/](docs/) — [PRD](docs/PRD.md) · [기능 명세](docs/FUNCTIONAL_SPEC.md) · [화면 흐름](docs/SCREEN_FLOW.md) · [계산 검증](docs/FACT_CHECK.md) · [제출 자료](docs/SUBMISSION.md)

## 개발

```bash
npm install            # 루트에서 한 번
npm run dev            # localhost:5175
npm run check          # 타입체크 · 문구 린트 · 테스트
```

## 데이터

런타임에 외부를 호출하지 않는다. 전부 번들에 정적으로 들어간다.

```bash
npm run data:fetch     # ECOS 기준금리(722Y001) + 법령 별표 1·2 원문
npm run data:build     # 별표 평문 → src/data/brokerage.json
npm run check:data     # 기준금리 신선도 · 별표 구간 연속성 · legal.json
```

| 파일 | 출처 | 갱신 |
|---|---|---|
| `src/data/baserate.json` | 한국은행 ECOS 722Y001 (변동 시점만) | 금통위 결정 후. 90일 지나면 화면 안내, 180일이면 빌드 차단 |
| `src/data/brokerage.json` | 공인중개사법 시행규칙 별표 1·2 | 개정 시 (2021-10-19 이후 없음) |
| `src/data/legal.json` | 주임법·시행령, 거래신고법 조문 상수 | 개정 시 (수동). 값은 `src/constants.ts`와 일치를 테스트로 고정 |

`.env`에 `ECOS_API_KEY`가 필요하다(`.env.example` 참고). 커밋하지 않는다.

## 판정 규칙

- 전환율 상한 = min(10%, 기준금리 + 2%) — 주임법 제7조의2, 시행령 제9조
- 증액 상한 = 환산보증금의 5% — 제7조 제2항. 환산보증금 = 보증금 + 월세 × 12 ÷ 전환율
- **이 상한은 갱신·기간 중 변경에만 적용된다.** 신규 계약에는 없다 — 첫 화면에서 모드를 먼저 고르게 한다
- 중개보수 = 거래금액 × 상한요율, 한도액 이내. 임대차 거래금액 = 보증금 + 월세 × 100 (5천만 미만이면 × 70)
- 임대차 신고 = 보증금 6천만 초과 또는 월세 30만 초과, 계약 후 30일

계산 결과는 한국부동산원·렌트홈·마이홈포털 공공 계산기와 대조해 [골든 테스트](scripts/golden.test.ts)로 고정했다. 근거는 [FACT_CHECK](docs/FACT_CHECK.md).

## 빌드

```bash
npm run build          # QR 테스트용. 테스트 광고 ID 허용
npm run build:release  # 출시용. 실 광고 ID·이메일 요구 + 번들 문자열 검사
```
