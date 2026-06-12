export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  // 取消当前正在播的
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1.1;
  window.speechSynthesis.speak(u);
}
