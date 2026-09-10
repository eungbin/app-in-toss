/**
 * 사진 입력 — docs/FUNCTIONAL_SPEC.md §3-2
 *
 * 권한은 사용자가 그 버튼을 누른 시점에만 요청한다(docs/PRD.md 2-1 A5).
 * 앱 진입 즉시 요청하지 않는다.
 */
import { Device } from '@apps-in-toss/web-framework';
import { INPUT_MAX_WIDTH } from '@/constants';
import { dataUriBytes, dataUriMime, toDataUri } from './bytes';
import { loadImage } from './canvas';
import type { SourceImage } from '@/types';

export type PickError = 'permission' | 'decode' | 'cancelled' | 'unsupported';

export class PhotoError extends Error {
  /** 진단용 상세. 화면에 띄우는 것은 VITE_DIAG 빌드에서만이다(App.tsx) */
  constructor(readonly kind: PickError, readonly detail?: string) {
    super(kind);
  }
}

/** SDK 오류에서 사람이 읽을 단서를 뽑는다. 값 자체는 로그로 남기지 않는다 */
function describe(e: unknown): string {
  const err = e as { name?: string; message?: string; code?: string | number };
  const name = err?.name ?? (e as object)?.constructor?.name ?? 'unknown';
  const msg = String(err?.message ?? '').slice(0, 80);
  const code = err?.code === undefined ? '' : ` code=${String(err.code)}`;
  return `${name}${code}${msg ? ` · ${msg}` : ''}`;
}

/** dataUri 가 어떤 모양인지. 사진 내용은 담지 않고 앞머리와 길이만 본다 */
function shapeOf(uri: string): string {
  const head = uri.slice(0, 32).replace(/\s+/g, '');
  return `${head}… len=${uri.length}`;
}

/** SDK 오류가 권한 문제인지 가려낸다. 오류 클래스 이름이 `...PermissionError` 다. */
function isPermissionError(e: unknown): boolean {
  const name = (e as { name?: string; constructor?: { name?: string } })?.name
    ?? (e as { constructor?: { name?: string } })?.constructor?.name
    ?? '';
  return /permission/i.test(String(name)) || /permission/i.test(String((e as Error)?.message ?? ''));
}

/**
 * SDK 가 준 값을 데이터 URI 로 정규화하고, 실제로 디코딩해 크기를 잰다.
 *
 * `ImageResponse.dataUri` 는 **이름과 달리 데이터 URI 가 아니다.** 안드로이드 실기기에서
 * `/9j/4AAQSkZJ…` — 헤더 없는 순수 base64 로 왔다(2026-09-09). 이름을 믿고 그대로
 * `img.src` 에 넣었더니 상대 경로로 해석돼 앨범·카메라 둘 다 "이 사진은 열 수 없어요" 가 났다.
 * 크기도 SDK 값이 아니라 디코딩해서 직접 잰다.
 */
async function measure(raw: string): Promise<SourceImage> {
  const dataUri = toDataUri(raw);
  const img = await loadImage(dataUri).catch(() => {
    throw new PhotoError('decode', `loadImage 실패 · ${shapeOf(dataUri)}`);
  });
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  img.src = '';
  if (width === 0 || height === 0) throw new PhotoError('decode', `크기 0 · ${shapeOf(dataUri)}`);
  return {
    dataUri,
    width,
    height,
    bytes: dataUriBytes(dataUri),
    mime: dataUriMime(dataUri),
  };
}

export async function pickFromAlbum(): Promise<SourceImage> {
  let items: { dataUri: string }[];
  try {
    items = await Device.getPhotos({ maxCount: 1, maxWidth: INPUT_MAX_WIDTH, base64: true });
  } catch (e) {
    throw new PhotoError(
      isPermissionError(e) ? 'permission' : 'unsupported',
      `getPhotos(maxWidth=${INPUT_MAX_WIDTH}) · ${describe(e)}`,
    );
  }
  const first = items[0];
  // 빈 배열은 사용자가 취소한 것이다. 오류가 아니다.
  if (!first) throw new PhotoError('cancelled');
  return measure(first.dataUri);
}

export async function shootWithCamera(): Promise<SourceImage> {
  let shot: { dataUri: string };
  try {
    shot = await Device.openCamera({ maxWidth: INPUT_MAX_WIDTH, base64: true });
  } catch (e) {
    throw new PhotoError(
      isPermissionError(e) ? 'permission' : 'unsupported',
      `openCamera(maxWidth=${INPUT_MAX_WIDTH}) · ${describe(e)}`,
    );
  }
  if (!shot?.dataUri) throw new PhotoError('cancelled');
  return measure(shot.dataUri);
}

/** 권한 설정 화면을 연다. 거부 상태에서 기능을 계속 시도하지 않는다. */
export async function openPermissionSettings(kind: 'photos' | 'camera'): Promise<void> {
  try {
    // 두 함수 모두 PermissionFunctionWithDialog 라 openPermissionDialog 를 가진다
    await (kind === 'photos' ? Device.getPhotos : Device.openCamera).openPermissionDialog();
  } catch {
    // 설정을 열지 못해도 앱이 죽지는 않는다
  }
}

/**
 * 개발 전용 — 브라우저에는 앱인토스 SDK 가 없어 사진을 넣을 수 없다. 그러면 판정·자르기·
 * 결과 세 화면을 실기기에서야 처음 보게 되고, 렌더 오류를 QR 왕복으로 찾게 된다.
 *
 * `import.meta.env.DEV` 는 Vite 가 빌드 시 `false` 로 **정적 치환**하므로 이 블록은
 * 프로덕션 번들에서 데드코드로 제거된다. 실제로 제거됐는지는 `npm run check:bundle` 이
 * 아래 마커 문자열을 찾아 검증한다 — kit 의 테스트 광고 ID 사고와 같은 종류의 위험이라
 * 트리셰이킹을 믿지 않고 산출물을 직접 확인한다.
 */
export const DEV_PICK_MARKER = 'ps-dev-file-pick';

export function devPickFile(): Promise<SourceImage> {
  if (!import.meta.env.DEV) return Promise.reject(new PhotoError('unsupported'));
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.dataset['marker'] = DEV_PICK_MARKER;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new PhotoError('cancelled'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const uri = String(reader.result);
        measure(uri).then(resolve, reject);
      };
      reader.onerror = () => reject(new PhotoError('decode'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/** 개발 전용 — dataUri 를 바로 소스로 만든다. 브라우저 검증 자동화에 쓴다. */
export function devLoadDataUri(dataUri: string): Promise<SourceImage> {
  if (!import.meta.env.DEV) return Promise.reject(new PhotoError('unsupported'));
  return measure(dataUri);
}
