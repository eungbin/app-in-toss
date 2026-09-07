import { createT } from '@ait/kit';
import ko from './ko.json';

export type CopyKey = keyof typeof ko;

/** 문구 조회. 구현은 @ait/kit createT — {name} 자리를 채운다. */
export const t = createT(ko);

export { ko };
