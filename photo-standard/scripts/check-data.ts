/**
 * 데이터 게이트 — npm run check:data
 *
 * 이 앱은 외부 API·파이프라인이 없다. 규격 수치는 번들 상수다.
 * 대신 **기관이 기준을 바꿨는데 우리가 모르는 상태**를 막아야 한다.
 * 출처 확인일이 오래되면 경고하고, 두 배로 오래되면 빌드를 막는다.
 */
import { PRESETS } from '../src/data/presets';
import { SOURCE_STALE_DAYS } from '../src/constants';

const BLOCK_DAYS = SOURCE_STALE_DAYS * 2;

const problems: string[] = [];
const warnings: string[] = [];
const now = Date.now();

for (const p of PRESETS) {
  if (p.kind === 'official') {
    if (!p.source) {
      problems.push(`${p.id}: 기관 프리셋인데 출처가 없습니다.`);
      continue;
    }
    const days = Math.floor((now - new Date(`${p.source.checkedAt}T00:00:00`).getTime()) / 86_400_000);
    if (days >= BLOCK_DAYS) {
      problems.push(
        `${p.id}: 출처 확인일이 ${days}일 지났습니다 (${p.source.checkedAt}).\n` +
          `  → ${p.source.url} 를 다시 확인하고 checkedAt 을 갱신하세요.`,
      );
    } else if (days >= SOURCE_STALE_DAYS) {
      warnings.push(`${p.id}: 출처 확인일이 ${days}일 지났습니다 (${p.source.checkedAt}).`);
    }
  } else if (p.kind === 'convention' && p.source) {
    problems.push(`${p.id}: 관행 프리셋에 출처가 붙어 있습니다. 법정 근거가 있다면 official 로 바꾸세요.`);
  }

  if (p.target.w <= 0 || p.target.h <= 0) problems.push(`${p.id}: 목표 크기가 올바르지 않습니다.`);
  if (p.range) {
    const { wMin, wMax, hMin, hMax } = p.range;
    if (wMin > wMax || hMin > hMax) problems.push(`${p.id}: 허용 범위의 최소가 최대보다 큽니다.`);
    if (p.target.w < wMin || p.target.w > wMax || p.target.h < hMin || p.target.h > hMax) {
      problems.push(`${p.id}: 목표 크기가 허용 범위 밖입니다.`);
    }
  }
}

for (const w of warnings) console.warn(`  경고 — ${w}`);
if (problems.length > 0) {
  console.error(`\ncheck:data 실패 — ${problems.length}건\n`);
  for (const p of problems) console.error(`• ${p}`);
  process.exit(1);
}
console.log(`check:data 통과 — 프리셋 ${PRESETS.length}종${warnings.length ? `, 경고 ${warnings.length}건` : ''}`);
