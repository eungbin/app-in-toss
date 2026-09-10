# app-in-toss

토스 앱인토스(Apps in Toss) 미니앱 모노레포. 1인 개발, 문서 기반(PRD → 기능 명세 → 화면 흐름 → 개발).

| 폴더 | 내용 |
|---|---|
| `fx-replay/` | "그때 환전했다면" — 과거 환율 리플레이 판단 복기 (라이프·콘텐츠) |
| `net-pay/` | "세후로 말해줘" — 실수령 역산 월급 계산기 (유틸리티) |
| `rent-calc/` | "월세 이거 맞아?" — 전월세 법정 상한 판정 계산기 (유틸리티). 개발 중 (W1·W2 완료, W3 출시 준비) |
| `photo-standard/` | "사진규격" — 여권·비자 등 규격 판정·맞춤 도구 (유틸리티). 소스 유실 복구 완료 |
| `packages/ait-kit/` | 공용 패키지 `@ait/kit`: 앱인토스 SDK 연동(광고·저장·네비게이션·공유·환경)과 빌드 스크립트(문구 린트·PNG) |
| `docs/` | 앱 공통 문서 — [플레이북](docs/PLAYBOOK.md)(아이디어→출시·운영 절차), [공용 패키지 설계](docs/SHARED_PACKAGE.md), [정산 절차](docs/SETTLEMENT.md) |

새 앱은 [PLAYBOOK](docs/PLAYBOOK.md)의 단계를 따른다.
**콘솔에 출시돼 있는데 소스가 없는 앱은 [RECOVERY.md](docs/RECOVERY.md)를 먼저 읽는다.**

## 시작하기

```bash
npm install          # 루트에서 한 번. 워크스페이스 전체 의존성 + @ait/kit 심링크
npm run status       # 앱별 진행 상태. 파일에서 파생한다 — 작업 시작 전에 한 번
npm run check        # 모든 앱의 타입체크·문구 린트·테스트
```

각 앱은 자기 폴더에서 독립적으로 빌드한다(`npm run build` → `.ait` 아티팩트). **업로드는 `npm run deploy`**(`ait deploy`)가 따로 한다. 공용 코드는 npm workspaces로 공유한다.

`npm run status`는 상태를 문서에서 읽지 않고 파일에서 파생한다 — 광고 ID가 테스트/실 ID인지, `deploy` 스크립트가 있는지, 번들 스캔·세이프 에어리어가 kit 판인지, 앱별 마지막 커밋. 파생할 수 없는 콘솔·심사·정산 상태만 `<앱>/STATUS.md`에 적는다.

## 작업 규칙

새 앱은 [docs/PLAYBOOK.md](docs/PLAYBOOK.md)의 단계를 따른다. 여러 세션이 병행 작업하므로 **세션은 담당 앱 + `packages/ait-kit` + 공통 문서만 수정·커밋**하고, 스테이징은 경로를 지정한다(`git add -A` 금지). 상세는 [CLAUDE.md](CLAUDE.md).
