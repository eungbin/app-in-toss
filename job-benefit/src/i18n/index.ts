/** 문구 — 사전은 ko.json 하나. 키 타입이 사전에서 추론되므로 오타는 타입 오류가 된다 */
import { createT } from '@ait/kit';
import ko from './ko.json';

export const t = createT(ko);
export type CopyKey = keyof typeof ko;
