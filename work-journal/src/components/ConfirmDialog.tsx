/** 확인 다이얼로그 — 되돌릴 수 없는 동작 앞에만 둔다 */
import { t } from '@/i18n';
import { Dialog } from './Sheet';

interface Props {
  title: string;
  body?: string;
  confirmLabel?: string;
  /** 두 번째 버튼을 위험색으로 그린다 */
  danger?: boolean;
  /** 왼쪽 보조 버튼 — 전체 삭제 앞의 "내보내기" */
  altLabel?: string;
  onAlt?: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel, danger = true, altLabel, onAlt, onConfirm, onClose }: Props) {
  return (
    <Dialog onClose={onClose}>
      <div className="dialog__t">{title}</div>
      {body ? <div className="dialog__b">{body}</div> : <div style={{ height: 18 }} />}
      <div className="btn-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={altLabel && onAlt ? onAlt : onClose}>
          {altLabel ?? t('confirm.cancel')}
        </button>
        <button
          type="button"
          className={danger ? 'btn btn--danger btn--sm' : 'btn btn--sm'}
          onClick={onConfirm}
        >
          {confirmLabel ?? t('confirm.delete')}
        </button>
      </div>
    </Dialog>
  );
}
