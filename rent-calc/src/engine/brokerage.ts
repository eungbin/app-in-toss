/**
 * 중개보수 상한 — docs/FUNCTIONAL_SPEC.md §3-5
 *
 * 공인중개사법 시행규칙 제20조와 별표 1(주택)·별표 2(주거용 오피스텔).
 * 요율은 **상한**이고 실제 금액은 의뢰인과 협의로 정한다. 부가세는 별도다.
 *
 * 16개 시·도 조례를 마이홈포털 계산기로 전부 확인한 결과 별표 1과 같아서
 * 지역 입력은 두지 않는다(docs/FACT_CHECK.md 4-1).
 */
import {
  OFFICETEL_OTHER_RATIO,
  RENT_MULTIPLIER,
  RENT_MULTIPLIER_THRESHOLD,
  RENT_MULTIPLIER_UNDER_50M,
} from '@/constants';
import type { BrokerageBand, BrokerageFile, BrokerageInput, BrokerageResult } from '@/types';
import { floorWon } from './money';

/**
 * 임대차 거래금액.
 * 보증금 + 월세 × 100. 단 그 값이 5천만 원 **미만**이면 보증금 + 월세 × 70으로 다시 계산한다.
 */
export function transactionAmount(
  input: Pick<BrokerageInput, 'kind' | 'deposit' | 'rent'>,
): { tx: number; usedMultiplier: number } {
  if (input.kind === 'sale') return { tx: input.deposit, usedMultiplier: 0 };
  if (input.rent === 0) return { tx: input.deposit, usedMultiplier: 0 };

  const byHundred = input.deposit + input.rent * RENT_MULTIPLIER;
  if (byHundred >= RENT_MULTIPLIER_THRESHOLD) {
    return { tx: byHundred, usedMultiplier: RENT_MULTIPLIER };
  }
  return {
    tx: input.deposit + input.rent * RENT_MULTIPLIER_UNDER_50M,
    usedMultiplier: RENT_MULTIPLIER_UNDER_50M,
  };
}

function findBand(bands: BrokerageBand[], kind: BrokerageInput['kind'], tx: number): BrokerageBand {
  const band = bands.find(
    (b) => b.kind === kind && tx >= b.lo && (b.hi === null || tx < b.hi),
  );
  if (!band) throw new Error(`거래금액 ${tx}원에 맞는 별표 구간이 없습니다`);
  return band;
}

export function brokerageCap(input: BrokerageInput, data: BrokerageFile): BrokerageResult {
  const { tx, usedMultiplier } = transactionAmount(input);

  if (input.officetel === 'other') {
    // 요건을 벗어난 오피스텔·그 밖의 부동산: 0.9% 이내 협의
    const rawFee = floorWon(tx * OFFICETEL_OTHER_RATIO);
    return {
      tx,
      usedMultiplier,
      ratio: OFFICETEL_OTHER_RATIO,
      cap: null,
      fee: rawFee,
      rawFee,
      negotiable: true,
    };
  }

  if (input.officetel === 'qualified') {
    const ratio = data.officetel[input.kind];
    const rawFee = floorWon(tx * ratio);
    return { tx, usedMultiplier, ratio, cap: null, fee: rawFee, rawFee, negotiable: false };
  }

  const band = findBand(data.housing, input.kind, tx);
  const rawFee = floorWon(tx * band.ratio);
  return {
    tx,
    usedMultiplier,
    ratio: band.ratio,
    cap: band.cap,
    fee: band.cap === null ? rawFee : Math.min(rawFee, band.cap),
    rawFee,
    negotiable: false,
  };
}
