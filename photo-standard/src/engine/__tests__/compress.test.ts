/** T5 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it, vi } from 'vitest';
import { bisectQuality, type Encoded } from '../compress';
import { Q_ITER, Q_LO } from '@/constants';

/**
 * 가짜 인코더 — 품질에 선형으로 비례하는 크기를 낸다.
 * 실제 JPEG 도 품질이 오르면 커진다는 성질만 같으면 이분 탐색을 검증할 수 있다.
 */
const encoder = (bytesAtQ1: number) => (q: number): Encoded => ({
  dataUri: `data:image/jpeg;base64,q${q}`,
  bytes: Math.round(bytesAtQ1 * q),
  quality: q,
});

describe('bisectQuality', () => {
  it('목표 이하를 만족하는 가장 높은 품질을 고른다', () => {
    // q=1 일 때 1,000,000. 500,000 이하가 되려면 q <= 0.5
    const out = bisectQuality(encoder(1_000_000), 500_000);
    expect(out).not.toBeNull();
    expect(out!.bytes).toBeLessThanOrEqual(500_000);
    // 상한 0.5 에 충분히 가까워야 한다 — 무조건 낮추지 않는다
    expect(out!.quality).toBeGreaterThan(0.49);
  });

  it('품질을 무작정 최저로 낮추지 않는다', () => {
    const out = bisectQuality(encoder(1_000_000), 900_000);
    expect(out!.quality).toBeGreaterThan(0.8);
  });

  it('최고 품질에서도 여유가 있으면 그대로 쓴다', () => {
    const out = bisectQuality(encoder(100_000), 500_000);
    expect(out!.quality).toBeGreaterThan(0.9);
  });

  it('최저 품질에서도 초과하면 null — 실패를 숨기지 않는다', () => {
    // q=0.4 에서도 400,000 > 100,000
    expect(bisectQuality(encoder(1_000_000), 100_000)).toBeNull();
  });

  it('하한을 한 번 더 시도한다', () => {
    const encode = vi.fn(encoder(1_000_000));
    bisectQuality(encode, 100_000);
    // 탐색 Q_ITER 회 + 하한 재시도 1회
    expect(encode).toHaveBeenCalledTimes(Q_ITER + 1);
    expect(encode).toHaveBeenLastCalledWith(Q_LO);
  });

  it('탐색 횟수는 Q_ITER 로 고정된다 (성공 경로)', () => {
    const encode = vi.fn(encoder(1_000_000));
    bisectQuality(encode, 500_000);
    expect(encode).toHaveBeenCalledTimes(Q_ITER);
  });

  it('경계값 — 정확히 목표와 같으면 통과다', () => {
    const out = bisectQuality((q) => ({ dataUri: '', bytes: 500_000, quality: q }), 500_000);
    expect(out).not.toBeNull();
  });
});
