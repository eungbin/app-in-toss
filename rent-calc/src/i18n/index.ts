import { createT } from '@ait/kit';
import ko from './ko.json';

export const t = createT(ko);
export type CopyKey = keyof typeof ko;
