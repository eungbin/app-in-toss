/** S01 홈 — docs/SCREEN_FLOW.md 3장 */
import { PRESETS } from '@/data/presets';
import { formatBytes } from '@/engine/bytes';
import { t } from '@/i18n';
import type { Preset, SourceImage } from '@/types';
import type { CustomSpec } from '@/store';
import { BannerAd } from '@/components/BannerAd';
import { IconCamera, IconChevron, IconImage, IconShield } from '@/components/Icon';

interface Props {
  preset: Preset;
  presetId: string;
  custom: CustomSpec;
  source: SourceImage | null;
  busy: boolean;
  onPick: () => void;
  onShoot: () => void;
  onSelectPreset: (id: string) => void;
  onOpenCustom: () => void;
  onOpenSources: () => void;
  onDevPick: () => void;
}

const SUB: Record<string, string> = {
  'passport-online': '온라인',
  'passport-print': '인화용',
  'driver-online': '온라인',
  'us-visa': '정사각',
  'id-3x4': '3 × 4 cm',
  custom: 'px · KB',
};

const NAME: Record<string, string> = {
  'passport-online': '여권',
  'passport-print': '여권',
  'driver-online': '운전면허',
  'us-visa': '미국 비자',
  'id-3x4': '증명사진',
  custom: '직접 입력',
};

export function Home(p: Props) {
  const { preset, custom } = p;
  const target = preset.id === 'custom' ? { w: custom.w, h: custom.h } : preset.target;
  const maxBytes = preset.id === 'custom' ? (custom.maxKb === null ? undefined : custom.maxKb * 1000) : preset.maxBytes;

  return (
    <div className="screen">
      <div className="scroll">
        <div className={p.source ? 'preview' : 'preview preview--empty'}>
          {p.source ? (
            <img src={p.source.dataUri} alt="" />
          ) : (
            <>
              <IconImage size={30} color="var(--gray-400)" />
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{t('home.empty')}</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn btn--primary" onClick={p.onPick} disabled={p.busy}>
            <IconImage size={19} color="#fff" />
            {t('home.pickAlbum')}
          </button>
          <button type="button" className="btn btn--sub" onClick={p.onShoot} disabled={p.busy}>
            <IconCamera size={19} />
            {t('home.pickCamera')}
          </button>
          {import.meta.env.DEV && (
            <button type="button" className="btn btn--quiet" onClick={p.onDevPick}>
              파일에서 열기 (개발 전용)
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="label">{t('home.presetQuestion')}</div>
          <div className="presets">
            {PRESETS.map((x) => (
              <button
                key={x.id}
                type="button"
                className="chip"
                aria-pressed={x.id === p.presetId}
                onClick={() => (x.id === 'custom' ? p.onOpenCustom() : p.onSelectPreset(x.id))}
              >
                <span className="chip__name">{NAME[x.id] ?? x.label}</span>
                <span className="chip__sub">{SUB[x.id] ?? ''}</span>
                {x.kind === 'convention' && <span className="badge">{t('badge.convention')}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="card card--float" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="micro" style={{ fontWeight: 600 }}>{t('home.selectedSpec')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="answer">{target.w} × {target.h}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>px</div>
          </div>
          <div className="body-2 num" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {maxBytes !== undefined && <span>{formatBytes(maxBytes)} 이하</span>}
            {maxBytes !== undefined && <span style={{ color: 'var(--gray-300)' }}>·</span>}
            <span>{preset.format === 'jpeg' ? 'JPG' : '형식 제한 없음'}</span>
            {preset.physical && (
              <>
                <span style={{ color: 'var(--gray-300)' }}>·</span>
                <span>{preset.physical.wMm / 10} × {preset.physical.hMm / 10} cm</span>
              </>
            )}
          </div>
          {preset.source ? (
            <button type="button" className="link" style={{ color: 'var(--text-3)', fontWeight: 500 }} onClick={p.onOpenSources}>
              {preset.source.org} · {t('sources.checkedAt', { date: preset.source.checkedAt })}
              <IconChevron size={11} color="var(--gray-400)" />
            </button>
          ) : (
            <button type="button" className="link" style={{ color: 'var(--text-3)', fontWeight: 500 }} onClick={p.onOpenSources}>
              {t('sources.title')}
              <IconChevron size={11} color="var(--gray-400)" />
            </button>
          )}
        </div>
      </div>

      <div className="foot">
        <div className="privacy">
          <IconShield size={14} color="var(--gray-500)" />
          <span>{t('home.privacy')}</span>
        </div>
        <BannerAd />
      </div>
    </div>
  );
}
