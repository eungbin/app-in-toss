/**
 * 홈 (S01) — docs/SCREEN_FLOW.md 3장
 * 구판 구조를 그대로 둔다: 월 네비 · 실수령 카드 · 급여 계산 · 달력 · 기록 목록 · 배너 · 고정 버튼.
 * 카드 A 의 숫자가 화면에서 가장 큰 글자다 — 부제가 약속한 그 값이다.
 */
import { useMemo } from 'react';
import type { MonthSummary, WorkRecord, Workplace } from '@/types';
import { t } from '@/i18n';
import { addMonths, daysInMonth, dowLabel, firstDayOfWeek, hhmm, hourText, monthOf } from '@/engine/date';
import { splitShift } from '@/engine/shift';
import { dayPay } from '@/engine/pay';
import { Icon } from '@/components/Icon';
import { BannerAd } from '@/components/BannerAd';

const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;
const signed = (n: number): string => (n === 0 ? '0원' : `-${n.toLocaleString('ko-KR')}원`);
const plus = (n: number): string => `+${n.toLocaleString('ko-KR')}원`;

/**
 * 달력 칸의 금액 축약. 10만 원 미만은 **천 단위**로 적는다 — 구판이 82,560원을
 * `83천` 으로 적었고 시안도 그 표기로 승인받았다. 하루 일당은 대부분 이 범위에 들어온다.
 */
export function shortMoney(n: number): string {
  if (n < 100_000) return `${Math.round(n / 1_000).toLocaleString('ko-KR')}천`;
  const man = n / 10_000;
  return man < 100
    ? `${(Math.round(man * 10) / 10).toLocaleString('ko-KR')}만`
    : `${Math.round(man).toLocaleString('ko-KR')}만`;
}

interface Props {
  month: string;
  today: string;
  summary: MonthSummary;
  records: WorkRecord[];
  workplaces: Workplace[];
  locked: boolean;
  canGoBack: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSettings: () => void;
  onShare: () => void;
  onAddRecord: (date?: string) => void;
  onEditRecord: (rec: WorkRecord) => void;
  onUnlock: () => void;
  onAddWorkplace: () => void;
}

