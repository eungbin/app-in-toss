/**
 * S05 규격 출처 — docs/SCREEN_FLOW.md 3장
 * 관행 프리셋에는 "정해진 법령 기준은 없어요"를 반드시 적는다(docs/PRD.md 2-2 B5).
 */
import { openURL } from '@apps-in-toss/web-framework';
import { PRESETS } from '@/data/presets';
import { formatBytes } from '@/engine/bytes';
import { t } from '@/i18n';
import type { Preset } from '@/types';
import { IconExternal } from '@/components/Icon';

/**
 * 권장값을 먼저 쓴다. 앱이 실제로 만들어 주는 크기가 그것이고, 홈 화면이 크게 보여 주는
 * 숫자도 그것이다. 허용 범위로 대체하면 두 화면이 다른 숫자를 말하게 된다.
 */
function specLine(x: Preset): string {
  const parts = [`${x.target.w} × ${x.target.h} px`];
  if (x.target.w === x.target.h) parts.push('정사각');
  if (x.maxBytes !== undefined) parts.push(`${formatBytes(x.maxBytes)} 이하`);
  if (x.format === 'jpeg') parts.push('JPG');
  return parts.join(' · ');
}

/** 허용 범위가 권장값과 다를 때만 따로 알린다 */
function rangeLine(x: Preset): string | null {
  if (!x.range) return null;
  const { wMin, wMax, hMin, hMax } = x.range;
  if (wMin === wMax && hMin === hMax) return null;
  return t('sources.range', { range: `${wMin} × ${hMin} ~ ${wMax} × ${hMax}` });
}

export function Sources() {
  const official = PRESETS.filter((x) => x.kind === 'official');
  const convention = PRESETS.filter((x) => x.kind === 'convention');

  return (
    <div className="screen">
      <div className="scroll" style={{ gap: 10, paddingBottom: 20 }}>
        <div className="body-2" style={{ color: 'var(--text-3)', paddingBottom: 6 }}>
          각 기관이 공개한 기준을 그대로 옮겼어요. 기준이 바뀌면 원문이 먼저예요.
        </div>

        <div className="card card--float" style={{ padding: '4px 16px' }}>
          {official.map((x) => (
            <div key={x.id} className="source">
              <div className="source__head">
                <span className="source__name">{x.label}</span>
                <span className="grow" />
                {x.source && (
                  <button type="button" className="link" onClick={() => void openURL(x.source!.url)}>
                    {t('sources.openOriginal')}
                    <IconExternal size={11} color="var(--primary)" />
                  </button>
                )}
              </div>
              <div className="body-2 num">{specLine(x)}</div>
              {(rangeLine(x) !== null || x.physical) && (
                <div className="body-2 num" style={{ color: 'var(--text-3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {rangeLine(x) !== null && <span>{rangeLine(x)}</span>}
                  {rangeLine(x) !== null && x.physical && <span style={{ color: 'var(--gray-300)' }}>·</span>}
                  {x.physical && <span>{x.physical.wMm / 10} × {x.physical.hMm / 10} cm</span>}
                </div>
              )}
              {x.source && (
                <div className="micro">
                  {x.source.org} · {t('sources.checkedAt', { date: x.source.checkedAt })}
                </div>
              )}
            </div>
          ))}
        </div>

        {convention.map((x) => (
          <div key={x.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="source__head">
              <span className="source__name">{x.label}</span>
              <span className="badge" style={{ position: 'static' }}>{t('badge.convention')}</span>
            </div>
            <div className="body-2 num">{x.target.w} × {x.target.h} px</div>
            <div className="body-2" style={{ color: 'var(--gray-600)' }}>{t('sources.noLegalBasis')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
