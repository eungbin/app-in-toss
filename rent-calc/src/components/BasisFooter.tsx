/** 기준·면책·개인정보 한 줄 — 모든 결과 화면 하단 (원칙 B1·B2·C4) */
interface Props {
  basis: string;
  /** 기준금리 데이터가 오래됐을 때 */
  stale?: string;
  privacy?: boolean;
  disclaimer: string;
}

export function BasisFooter({ basis, stale, privacy = false, disclaimer }: Props) {
  return (
    <footer className="basis">
      {stale !== undefined && <p className="basis__stale">{stale}</p>}
      <p>{basis}</p>
      <p>{disclaimer}</p>
      {privacy && <p>입력한 금액은 이 기기 안에서만 계산돼요.</p>}
    </footer>
  );
}
