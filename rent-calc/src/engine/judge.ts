/**
 * 갱신·기간 중 변경 판정 — docs/FUNCTIONAL_SPEC.md §3-3
 *
 * 인상률은 **환산보증금** 기준이다. 보증금과 월세가 함께 바뀌는 제안을 하나의
 * 숫자로 비교하려면 월세를 보증금으로 환산해 더해야 한다.
 * 이 방식은 국토교통부 렌트홈 임대료 계산기와 같고, 국토부·법무부 해설집(2020-08)
 * 전월세 전환 예시와도 일치한다. 근거는 docs/FACT_CHECK.md 1장·3장.
 *
 * 적용 범위 주의: 5% 상한과 전환율 상한은 **갱신(계약갱신요구권 행사)과 존속 중
 * 변경**에만 걸린다. 신규 계약에는 상한이 없다 — 그래서 mode를 먼저 받는다.
 */
import { eqToleranceFor, INCREASE_CAP, INCREASE_INTERVAL_DAYS } from '@/constants';
import type { ConvertResult, JudgeInput, JudgeResult, Terms } from '@/types';
import { depositToRent, equivalentDeposit, legalConversionRate, rentToDeposit } from './rate';
import { roundWon } from './money';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidTerms(t: Terms): boolean {
  return (
    Number.isInteger(t.deposit) && Number.isInteger(t.rent) && t.deposit >= 0 && t.rent >= 0
  );
}

/** 직전 계약·증액일로부터 1년이 지나지 않았는지 */
export function withinOneYearOf(lastChangeDate: string, now: Date = new Date()): boolean {
  const last = new Date(`${lastChangeDate}T00:00:00`);
  if (Number.isNaN(last.getTime())) return false;
  const days = (now.getTime() - last.getTime()) / DAY_MS;
  return days >= 0 && days < INCREASE_INTERVAL_DAYS;
}

/** 항목별 단순 인상률. 분모가 0이면 null */
function itemRate(before: number, after: number): number | null {
  if (before === 0) return null;
  return after / before - 1;
}

export function judgeRenewal(input: JudgeInput, now: Date = new Date()): JudgeResult {
  const { current, proposed, baseRate } = input;
  const rate = legalConversionRate(baseRate);

  const currentEq = equivalentDeposit(current, rate);
  const proposedEq = equivalentDeposit(proposed, rate);
  const increase = proposedEq / currentEq - 1;
  const allowedEq = currentEq * (1 + INCREASE_CAP);

  // 표시 해상도(월세 1원)보다 작은 초과는 판정하지 않는다.
  // 공공 계산기가 알려 준 최대 월세를 그대로 넣은 케이스(FACT_CHECK P9)가 여기에 걸린다.
  const rawExcess = proposedEq - allowedEq;
  const excessEq = rawExcess < eqToleranceFor(rate) ? 0 : rawExcess;

  const maxRentRaw = ((allowedEq - proposed.deposit) * rate) / 12;
  const maxDepositRaw = allowedEq - (proposed.rent * 12) / rate;

  return {
    mode: 'renew',
    verdict: excessEq > 0 ? 'exceeds' : 'within',
    legalRate: rate,
    baseRate,
    currentEq: roundWon(currentEq),
    proposedEq: roundWon(proposedEq),
    increase,
    excessEq: roundWon(excessEq),
    excessAsRent: roundWon((excessEq * rate) / 12),
    excessAsDeposit: roundWon(excessEq),
    maxRentForProposedDeposit: maxRentRaw < 0 ? null : roundWon(maxRentRaw),
    maxDepositForProposedRent: maxDepositRaw < 0 ? null : roundWon(maxDepositRaw),
    itemIncrease: {
      deposit: itemRate(current.deposit, proposed.deposit),
      rent: itemRate(current.rent, proposed.rent),
    },
    withinOneYear:
      input.lastChangeDate === undefined ? null : withinOneYearOf(input.lastChangeDate, now),
  };
}

/**
 * 신규 계약 — 판정하지 않고 환산 참고치만 낸다.
 * 화면은 이 결과에 "법정 상한이 없어요"를 붙이고 판정 배지·인상률을 렌더하지 않는다.
 */
export function convertOnly(proposed: Terms, baseRate: number): ConvertResult {
  const rate = legalConversionRate(baseRate);
  return {
    mode: 'new',
    verdict: null,
    legalRate: rate,
    baseRate,
    rentIfAllDeposit: depositToRent(proposed.deposit, rate),
    depositIfAllRent: proposed.rent === 0 ? 0 : rentToDeposit(proposed.rent, rate),
  };
}
