# app-in-toss

토스 앱인토스(Apps in Toss) 미니앱 모노레포. 1인 개발, 문서 기반(PRD → 기능 명세 → 화면 흐름 → 개발).

| 폴더 | 내용 |
|---|---|
| `fx-replay/` | "그때 환전했다면" — 과거 환율 리플레이 판단 복기 (라이프·콘텐츠) |
| `net-pay/` | "세후로 말해줘" — 실수령 역산 월급 계산기 (유틸리티) |
| `rent-calc/` | "월세 이거 맞아?" — 전월세 법정 상한 판정 계산기 (유틸리티). 문서 완료, net-pay 심사 제출 후 개발 착수 |
| `packages/ait-kit/` | 공용 패키지 `@ait/kit`: 앱인토스 SDK 연동(광고·저장·네비게이션·공유·환경)과 빌드 스크립트(문구 린트·PNG) |
| `docs/` | 앱 공통 문서 — [플레이북](docs/PLAYBOOK.md)(아이디어→출시·운영 절차), [공용 패키지 설계](docs/SHARED_PACKAGE.md), [정산 절차](docs/SETTLEMENT.md) |

## 시작하기

```bash
npm install          # 루트에서 한 번. 워크스페이스 전체 의존성 + @ait/kit 심링크
npm run check        # 모든 앱의 타입체크·문구 린트·테스트
```

각 앱은 자기 폴더에서 독립적으로 빌드·배포한다(`npm run build` → `ait build`). 공용 코드는 npm workspaces로 공유한다.

## 작업 규칙

새 앱은 [docs/PLAYBOOK.md](docs/PLAYBOOK.md)의 단계를 따른다. 여러 세션이 병행 작업하므로 **세션은 담당 앱 + `packages/ait-kit` + 공통 문서만 수정·커밋**하고, 스테이징은 경로를 지정한다(`git add -A` 금지). 상세는 [CLAUDE.md](CLAUDE.md).
