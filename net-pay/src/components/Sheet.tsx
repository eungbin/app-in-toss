/** 바텀시트·다이얼로그 공통 껍데기. 진입 즉시 자동으로 열지 않는다(비게임 체크리스트) */
import { useEffect, type ReactNode } from 'react';
import { pushBackHandler } from '@ait/kit';
import { Icon } from './Icon';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'sheet' | 'dialog';
}

export function Sheet({ title, onClose, children, variant = 'sheet' }: Props) {
  // 뒤로가기로 닫는다
  useEffect(
    () =>
      pushBackHandler(() => {
        onClose();
        return true;
      }),
    [onClose],
  );

  return (
    <div className="scrim" role="presentation" onClick={onClose}>
      <div
        className={variant === 'sheet' ? 'sheet' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="sheet__close" aria-label="닫기" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