export function Home(props: Props) {
  const { month, today, summary, records, workplaces, locked } = props;
  const { year, month: m } = monthOf(month);
  const colorOf = useMemo(
    () => new Map(workplaces.map((w) => [w.id, `var(--wp-${w.color})`])),
    [workplaces],
  );
  const nameOf = useMemo(() => new Map(workplaces.map((w) => [w.id, w.name])), [workplaces]);

  /** 날짜별 합계 — 달력 점과 금액에 쓴다 */
  const byDate = useMemo(() => {
    const map = new Map<string, { total: number; colors: string[] }>();
    for (const r of records) {
      const wp = workplaces.find((w) => w.id === r.workplaceId);
      if (!wp) continue;
      const total = dayPay(splitShift(r), r, wp).total;
      const cur = map.get(r.date) ?? { total: 0, colors: [] };
      cur.total += total;
      const c = `var(--wp-${wp.color})`;
      if (!cur.colors.includes(c)) cur.colors.push(c);
      map.set(r.date, cur);
    }
    return map;
  }, [records, workplaces]);

  const sorted = useMemo(
    () => [...records].sort((a, b) => (a.date === b.date ? b.start - a.start : a.date < b.date ? 1 : -1)),
    [records],
  );

  /**
   * 근무지가 없으면 기록을 만들 수 없다. 달력·링크·고정 버튼 전부 **할 수 있는 일**로 보낸다 —
   * 아무 일도 안 하는 버튼을 남기면 사용자는 앱이 고장 난 줄 안다.
   */
  const addOrRegister = (date?: string) => {
    if (workplaces.length === 0) props.onAddWorkplace();
    else props.onAddRecord(date);
  };

  const lead = firstDayOfWeek(month);
  const total = daysInMonth(month);
  const nextMonth = addMonths(month, 1);
  const canGoNext = `${nextMonth}-01` <= today;

  return (
    <>
      <div className="screen">
        <div className="monthnav">
          <span style={{ width: 44 }} />
          <div className="monthnav__mid">
            <button type="button" className="iconbtn" aria-label="이전 달" disabled={!props.canGoBack} onClick={props.onPrev}>
              <Icon name="chevronLeft" size={22} width={2} />
            </button>
            <div className="monthnav__label">{t('home.month', { y: year, m })}</div>
            <button type="button" className="iconbtn" aria-label="다음 달" disabled={!canGoNext} onClick={props.onNext}>
              <Icon name="chevronRight" size={22} width={2} />
            </button>
          </div>
          <button type="button" className="iconbtn" aria-label={t('settings.title')} onClick={props.onSettings}>
            <Icon name="gear" size={20} width={1.8} />
          </button>
        </div>

        <div className="stack">
          {/* 카드 A — 이번 달 예상 실수령액 */}
          <section className="netcard">
            <div className="netcard__head">
              <div className="netcard__label">
                {month === today.slice(0, 7) ? t('home.net.title') : t('home.net.title.past', { m })}
              </div>
              {!locked && summary.gross > 0 ? (
                <button type="button" className="netcard__share" onClick={props.onShare}>
                  <Icon name="share" size={13} width={1.7} />
                  {t('home.net.share')}
                </button>
              ) : null}
            </div>

            {locked ? (
              <>
                <div className="netcard__locked">
                  <span className="netcard__bar" />
                  <Icon name="lock" size={22} />
                </div>
                <button type="button" className="netcard__hint" onClick={props.onUnlock}>
                  {t('home.locked.month')}
                </button>
              </>
            ) : (
              <>
                <div className="netcard__value">{won(summary.net)}</div>
                <div className="netcard__rule" />
                <dl className="netcard__grid">
                  <div className="netcard__cell">
                    <dt>{t('home.net.gross')}</dt>
                    <dd>{won(summary.gross)}</dd>
                  </div>
                  <div className="netcard__cell">
                    <dt>{t('home.net.weekly')}</dt>
                    <dd>{won(summary.weeklyHolidayPay)}</dd>
                  </div>
                  <div className="netcard__cell">
                    <dt>{t('home.net.deduct')}</dt>
                    <dd>{signed(summary.deductions)}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          {locked ? null : (
            <>
              {/* 카드 B — 급여 계산 */}
              <section className="card">
                <div className="card__head">
                  <div className="card__title">
                    <span className="card__badge">
                      <Icon name="wallet" size={15} width={1.7} />
                    </span>
                    {t('home.calc.title')}
                  </div>
                  <div className="card__meta">
                    {t('home.calc.meta', { h: hourText(summary.workMin), d: summary.days })}
                  </div>
                </div>

                <div className="rows">
                  <div className="row">
                    <span className="row__k">{t('home.calc.workPay')}</span>
                    <span className="row__v">{won(summary.workPay)}</span>
                  </div>
                  {summary.addedPay > 0 ? (
                    <div className="row">
                      <span className="row__k">{t('home.calc.added')}</span>
                      <span className="row__v">{plus(summary.addedPay)}</span>
                    </div>
                  ) : null}
                  <div className="row">
                    <span className="row__k">
                      {t('home.calc.weekly')}
                      <small>{t('home.calc.weeklyCount', { n: summary.weeklyHolidayCount })}</small>
                    </span>
                    <span className="row__v">{plus(summary.weeklyHolidayPay)}</span>
                  </div>
                  {summary.pendingWeeklyHolidayPay > 0 ? (
                    <div className="row row--muted">
                      <span className="row__k">{t('home.calc.weeklyPending')}</span>
                      <span className="row__v">{plus(summary.pendingWeeklyHolidayPay)}</span>
                    </div>
                  ) : null}
                  <div className="rule" />
                  <div className="row row--strong">
                    <span className="row__k">{t('home.calc.gross')}</span>
                    <span className="row__v">{won(summary.gross)}</span>
                  </div>
                  <div className="row">
                    <span className="row__k">{t('home.calc.tax')}</span>
                    <span className="row__v">
                      {signed(summary.byWorkplace.reduce((a, w) => a + w.deductions.incomeTax + w.deductions.localTax, 0))}
                    </span>
                  </div>
                  <div className="row">
                    <span className="row__k">{t('home.calc.insurance')}</span>
                    <span className="row__v">
                      {signed(
                        summary.byWorkplace.reduce(
                          (a, w) => a + w.deductions.nps + w.deductions.nhis + w.deductions.ltc + w.deductions.ei,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                </div>

                <div className="total">
                  <span className="total__k">{t('home.calc.net')}</span>
                  <span className="total__v">{won(summary.net)}</span>
                </div>
                <p className="disclaimer">{t('disclaimer.short')}</p>
              </section>

              {/* 카드 C — 근무 달력 */}
              <section className="card">
                <div className="card__head">
                  <div className="card__title">
                    <span className="card__badge">
                      <Icon name="calendar" size={15} width={1.7} />
                    </span>
                    {t('home.calendar.title')}
                  </div>
                  <button type="button" className="card__link" onClick={() => addOrRegister()}>
                    {t('home.calendar.add')}
                  </button>
                </div>

                <div className="cal__dow">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="cal__grid">
                  {Array.from({ length: lead }, (_, i) => (
                    <span key={`lead${i}`} className="cal__cell" />
                  ))}
                  {Array.from({ length: total }, (_, i) => {
                    const day = i + 1;
                    const iso = `${month}-${String(day).padStart(2, '0')}`;
                    const hit = byDate.get(iso);
                    const isToday = iso === today;
                    const isSunday = (lead + i) % 7 === 0;
                    return (
                      <button
                        key={iso}
                        type="button"
                        className={`cal__cell${isToday ? ' cal__cell--today' : ''}`}
                        onClick={() => addOrRegister(iso)}
                        aria-label={`${day}일${hit ? ` ${won(hit.total)}` : ''}`}
                      >
                        {isToday ? (
                          <span className="cal__num--today">{day}</span>
                        ) : (
                          <span className={isSunday ? 'cal__sun' : undefined}>{day}</span>
                        )}
                        {hit ? (
                          <>
                            <span className="cal__dots">
                              {hit.colors.map((c) => (
                                <span key={c} className="cal__dot" style={{ background: c }} />
                              ))}
                            </span>
                            <span className="cal__amt">{shortMoney(hit.total)}</span>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 카드 D — 근무 기록 */}
              <section className="card">
                <div className="card__head">
                  <div className="card__title">
                    <span className="card__badge">
                      <Icon name="list" size={15} width={1.7} />
                    </span>
                    {t('home.records.title')}
                  </div>
                  <div className="card__meta">{t('home.records.count', { n: records.length })}</div>
                </div>

                {records.length === 0 ? (
                  <div className="empty">
                    <div className="empty__t">{t('home.records.empty.title')}</div>
                    <div className="empty__b">{t('home.records.empty.body')}</div>
                  </div>
                ) : (
                  <div className="reclist">
                    {sorted.map((r) => {
                      const wp = workplaces.find((w) => w.id === r.workplaceId);
                      const split = splitShift(r);
                      const total = wp ? dayPay(split, r, wp).total : 0;
                      const day = Number(r.date.slice(8, 10));
                      return (
                        <button key={r.id} type="button" className="recitem" onClick={() => props.onEditRecord(r)}>
                          <span className="recitem__l">
                            <span
                              className="recitem__dot"
                              style={{ background: colorOf.get(r.workplaceId) ?? 'var(--gray-400)' }}
                            />
                            <span>
                              <span className="recitem__t" style={{ display: 'block' }}>
                                {`${monthOf(month).month}월 ${day}일 (${dowLabel(r.date)})`}
                              </span>
                              <span className="recitem__s">
                                {t('home.records.item.sub', {
                                  name: nameOf.get(r.workplaceId) ?? '',
                                  from: hhmm(r.start),
                                  to: hhmm(r.end),
                                  hours: hourText(split.work),
                                })}
                              </span>
                            </span>
                          </span>
                          <span className="recitem__v">{won(total)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          <BannerAd />
        </div>
      </div>

      <div className="cta">
        <div className="cta__inner">
          {/*
            근무지가 없으면 기록을 만들 수 없다. 버튼을 비활성으로 두면 왜 안 되는지 알 수 없으니
            **할 수 있는 일**로 바꿔 준다 — 근무지 등록.
            잠긴 달에서 기록을 만들면 저장한 것이 잠금 뒤로 사라져 보이므로 게이트를 먼저 연다.
          */}
          <button
            type="button"
            className="btn"
            onClick={locked && workplaces.length > 0 ? props.onUnlock : () => addOrRegister()}
          >
            <Icon name={workplaces.length === 0 ? 'wallet' : 'plus'} size={20} width={2.2} />
            {workplaces.length === 0 ? t('home.noWorkplace.cta') : t('home.cta')}
          </button>
        </div>
      </div>
    </>
  );
}
