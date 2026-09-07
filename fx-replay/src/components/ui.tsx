/**
 * 버튼 — TDS Button 위에 앱에서 쓰는 세 가지 역할만 고정한다.
 * 호출부가 TDS 프롭을 매번 고르지 않게 하고, 나중에 TDS를 걷어내도 여기만 고치면 된다.
 */
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';

type Base = Omit<ComponentProps<typeof Button>, 'color' | 'variant' | 'display' | 'size'> & {
  children: ReactNode;
};

/** 화면의 주 행동 */
export const PrimaryButton = (p: Base) => (
  <Button color="primary" variant="fill" display="block" size="large" {...p} />
);

/** 보조 행동 — 주 행동과 나란히 놓이거나 대안일 때 */
export const SecondaryButton = (p: Base) => (
  <Button color="primary" variant="weak" display="block" size="large" {...p} />
);

/**
 * 취소·나중에 등 약한 행동.
 * TDS Button 은 어떤 color 를 줘도 채워진 버튼이라 주 행동과 구분이 흐려진다.
 * 취소는 텍스트 버튼이어야 위계가 산다.
 */
export const GhostButton = ({ children, ...rest }: ComponentProps<'button'>) => (
  <button type="button" className="btn ghost" {...rest}>
    {children}
  </button>
);
