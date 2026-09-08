/**
 * 규격 프리셋 — docs/FUNCTIONAL_SPEC.md §1-1, docs/PRD.md 5장
 *
 * 수치는 전부 **기관 원문에 적힌 값 그대로**다. 환산식으로 만들지 않는다.
 * 외교부가 413 × 531 을 직접 명시했으므로 기준은 환산이 아니라 그 수치다.
 *
 * maxBytes 는 바이트다. 기관이 "500KB" 라고만 쓰고 10진(500,000)인지 2진(512,000)인지
 * 밝히지 않으므로 **작은 쪽인 10진으로 읽는다.** 그러면 어느 해석에서도 상한을 넘지 않는다.
 */
import type { Preset } from '@/types';

/** KB 표기를 바이트로. 기관 표기는 10진 KB 로 읽는다(더 엄격한 쪽) */
const kb = (n: number): number => n * 1000;

export const PRESETS: Preset[] = [
  {
    id: 'passport-online',
    label: '여권 (온라인 신청)',
    kind: 'official',
    target: { w: 413, h: 531 },
    range: { wMin: 395, wMax: 431, hMin: 507, hMax: 550 },
    maxBytes: kb(500),
    format: 'jpeg',
    physical: { wMm: 35, hMm: 45 },
    source: {
      org: '외교부 여권안내',
      url: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=12',
      checkedAt: '2026-09-08',
    },
    notes: ['notes.whiteBg', 'notes.within6m', 'notes.noEdit'],
  },
  {
    id: 'passport-print',
    label: '여권 (인화용)',
    kind: 'official',
    target: { w: 413, h: 531 },
    format: 'any',
    physical: { wMm: 35, hMm: 45 },
    source: {
      org: '외교부 여권안내',
      url: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=32',
      checkedAt: '2026-09-08',
    },
    notes: ['notes.whiteBg', 'notes.within6m', 'notes.headLength'],
  },
  {
    id: 'driver-online',
    label: '운전면허 (온라인)',
    kind: 'official',
    target: { w: 350, h: 450 },
    format: 'any',
    physical: { wMm: 35, hMm: 45 },
    source: {
      org: '도로교통공단',
      url: 'https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111',
      checkedAt: '2026-09-08',
    },
    notes: ['notes.whiteBg', 'notes.within6m'],
  },
  {
    id: 'us-visa',
    label: '미국 비자',
    kind: 'official',
    target: { w: 600, h: 600 },
    range: { wMin: 600, wMax: 1200, hMin: 600, hMax: 1200 },
    maxBytes: kb(240),
    format: 'jpeg',
    source: {
      org: 'U.S. Department of State',
      url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html',
      checkedAt: '2026-09-08',
    },
    notes: ['notes.square', 'notes.whiteBg', 'notes.within6m'],
  },
  {
    // 법정 근거가 없다. 화면에서 기관 프리셋과 구분해 표기한다 — docs/PRD.md 2-2 B5
    id: 'id-3x4',
    label: '증명사진 3 × 4 cm',
    kind: 'convention',
    target: { w: 354, h: 472 },
    format: 'any',
    physical: { wMm: 30, hMm: 40 },
  },
  {
    id: 'custom',
    label: '직접 입력',
    kind: 'custom',
    target: { w: 413, h: 531 },
    format: 'any',
  },
];

export const DEFAULT_PRESET_ID = 'passport-online';

export function findPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}

/** 물리 규격(mm)을 dpi 기준 픽셀로. "직접 입력"에서 사용자가 cm 로 넣을 때만 쓴다 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}
