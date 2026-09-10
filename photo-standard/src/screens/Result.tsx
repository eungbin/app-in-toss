/** S04 결과 — docs/SCREEN_FLOW.md 3장 */
import { SAVE_FREE_PER_DAY } from '@/constants';
import { formatBytes } from '@/engine/bytes';
import { t } from '@/i18n';
import type { OutputImage, Preset } from '@/types';
import { BannerAd } from '@/components/BannerAd';
import { IconCheck, IconChevron, IconDownload, IconWarn } from '@/components/Icon';

interface Props {
  output: OutputImage;
  preset: Preset;
  maxBytes: number | undefined;
  savedToday: number;
  gateOpen: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onRecrop: () => void;
  onPickAnother: () => void;
  onOpenSources: () => void;
}

/**
 * 결과물의 실제 형식을 쓴다.
 * 예전에는 프리셋의 `format` 으로 찍었는데, `'any'` 인 프리셋(운전면허·여권 인화용·증명사진)은
 * JPEG 로 인코딩되고 파일명도 .jpg 인데 화면에만 "PNG" 가 떴다(실기기 스크린샷에서 발견).
 */
function formatLabel(mime: string): string {
  const raw = mime.replace('image/', '').toUpperCase();
  return raw === 'JPEG' ? 'JPG' : raw || '—';
}

export function Result(p: Props) {
  const { output, preset, maxBytes } = p;

  return (
    <div className="screen">
      <div className="scroll">
        <div className="preview preview--result" style={{ height: 226 }}>
          <img src={output.dataUri} alt="" />
        </div>

        <div className="card card--float" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="answer">{output.width} × {output.height}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>px</div>
            <div className="grow" />
            {output.overLimit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 'var(--r-full)', background: 'var(--warn-weak)' }}>
                <IconWarn size={12} color="var(--warn)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>{t('check.over')}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 'var(--r-full)', background: 'var(--primary-weak)' }}>
                <IconCheck size={12} color="var(--primary-press)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-press)' }}>{t('check.ok')}</span>
              </div>
            )}
          </div>
          <div className="body-2 num" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span>{formatBytes(output.bytes)}</span>
            <span style={{ color: 'var(--gray-300)' }}>·</span>
            <span>{formatLabel(output.mime)}</span>
            <span style={{ color: 'var(--gray-300)' }}>·</span>
            <span>{preset.label}</span>
          </div>
          {/* 압축 실패를 숨기지 않는다 — docs/FUNCTIONAL_SPEC.md §3-6 */}
          {output.overLimit && maxBytes !== undefined && (
            <div className="verdict__need is-over" style={{ fontWeight: 600 }}>
              {t('result.compressFail', { actual: formatBytes(output.bytes), limit: formatBytes(maxBytes) })}
            </div>
          )}
        </div>

        <div className="notes">
          <div className="notes__head">
            <IconWarn size={15} color="var(--warn)" />
            <span>{t('result.disclaimer')}</span>
          </div>
          {preset.notes && preset.notes.length > 0 && (
            <div className="notes__list">
              {preset.notes.map((k) => (
                <div key={k} className="notes__item">· {t(k as Parameters<typeof t>[0])}</div>
              ))}
            </div>
          )}
          <div style={{ paddingLeft: 23 }}>
            <button type="button" className="link" style={{ color: 'var(--warn)', fontWeight: 700 }} onClick={p.onOpenSources}>
              {t('sources.title')}
              <IconChevron size={11} color="var(--warn)" />
            </button>
          </div>
        </div>
      </div>

      <div className="foot">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%' }}
            onClick={p.onSave}
            disabled={!p.canSave || p.saving}
          >
            {p.saving ? <span className="spinner" /> : <IconDownload size={18} color="#fff" />}
            {t('result.save')}
          </button>
          {!p.gateOpen && (
            <div className="micro">{t('result.quota', { used: p.savedToday, total: SAVE_FREE_PER_DAY })}</div>
          )}
        </div>
        <div className="row">
          <button type="button" className="btn btn--quiet" onClick={p.onRecrop}>{t('result.recrop')}</button>
          <button type="button" className="btn btn--quiet" onClick={p.onPickAnother}>{t('check.pickAnother')}</button>
        </div>
        <BannerAd />
      </div>
    </div>
  );
}
