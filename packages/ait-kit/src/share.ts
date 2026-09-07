/**
 * 공유
 * v1.0에는 서버가 없어 생성한 카드 이미지를 호스팅할 수 없다.
 * 따라서 (1) 이미지는 기기에 저장해 사용자가 직접 공유하고,
 *        (2) 링크 공유는 딥링크 + 텍스트로 처리한다.
 */
import { Share, saveBase64Data } from '@apps-in-toss/web-framework';

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
