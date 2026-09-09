/**
 * 공유
 * v1.0에는 서버가 없어 생성한 카드 이미지를 호스팅할 수 없다.
 * 따라서 (1) 이미지는 기기에 저장해 사용자가 직접 공유하고,
 *        (2) 링크 공유는 딥링크 + 텍스트로 처리한다.
 */
import { File, Share, saveBase64Data } from '@apps-in-toss/web-framework';

export function canSaveImage(): boolean {
  try {
    return saveBase64Data.isSupported();
  } catch {
    return false;
  }
}

/** 카드 이미지를 기기에 저장한다 */
export async function saveCardImage(base64: string, fileName: string): Promise<void> {
  await saveBase64Data({ data: base64, fileName, mimeType: 'image/png' });
}

/**
 * 이미지가 아닌 파일(CSV 등)을 기기에 저장한다.
 *
 * `File.saveBase64` 는 mimeType 을 문자열로 받으므로 이미지 말고도 쓸 수 있다.
 * `saveCardImage` 가 쓰는 `saveBase64Data` 는 같은 API 의 구 이름이고 SDK 에서
 * deprecated 로 표시돼 있다 — 세 앱이 함께 쓰는 함수라 여기서 바꾸지 않았다.
 *
 * base64 는 **헤더 없는 순수 값**을 넘긴다(`data:` 접두어를 붙이지 않는다).
 */
export function canSaveFile(): boolean {
  try {
    return File.saveBase64.isSupported();
  } catch {
    return false;
  }
}

export async function saveFile(base64: string, fileName: string, mimeType: string): Promise<void> {
  await File.saveBase64({ data: base64, fileName, mimeType });
}

/**
 * 딥링크를 만들어 네이티브 공유 시트를 연다.
 * path는 intoss:// 스킴이어야 한다. intoss-private:// 는 쓰지 않는다.
 */
export async function shareLink(appName: string, path: string, text: string): Promise<void> {
  let link = '';
  try {
    link = await Share.createLink({ path: `intoss://${appName}${path}` });
  } catch {
    // 링크 생성 실패 시 텍스트만 공유한다
  }
  await Share.sendMessage({ message: link ? `${text}\n${link}` : text });
}
