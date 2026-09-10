/** S02 판정 — docs/SCREEN_FLOW.md 3장. 이 앱의 차별점이 사는 화면이다. */
import { formatBytes } from '@/engine/bytes';
import { t } from '@/i18n';
import type { CheckStatus, Preset, SourceImage, Verdict } from '@/types';
import { IconArrow, IconBlocked, IconCheck, IconChevron, IconWarn } from '@/components/Icon';

interface Props {
  source: SourceImage;
  preset: Preset;
  verdict: Verdict;
  target: { w: number; h: number };
  maxBytes: number | undefined;
  busy: boolean;
  onFix: () => void;
  onPickAnother: () => void;
  onOpenSources: () => void;
}

/** 색만으로 구분하지 않는다. 아이콘과 문구를 함께 쓴다(접근성) */
function StateIcon({ s }: { s: CheckStatus }) {
  return s === 'ok' ? (
    <IconCheck size={18} color="var(--verdict-ok)" />
  ) : (
    <IconWarn size={18} color="var(--verdict-over)" />
  );
}

function stateText(s: CheckStatus): string {
  if (s === 'ok') return t('check.ok');
  if (s === 'mismatch') return t('check.mismatch');
  return t('check.over');
}

interface RowProps {
  name: string;
  status: CheckStatus;
  value: React.ReactNode;
  /** 화살표가 SVG 라 값이 "1200600" 으로 읽힌다. 읽을 말을 따로 준다 */
  valueLabel: string;
  need?: string;
}

function Row({ name, status, value, valueLabel, need }: RowProps) {
  return (
    <div className="verdict__row">
      <span style={{ flexShrink: 0, marginTop: 1 }}>
        <StateIcon s={status} />
      </span>
      <span className="verdict__name">{name}</span>
      <span className={need ? 'verdict__val' : 'verdict__val arrowed'}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label={valueLabel}>
          {value}
        </span>
        {need && <span className={`verdict__need ${status === 'ok' ? 'is-ok' : 'is-over'}`}>{need}</span>}
      </span>
      <span className={`verdict__state ${status === 'ok' ? 'is-ok' : 'is-over'}`}>{stateText(status)}</span>
    </div>
  );
}

/** 표기는 앱 전체에서 하나로 — 다른 화면은 JPG 라고 쓴다 */
function formatLabel(mime: string): string {
  const raw = mime.replace('image/', '').toUpperCase();
  return raw === 'JPEG' ? 'JPG' : raw || '—';
}

export function Check(p: Props) {
  const { source, verdict, target, maxBytes } = p;
  const blocked = verdict.overall === 'blocked';

  return (
    <div className="screen">
      <div className="scroll">
        <div className="preview" style={{ height: 240 }}>
          <img src={source.dataUri} alt="" />
        </div>

        <div className="label">{t('check.basis', { preset: p.preset.label })}</div>

        {blocked ? (
          <div className="blocked">
            <div className="blocked__head">
              <IconBlocked size={20} color="var(--verdict-blocked)" />
              {t('check.blocked.title')}
            </div>
            <div className="blocked__cmp">
              <div className="blocked__col">
                <span className="micro" style={{ fontWeight: 600 }}>필요한 크기</span>
                <span className="num" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {target.w} × {target.h}
                </span>
              </div>
              <div className="grow" />
              <div className="blocked__col" style={{ alignItems: 'flex-end' }}>
                <span className="micro" style={{ fontWeight: 600 }}>지금 사진</span>
                <span className="num is-blocked" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {source.width} × {source.height}
                </span>
              </div>
            </div>
            <div className="body-2">
              {t('check.blocked.body', {
                need: `${target.w} × ${target.h}`,
                have: `${source.width} × ${source.height}`,
              })}{' '}
              {t('check.blocked.hint')}
            </div>
          </div>
        ) : (
          <div className="card card--float verdict">
            <Row
              name={t('check.labelWidth')}
              status={verdict.width}
              value={
                <>
                  <span className="num">{source.width}</span>
                  <IconArrow size={11} color="var(--gray-400)" />
                  <span className="num">{target.w}</span>
                </>
              }
              valueLabel={`${source.width}에서 ${target.w}으로`}
            />
            <Row
              name={t('check.labelHeight')}
              status={verdict.height}
              value={
                <>
                  <span className="num">{source.height}</span>
                  <IconArrow size={11} color="var(--gray-400)" />
                  <span className="num">{target.h}</span>
                </>
              }
              valueLabel={`${source.height}에서 ${target.h}으로`}
            />
            <Row
              name={t('check.labelBytes')}
              status={verdict.bytes}
              value={<span className="num">{formatBytes(source.bytes)}</span>}
              valueLabel={formatBytes(source.bytes)}
              {...(verdict.bytes !== 'ok' && maxBytes !== undefined
                ? { need: t('check.needBytes', { limit: formatBytes(maxBytes) }) }
                : {})}
            />
            <Row
              name={t('check.labelRatio')}
              status={verdict.ratio}
              value={<span className="num">{ratioText(source.width, source.height)}</span>}
              valueLabel={ratioText(source.width, source.height)}
              {...(verdict.ratio !== 'ok' ? { need: t('check.needCrop') } : {})}
            />
            <Row
              name={t('check.labelFormat')}
              status={verdict.format}
              value={<span>{formatLabel(source.mime)}</span>}
              valueLabel={formatLabel(source.mime)}
            />
          </div>
        )}
      </div>

      <div className="foot">
        {!blocked && (
          <button type="button" className="btn btn--primary" onClick={p.onFix} disabled={p.busy}>
            {p.busy && <span className="spinner" />}
            {verdict.overall === 'pass' ? t('check.saveAsIs') : t('check.fix')}
          </button>
        )}
        {blocked ? (
          <button type="button" className="btn btn--primary" onClick={p.onPickAnother}>
            {t('check.pickAnother')}
          </button>
        ) : (
          <div className="row">
            <button type="button" className="btn btn--quiet" onClick={p.onPickAnother}>
              {t('check.pickAnother')}
            </button>
            <button type="button" className="btn btn--quiet" style={{ flex: 'none', padding: '0 16px' }} onClick={p.onOpenSources}>
              {t('sources.title')}
              <IconChevron size={13} color="var(--gray-500)" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 8:10 처럼 약분해 보여 준다. 소수는 사람이 못 읽는다. */
function ratioText(w: number, h: number): string {
  const g = gcd(w, h);
  const a = Math.round(w / g);
  const b = Math.round(h / g);
  if (a <= 40 && b <= 40) return `${a} : ${b}`;
  return `${(w / h).toFixed(2)} : 1`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
