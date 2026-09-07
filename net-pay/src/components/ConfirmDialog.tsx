/** 삭제 확인 — docs/SCREEN_FLOW.md M03. 전체 삭제는 2단계 */
import { Sheet } from './Sheet';
import { t } from '@/i18n';

interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Sheet title={message} onClose={onCancel} variant="dialog">
      <div className="row">
        <button type="button" className="cta cta--danger" onClick={onConfirm}>
          {confirmLabel ?? t('confirm.delete')}
        </button>
        <button type="button" className="cta cta--secondary" onClick={onCancel}>
          {t('confirm.cancel')}
        </button>
      </div>
    </Sheet>
  );
}
