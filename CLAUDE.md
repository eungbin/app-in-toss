# app-in-toss

토스 앱인토스(Apps in Toss) 미니앱 모노레포. 1인 개발(React/TypeScript), 한국어 소통.

## 새 앱을 시작하거나 진행할 때
**[docs/PLAYBOOK.md](docs/PLAYBOOK.md)의 단계를 따른다.** 문서(PROJECT_CONTEXT → PRD → FUNCTIONAL_SPEC → SCREEN_FLOW)가 끝난 뒤 코드를 쓴다. 확정된 결정은 재논의하지 않는다. 확인 결과가 전제를 바꾸면 근거와 함께 "전제가 바뀌었다"로 제시한다.

## 세션 범위 (가장 중요한 규칙)
여러 Claude 세션이 같은 저장소에서 서로 다른 앱을 동시에 작업한다.
1. **세션은 담당 앱 하나를 정한다.** 사용자가 말해 주지 않으면 첫 작업 전에 어느 앱인지 확인한다.
2. **수정 범위 = 담당 앱 폴더 + `packages/ait-kit` + 루트 공통 문서(`docs/`, `CLAUDE.md`, `README.md`).** 다른 앱 폴더는 읽기만 한다. 참고할 코드는 가져와 담당 앱에 쓰고, 원본은 고치지 않는다.
3. **커밋 범위 = 수정 범위와 같다.** 반드시 경로를 지정해 스테이징한다. `git add -A`, `git add .`, `git commit -a` 금지.
   ```bash
   git add <담당 앱> packages/ait-kit docs CLAUDE.md README.md
   ```
4. 커밋 전 `git status`에 다른 앱의 변경이 보이면 **보고만 하고 스테이징하지 않는다.** 그 변경은 다른 세션의 진행 중 작업이다.
5. `packages/ait-kit`를 바꿔서 다른 앱 코드까지 고쳐야 하면 직접 고치지 말고 사용자에게 알린다. 그 앱의 세션이 처리한다.

## 저장소 규칙
- 루트가 git 루트, npm workspaces. `npm install`은 루트에서. `npm run check`로 전체 타입체크·문구 린트·테스트.
- `.env`(ECOS 인증키, 광고 ID) 커밋 금지.
- `@ait/kit`(packages/ait-kit)는 세 앱이 공유한다. 바꾸면 모든 앱의 `npm run check`가 통과해야 한다. 앱 안에 광고·저장·네비·공유·환경 코드를 다시 만들지 않는다.
- 문서는 앱 폴더 `docs/` 아래에 md로. 공통 문서만 루트 `docs/`.

## 앱
| 폴더 | 앱 | 상태 |
|---|---|---|
| `fx-replay/` | "그때 환전했다면" (라이프·콘텐츠) | 출시 준비 |
| `net-pay/` | "세후로 말해줘" (유틸리티) | 출시 준비 |
| `rent-calc/` | "월세 이거 맞아?" (유틸리티) | 문서 완료, net-pay 심사 제출 후 착수 |
| `packages/ait-kit/` | 공용 `@ait/kit` | — |

## 공통 원칙 (상세는 PLAYBOOK 0장)
v1.0 광고 전용·서버 0, 비용 0원, 카테고리는 금융 회피, 차별점 하나, 계산은 원문 대조 골든 테스트로 증명, 정산은 팝빌 역발행 매월 4영업일 승인.
