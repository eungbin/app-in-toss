/** 바텀시트·다이얼로그 공통 껍데기. 백버튼 = 닫기(docs/SCREEN_FLOW.md 1장) */
import { useEffect, type ReactNode } from 'react';
import { pushBackHandler } from '@ait/kit';

interface Props {
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ onClose, children }: Props) {
  useEffect(() => pushBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);
  return (
    <div className="dim dim--sheet" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        {children}
      </div>
    </div>
  );
}

export function Dialog({ onClose, children }: Props) {
  useEffect(() => pushBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);
  return (
    <div className="dim dim--dialog" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
