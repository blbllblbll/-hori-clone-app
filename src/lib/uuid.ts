/** 로컬 대화방 id 생성용. 서버 PK가 아니라 클라이언트 상관용 값이라 암호학적 강도는 필요 없다. */
export function createLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
