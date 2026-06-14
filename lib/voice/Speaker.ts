/**
 * 语音播报。第一版默认禁用普通成功反馈，避免打断连续语音输入。
 * 仅在 force=true 或危险确认场景下使用。
 */
export function speak(text: string, opts?: { force?: boolean }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!opts?.force) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1.1;
  window.speechSynthesis.speak(u);
}
