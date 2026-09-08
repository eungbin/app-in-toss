/** 산식 표 — docs/SCREEN_FLOW.md S02. 근거를 그대로 보여 사용자가 검산할 수 있게 한다 */
import type { ReactNode } from 'react';

export interface Row {
  label: string;
  before?: ReactNode;
  after?: ReactNode;
  /** 한 칸으로 합쳐 보여줄 값 */
  value?: ReactNode;
}

interface Props {
  head: { item: string; before: string; after: string };
  rows: Row[];
}

export function FormulaTable({ head, rows }: Props) {
  return (
    <table className="formula">
      <thead>
        <tr>
          <th scope="col">{head.item}</th>
          <th scope="col">{head.before}</th>
          <th scope="col">{head.after}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            {r.value === undefined ? (
              <>
                <td>{r.before}</td>
                <td>{r.after}</td>
              </>
            ) : (
              <td colSpan={2}>{r.value}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
