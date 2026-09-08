/** 번들 데이터 — 런타임에 외부를 호출하지 않는다 */
import baserateJson from './baserate.json';
import brokerageJson from './brokerage.json';
import legalJson from './legal.json';
import type { BaseRateFile, BrokerageFile, LegalFile } from '@/types';

export const baserate = baserateJson as BaseRateFile;
export const brokerage = brokerageJson as BrokerageFile;
export const legal = legalJson as LegalFile;
