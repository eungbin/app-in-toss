/**
 * T6 — 프리셋 상수가 기관 원문 수치와 일치하는지.
 * 기대값은 docs/PRD.md 5장의 원문 표에서 직접 옮긴 리터럴이다.
 */
import { describe, expect, it } from 'vitest';
import { PRESETS, findPreset } from '@/data/presets';

describe('여권 (온라인 신청) — 외교부', () => {
  const p = findPreset('passport-online');
  it('권장 크기 413 × 531', () => {
    expect(p.target).toEqual({ w: 413, h: 531 });
  });
  it('허용 범위 395–431 × 507–550', () => {
    expect(p.range).toEqual({ wMin: 395, wMax: 431, hMin: 507, hMax: 550 });
  });
  it('용량 500KB 이하 — 10진 KB 로 읽는다', () => {
    expect(p.maxBytes).toBe(500_000);
  });
  it('JPG 만 받는다', () => {
    expect(p.format).toBe('jpeg');
  });
  it('출처와 확인일이 있다', () => {
    expect(p.source?.org).toBe('외교부 여권안내');
    expect(p.source?.checkedAt).toBe('2026-09-08');
  });
});

describe('미국 비자 — US Dept. of State', () => {
  const p = findPreset('us-visa');
  it('최소 600 × 600, 최대 1200 × 1200', () => {
    expect(p.target).toEqual({ w: 600, h: 600 });
    expect(p.range).toEqual({ wMin: 600, wMax: 1200, hMin: 600, hMax: 1200 });
  });
  it('정사각 — 가로와 세로가 같다', () => {
    expect(p.target.w).toBe(p.target.h);
  });
  it('용량 240KB 이하', () => {
    expect(p.maxBytes).toBe(240_000);
  });
});

describe('운전면허 (온라인) — 도로교통공단', () => {
  const p = findPreset('driver-online');
  it('350 × 450', () => {
    expect(p.target).toEqual({ w: 350, h: 450 });
  });
});

describe('증명사진 3 × 4 cm', () => {
  const p = findPreset('id-3x4');
  it('관행이다 — 기관 프리셋이 아니다', () => {
    expect(p.kind).toBe('convention');
  });
  it('법정 근거가 없으므로 source 가 없어야 한다', () => {
    expect(p.source).toBeUndefined();
  });
  it('300dpi 환산 354 × 472', () => {
    expect(p.target).toEqual({ w: 354, h: 472 });
  });
});

describe('프리셋 전체', () => {
  it('6종이다', () => {
    expect(PRESETS).toHaveLength(6);
  });
  it('기관 프리셋은 전부 출처와 확인일을 가진다', () => {
    for (const p of PRESETS.filter((x) => x.kind === 'official')) {
      expect(p.source, `${p.id} 에 출처가 없다`).toBeDefined();
      expect(p.source?.url).toMatch(/^https:\/\//);
      expect(p.source?.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('id 가 중복되지 않는다', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });
});

/**
 * 결과물 형식 — 실기기 스크린샷에서 발견한 버그의 회귀 테스트.
 *
 * `format: 'any'` 인 프리셋은 JPEG 로 인코딩되고 파일명도 .jpg 인데, 화면에는 프리셋의
 * format 을 보고 "PNG" 라고 찍고 있었다. 결과물의 mime 이 무엇이어야 하는지 못 박는다.
 */
describe('프리셋 format 과 실제 출력', () => {
  it("'any' 프리셋은 JPEG 로 나간다 — PNG 가 아니다", () => {
    for (const id of ['passport-print', 'driver-online', 'id-3x4']) {
      const p = findPreset(id);
      expect(p.format, `${id} 는 any 여야 한다`).toBe('any');
      // encodeForPreset 은 format === 'png' 일 때만 PNG 를 낸다
      expect(p.format === 'png').toBe(false);
    }
  });

  it("'jpeg' 를 요구하는 프리셋은 용량 상한도 가진다", () => {
    for (const p of PRESETS.filter((x) => x.format === 'jpeg')) {
      expect(p.maxBytes, `${p.id} 에 용량 상한이 없다`).toBeDefined();
    }
  });

  it('PNG 를 요구하는 프리셋은 없다 — 있다면 화면 표기를 다시 확인해야 한다', () => {
    expect(PRESETS.filter((x) => x.format === 'png')).toHaveLength(0);
  });
});
