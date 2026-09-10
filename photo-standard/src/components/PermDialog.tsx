/**
 * 권한 안내 — docs/SCREEN_FLOW.md M03
 * primary 를 오른쪽에 둔다(토스 관행).
 */
import { openPermissionSettings } from '@/engine/photo';
import { t } from '@/i18n';
import { Dialog } from './Sheet';
import { IconCamera, IconImage } from './Icon';

interface Props {
  kind: 'photos' | 'camera';
  onClose: () => void;
}

export function PermDialog({ kind, onClose }: Props) {
  return (
    <Dialog onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="dialog__icon">
          {kind === 'photos' ? (
            <IconImage size={24} color="var(--primary)" />
          ) : (
            <IconCamera size={24} color="var(--primary)" />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--fs-headline)', fontWeight: 700, lineHeight: 1.4 }}>
            {t(kind === 'photos' ? 'perm.album.title' : 'perm.camera.title')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-600)', lineHeight: 1.6 }}>
            {t('perm.body')}
          </div>
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn btn--sub" onClick={onClose}>
          {t('perm.close')}
        </button>
        <button
          type="button"
          className="btn btn--sub btn--primary"
          style={{ height: 48 }}
          onClick={() => {
            void openPermissionSettings(kind);
            onClose();
          }}
        >
          {t('perm.openSettings')}
        </button>
      </div>
    </Dialog>
  );
}
