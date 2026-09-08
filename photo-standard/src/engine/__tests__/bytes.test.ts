/** T1 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it } from 'vitest';
import { dataUriBytes, dataUriMime, formatBytes } from '../bytes';

/** base64 를 거치지 않는 경로로 만든 기대값 — 구현을 검증하는 쪽이 구현을 쓰면 안 된다 */
const b64 = (n: number): string => Buffer.alloc(n, 7).toString('base64');

describe('dataUriBytes', () => {
  it('패딩이 없는 경우 (3의 배수)', () => {
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(3)}`)).toBe(3);
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(300)}`)).toBe(300);
  });

  it('패딩 2개 (3n+1 바이트)', () => {
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(1)}`)).toBe(1);
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(301)}`)).toBe(301);
  });

  it('패딩 1개 (3n+2 바이트)', () => {
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(2)}`)).toBe(2);
    expect(dataUriBytes(`data:image/jpeg;base64,${b64(302)}`)).toBe(302);
  });

  it('헤더가 없어도 페이로드로 읽는다', () => {
    expect(dataUriBytes(b64(128))).toBe(128);
  });

  it('빈 페이로드는 0', () => {
    expect(dataUriBytes('data:image/jpeg;base64,')).toBe(0);
    expect(dataUriBytes('')).toBe(0);
  });

  it('문자열 길이를 그대로 쓰면 안 된다는 것을 고정한다', () => {
    const uri = `data:image/jpeg;base64,${b64(3000)}`;
    const payloadLen = uri.length - uri.indexOf(',') - 1;
    expect(payloadLen).toBe(4000); // base64 는 3 → 4 로 늘린다
    expect(dataUriBytes(uri)).toBe(3000);
  });
});

describe('dataUriMime', () => {
  it('mime 을 읽는다', () => {
    expect(dataUriMime('data:image/jpeg;base64,AAAA')).toBe('image/jpeg');
    expect(dataUriMime('data:image/png;base64,AAAA')).toBe('image/png');
  });
  it('헤더가 없으면 빈 문자열', () => {
    expect(dataUriMime('AAAA')).toBe('');
  });
});

describe('formatBytes', () => {
  it('기관 표기와 같은 1000 단위', () => {
    expect(formatBytes(999)).toBe('999B');
    expect(formatBytes(500_000)).toBe('500KB');
    expect(formatBytes(1_800_000)).toBe('1.8MB');
  });
});
