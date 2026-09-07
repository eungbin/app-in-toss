/**
 * 최소 ZIP 리더 — HWPX(=ZIP)에서 항목 하나를 꺼낸다.
 * 의존성을 늘리지 않기 위해 Node zlib만 쓴다.
 */
import { inflateRawSync } from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

/** ZIP 버퍼에서 이름이 정확히 일치하는 항목의 내용을 돌려준다 */
export function readZipEntry(buf: Buffer, entryName: string): Buffer {
  // 끝에서 EOCD 서명을 찾는다 (주석 최대 65535바이트)
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65_535); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP 중앙 디렉터리를 찾지 못했습니다');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) throw new Error('ZIP 항목 서명이 어긋납니다');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf-8', p + 46, p + 46 + nameLen);

    if (name === entryName) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`지원하지 않는 압축 방식: ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`ZIP 항목을 찾지 못했습니다: ${entryName}`);
}
