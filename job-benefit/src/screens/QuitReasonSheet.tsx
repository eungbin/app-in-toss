/**
 * B01 정당한 이직 사유 시트 — docs/SCREEN_FLOW.md B01
 *
 * 시행규칙 별표 2 원문을 그대로 보여 준다(요약하면 오인 소지가 있다).
 * **사용자가 [보기] 를 눌렀을 때만 열린다** — 진입 즉시 열지 않는다.
 */
import { QUIT_REASONS } from '@/data';
import { t } from '@/i18n';
import { Sheet } from '@/components/Sheet';

interface Props {
  picked?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

export function QuitReasonSheet({ picked, onPick, onClose }: Props) {
  return (
    <Sheet title={t('b01.title')} onClose={onClose}>
      <p className="sheet__body" style={{ whiteSpace: 'normal' }}>
        {t('b01.lead')}
      </p>
      <div className="sheet__scroll">
        <ul className="list list--plain">
          {QUIT_REASONS.items.map((item) => (
            <li key={item.id} className="list__item list__item--stack">
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span className="list__pick" style={{ paddingTop: 2 }}>
                  <input type="radio" name="justified" checked={picked === item.id} onChange={() => onPick(item.id)} />
                </span>
                <span style={{ flex: 1, fontSize: 'var(--fs-body)', lineHeight: 1.55 }}>
                  <b style={{ fontWeight: 700, color: 'var(--text-3)', marginRight: 4 }}>{item.id}.</b>
                  {item.text}
                  {item.sub ? (
                    <ol
                      style={{
                        margin: '8px 0 0',
                        paddingLeft: 18,
                        color: 'var(--text-3)',
                        fontSize: 'var(--fs-label)',
                        lineHeight: 1.5,
                        listStyle: 'hangul',
                      }}
                    >
                      {item.sub.map((line) => (
                        <li key={line} style={{ marginTop: 4 }}>
                          {line}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <p className="hint">{QUIT_REASONS.meta.source}</p>
    </Sheet>
  );
}
