/** 수급 자격 판정 — 고용보험법 제40조·제58조 (§3-6)
 *
 * 결과를 단정하지 않는다. 자격은 직업안정기관의 장이 인정하고(법 제40조①),
 * 이 앱은 법령 수치에 따른 참고 판정만 한다(docs/PRD.md 2-2).
 */
import legal from '../data/legal.json';
import type { Input, Verdict } from '../types';

/**
 * 재직 일수로 추정한 피보험 단위기간은 **실제보다 크거나 같다** — 단위기간은 보수 지급의
 * 기초가 된 날만 세므로 무급휴직·결근이 있으면 줄어든다. 그래서 위험한 구간은 180일
 * 미만이 아니라 **180일을 조금 넘긴 구간**이다. 그 구간은 단정하지 않고 확인을 요청한다.
 */
export const NEAR_THRESHOLD_UPTO = 210;

export interface Eligibility {
  verdict: Verdict;
  reasons: string[];
}

export function eligibility(input: Input, tenureDays: number, today: string): Eligibility {
  const reasons: string[] = [];
  let verdict: Verdict = 'likely';

  const worsen = (v: Verdict): void => {
    if (v === 'unlikely' || (v === 'check' && verdict === 'likely')) verdict = v;
  };

  // 제40조①1 — 피보험 단위기간
  if (tenureDays < legal.insuredDaysMin) {
    reasons.push('insuredShort');
    worsen('unlikely');
  } else if (tenureDays < NEAR_THRESHOLD_UPTO) {
    reasons.push('insuredNear');
    worsen('check');
  }

  // 제40조①3, 제58조 — 이직 사유
  if (input.reason === 'voluntary') {
    reasons.push('voluntaryNotJustified');
    worsen('unlikely');
  } else if (input.reason === 'voluntaryJustified') {
    reasons.push('justifiedNeedsProof');
    worsen('check');
  }

  // 아직 그만두지 않았다면 확정된 사실이 아니다
  if (input.quitDate > today) {
    reasons.push('futureQuitDate');
    worsen('check');
  }

  return { verdict, reasons };
}
