/** 타입 — docs/FUNCTIONAL_SPEC.md §1 */

export type PresetKind = 'official' | 'convention' | 'custom';
export type OutFormat = 'jpeg' | 'png' | 'any';

export interface PresetSource {
  org: string;
  url: string;
  /** YYYY-MM-DD */
  checkedAt: string;
}

export interface Preset {
  id: string;
  label: string;
  kind: PresetKind;
  /** 목표 픽셀 — 변환의 결과 크기 */
  target: { w: number; h: number };
  /** 허용 범위. 없으면 target 정확히 일치가 기준 */
  range?: { wMin: number; wMax: number; hMin: number; hMax: number };
  /** 파일 용량 상한(바이트). 없으면 제한 없음 */
  maxBytes?: number;
  format: OutFormat;
  /** 물리 규격 병기용. 화면 표시에만 쓴다 */
  physical?: { wMm: number; hMm: number };
  /** 기관 프리셋만 가진다 */
  source?: PresetSource;
  /** 앱이 처리하지 않고 알리기만 하는 조건. i18n 키 */
  notes?: string[];
}

export interface SourceImage {
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
}

/** 소스 이미지 좌표계(px) */
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OutputImage {
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
  /** JPEG 압축을 거쳤으면 최종 품질, 아니면 null */
  quality: number | null;
  /** maxBytes 를 못 맞췄으면 true — 숨기지 않고 알린다 */
  overLimit: boolean;
}

export type CheckStatus = 'ok' | 'over' | 'under' | 'mismatch';
export type Overall = 'pass' | 'fixable' | 'blocked';

export interface Verdict {
  width: CheckStatus;
  height: CheckStatus;
  bytes: CheckStatus;
  ratio: CheckStatus;
  format: CheckStatus;
  overall: Overall;
  blockedReason?: 'too-small';
}

export type SaveGate = 'allow' | 'gate';
