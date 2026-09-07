/**
 * 뒤로가기 핸들러 스택.
 * 토스 네비게이션 바·안드로이드 백버튼의 backEvent 하나를 여러 화면이 나눠 쓴다.
 * 나중에 등록된 핸들러가 먼저 기회를 갖고, true를 반환하면 이벤트를 소비한 것으로 본다.
 */
type Handler = () => boolean;

const stack: Handler[] = [];

export function pushBackHandler(fn: Handler): () => void {
  stack.push(fn);
  return () => {
    const i = stack.indexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function runBackHandlers(): void {
  for (let i = stack.length - 1; i >= 0; i--) {
    const fn = stack[i];
    if (fn && fn()) return;
  }
}
