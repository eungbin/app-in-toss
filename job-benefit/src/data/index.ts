/** 번들 데이터 — data:fetch + data:build 가 만든다. 원문 대조는 scripts/build-data.ts */
import benefitDaysJson from './benefit-days.json';
import quitReasonsJson from './quit-reasons.json';
import legalJson from './legal.json';
import minWageJson from './min-wage.json';
import type { BenefitDaysFile, LegalFile, MinWageFile, QuitReasonsFile } from '@/types';

export const BENEFIT_DAYS = benefitDaysJson as BenefitDaysFile;
export const QUIT_REASONS = quitReasonsJson as QuitReasonsFile;
export const LEGAL = legalJson as LegalFile;
export const MIN_WAGE = minWageJson as MinWageFile;
