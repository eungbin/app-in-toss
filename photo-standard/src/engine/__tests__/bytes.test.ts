/** T1 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it } from 'vitest';
import { dataUriBytes, dataUriMime, formatBytes, sniffMime, toDataUri } from '../bytes';

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

/**
 * SDK 가 준 값을 데이터 URI 로 정규화 — 실기기에서 실제로 터진 버그의 회귀 테스트.
 *
 * `ImageResponse.dataUri` 는 이름과 달리 헤더 없는 순수 base64 였다(안드로이드 2026-09-09).
 * 이름을 믿고 img.src 에 넣어 앨범·카메라가 둘 다 "이 사진은 열 수 없어요" 로 죽었다.
 */
describe('sniffMime — base64 앞머리로 형식 판별', () => {
  /** 매직 바이트를 base64 로 만들어 기대값을 구현과 다른 경로로 얻는다 */
  const b64 = (...bytes: number[]): string => Buffer.from(bytes).toString('base64');

  it('JPEG (FF D8 FF) 는 /9j/ 로 시작한다', () => {
    const head = b64(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49);
    expect(head.startsWith('/9j/')).toBe(true);
    expect(sniffMime(head)).toBe('image/jpeg');
  });

  it('PNG (89 50 4E 47)', () => {
    expect(sniffMime(b64(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0))).toBe('image/png');
  });

  it('GIF (47 49 46 38)', () => {
    expect(sniffMime(b64(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0))).toBe('image/gif');
  });

  it('WEBP (RIFF)', () => {
    expect(sniffMime(b64(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57))).toBe('image/webp');
  });

  it('모르는 형식은 빈 문자열', () => {
    expect(sniffMime(b64(0x00, 0x01, 0x02, 0x03))).toBe('');
  });
});

describe('toDataUri', () => {
  const jpegPayload = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString('base64');

  it('헤더 없는 base64 에 헤더를 붙인다 — 실기기가 이 모양으로 준다', () => {
    const out = toDataUri(jpegPayload);
    expect(out).toBe(`data:image/jpeg;base64,${jpegPayload}`);
    expect(out.startsWith('data:')).toBe(true);
  });

  it('이미 데이터 URI 면 그대로 둔다', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(toDataUri(uri)).toBe(uri);
  });

  it('형식을 못 알아봐도 JPEG 로 시도한다', () => {
    const unknown = Buffer.from([0x00, 0x01, 0x02]).toString('base64');
    expect(toDataUri(unknown)).toBe(`data:image/jpeg;base64,${unknown}`);
  });

  it('정규화한 뒤에는 mime 과 바이트를 읽을 수 있다', () => {
    const out = toDataUri(jpegPayload);
    expect(dataUriMime(out)).toBe('image/jpeg');
    expect(dataUriBytes(out)).toBe(6);
  });

  it('정규화 전에는 mime 을 읽지 못한다 — 형식 판정이 어긋나던 원인', () => {
    expect(dataUriMime(jpegPayload)).toBe('');
  });
});
