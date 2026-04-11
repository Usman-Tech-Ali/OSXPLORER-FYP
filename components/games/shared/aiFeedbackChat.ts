interface AIFeedbackContext {
  gameType: string;
  score?: number;
  wrongAttempts?: number;
  phase?: string;
  [key: string]: unknown;
}

interface MiniQuestTarget {
  moduleId: string;
  miniQuestId: string;
  title: string;
  path: string;
}

let chatRoot: HTMLDivElement | null = null;
let messagesEl: HTMLDivElement | null = null;
let inputEl: HTMLInputElement | null = null;
const chatHistory: Array<{ role: 'user' | 'ai'; message: string }> = [];

function getMiniQuestTarget(gameType: string): MiniQuestTarget | null {
  const normalized = String(gameType || '').toLowerCase();

  const targets: Array<{ test: RegExp; moduleId: string; miniQuestId: string; title: string }> = [
    { test: /(^|-)fcfs(-|$)/, moduleId: 'cpu-scheduling', miniQuestId: 'fcfs', title: 'FCFS Mini-Quest' },
    { test: /(^|-)sjf(-|$)/, moduleId: 'cpu-scheduling', miniQuestId: 'sjf', title: 'SJF Mini-Quest' },
    { test: /(^|-)srtf(-|$)/, moduleId: 'cpu-scheduling', miniQuestId: 'srtf', title: 'SRTF Mini-Quest' },
    { test: /(^|-)priority(-|$)/, moduleId: 'cpu-scheduling', miniQuestId: 'priority', title: 'Priority Mini-Quest' },
    { test: /(^|-)rr(-|$)|round-robin/, moduleId: 'cpu-scheduling', miniQuestId: 'round-robin', title: 'Round Robin Mini-Quest' },
    { test: /first-fit/, moduleId: 'memory-management', miniQuestId: 'first-fit', title: 'First Fit Mini-Quest' },
    { test: /best-fit/, moduleId: 'memory-management', miniQuestId: 'best-fit', title: 'Best Fit Mini-Quest' },
    { test: /worst-fit/, moduleId: 'memory-management', miniQuestId: 'worst-fit', title: 'Worst Fit Mini-Quest' },
    { test: /paging/, moduleId: 'memory-management', miniQuestId: 'paging', title: 'Paging Mini-Quest' },
    { test: /segmentation/, moduleId: 'memory-management', miniQuestId: 'segmentation', title: 'Segmentation Mini-Quest' },
    { test: /compaction/, moduleId: 'memory-management', miniQuestId: 'fragmentation', title: 'Fragmentation Mini-Quest' },
    { test: /critical-section/, moduleId: 'process-synchronization', miniQuestId: 'critical-section', title: 'Critical Section Mini-Quest' },
    { test: /mutex/, moduleId: 'process-synchronization', miniQuestId: 'mutex', title: 'Mutex Mini-Quest' },
    { test: /binary-semaphore/, moduleId: 'process-synchronization', miniQuestId: 'binary-semaphore', title: 'Binary Semaphore Mini-Quest' },
    { test: /counting-semaphore/, moduleId: 'process-synchronization', miniQuestId: 'counting-semaphore', title: 'Counting Semaphore Mini-Quest' },
    { test: /producer-consumer/, moduleId: 'process-synchronization', miniQuestId: 'producer-consumer', title: 'Producer-Consumer Mini-Quest' },
    { test: /dining-philosopher/, moduleId: 'process-synchronization', miniQuestId: 'dining-philosophers', title: 'Dining Philosophers Mini-Quest' },
  ];

  const target = targets.find((entry) => entry.test.test(normalized));
  if (!target) return null;

  return {
    ...target,
    path: `/modules/${target.moduleId}/mini-quest/${target.miniQuestId}`,
  };
}

function appendMessage(role: 'user' | 'ai', message: string) {
  if (!messagesEl) return;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';
  wrapper.style.marginBottom = '8px';

  const bubble = document.createElement('div');
  bubble.textContent = message;
  bubble.style.maxWidth = '82%';
  bubble.style.padding = '10px 12px';
  bubble.style.borderRadius = '10px';
  bubble.style.whiteSpace = 'pre-wrap';
  bubble.style.fontSize = '13px';
  bubble.style.lineHeight = '1.4';
  bubble.style.background = role === 'user' ? '#4CAF50' : '#2A2A3E';
  bubble.style.color = '#FFFFFF';

  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendToAI(context: AIFeedbackContext, message: string, isInitial: boolean) {
  appendMessage('ai', 'Thinking...');

  try {
    const response = await fetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...context,
        userQuestion: message,
        isInitial,
        conversationHistory: chatHistory,
      }),
    });

    const result = await response.json();

    if (messagesEl?.lastElementChild) {
      messagesEl.removeChild(messagesEl.lastElementChild);
    }

    const aiMessage = result?.success && result?.data?.feedback
      ? String(result.data.feedback)
      : 'I could not generate feedback right now. Please try again.';

    chatHistory.push({ role: 'ai', message: aiMessage });
    appendMessage('ai', aiMessage);
  } catch {
    if (messagesEl?.lastElementChild) {
      messagesEl.removeChild(messagesEl.lastElementChild);
    }

    const err = 'Network error while contacting AI feedback service.';
    chatHistory.push({ role: 'ai', message: err });
    appendMessage('ai', err);
  }
}

function createMiniQuestPanel(context: AIFeedbackContext) {
  const target = getMiniQuestTarget(context.gameType);

  if (!target) {
    return null;
  }

  const panel = document.createElement('div');
  panel.style.margin = '10px 12px 0';
  panel.style.padding = '10px 12px';
  panel.style.border = '1px solid rgba(76, 175, 80, 0.35)';
  panel.style.borderRadius = '10px';
  panel.style.background = 'rgba(76, 175, 80, 0.08)';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '8px';

  const title = document.createElement('div');
  title.textContent = `${target.title} unlocked`;
  title.style.color = '#E8F5E9';
  title.style.fontWeight = '700';
  title.style.fontSize = '13px';

  const description = document.createElement('div');
  description.textContent = 'Level clear reward: take the mini-quest for this topic before moving on.';
  description.style.color = '#C8E6C9';
  description.style.fontSize = '12px';
  description.style.lineHeight = '1.4';

  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.alignItems = 'center';
  buttonRow.style.justifyContent = 'space-between';
  buttonRow.style.gap = '8px';

  const scoreNote = document.createElement('span');
  scoreNote.textContent = typeof context.score === 'number' ? `Score: ${context.score}` : 'Score recorded';
  scoreNote.style.color = '#B7E4C7';
  scoreNote.style.fontSize = '12px';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Start Mini-Quest';
  button.style.border = 'none';
  button.style.borderRadius = '8px';
  button.style.padding = '8px 12px';
  button.style.cursor = 'pointer';
  button.style.background = 'linear-gradient(135deg, #66BB6A, #2E7D32)';
  button.style.color = '#FFFFFF';
  button.style.fontWeight = '700';
  button.style.boxShadow = '0 6px 18px rgba(46, 125, 50, 0.35)';
  button.onclick = () => {
    closeAIFeedbackChat();
    window.location.assign(target.path);
  };

  buttonRow.appendChild(scoreNote);
  buttonRow.appendChild(button);
  panel.appendChild(title);
  panel.appendChild(description);
  panel.appendChild(buttonRow);

  return panel;
}

export function closeAIFeedbackChat() {
  if (chatRoot) {
    chatRoot.remove();
    chatRoot = null;
    messagesEl = null;
    inputEl = null;
  }
}

export function openAIFeedbackChat(context: AIFeedbackContext) {
  if (chatRoot) {
    closeAIFeedbackChat();
    return;
  }

  chatHistory.length = 0;

  chatRoot = document.createElement('div');
  chatRoot.id = 'global-ai-chatbot';
  chatRoot.style.position = 'fixed';
  chatRoot.style.right = '10px';
  chatRoot.style.top = '50%';
  chatRoot.style.transform = 'translateY(-50%)';
  chatRoot.style.width = '420px';
  chatRoot.style.height = '640px';
  chatRoot.style.background = '#1A1A2E';
  chatRoot.style.border = '3px solid #4CAF50';
  chatRoot.style.borderRadius = '14px';
  chatRoot.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.45)';
  chatRoot.style.zIndex = '99999';
  chatRoot.style.display = 'flex';
  chatRoot.style.flexDirection = 'column';
  chatRoot.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.height = '58px';
  header.style.background = '#4CAF50';
  header.style.color = '#FFFFFF';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '0 12px';
  header.style.fontWeight = '700';
  header.textContent = 'AI Performance Coach';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#FFFFFF';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => closeAIFeedbackChat();
  header.appendChild(closeBtn);

  messagesEl = document.createElement('div');
  messagesEl.style.flex = '1';
  messagesEl.style.overflowY = 'auto';
  messagesEl.style.padding = '12px';
  messagesEl.style.background = '#1A1A2E';

  const miniQuestPanel = createMiniQuestPanel(context);

  const inputWrap = document.createElement('div');
  inputWrap.style.display = 'flex';
  inputWrap.style.gap = '8px';
  inputWrap.style.padding = '10px';
  inputWrap.style.background = '#23233A';

  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.placeholder = 'Ask about your performance...';
  inputEl.style.flex = '1';
  inputEl.style.border = '2px solid #4CAF50';
  inputEl.style.borderRadius = '8px';
  inputEl.style.padding = '8px 10px';
  inputEl.style.background = '#2A2A3E';
  inputEl.style.color = '#FFFFFF';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.style.background = '#4CAF50';
  sendBtn.style.border = 'none';
  sendBtn.style.color = '#FFFFFF';
  sendBtn.style.borderRadius = '8px';
  sendBtn.style.padding = '8px 12px';
  sendBtn.style.cursor = 'pointer';

  const sendHandler = async () => {
    if (!inputEl) return;
    const msg = inputEl.value.trim();
    if (!msg) return;

    inputEl.value = '';
    chatHistory.push({ role: 'user', message: msg });
    appendMessage('user', msg);
    await sendToAI(context, msg, false);
  };

  sendBtn.onclick = sendHandler;
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await sendHandler();
    }
  });

  inputWrap.appendChild(inputEl);
  inputWrap.appendChild(sendBtn);

  chatRoot.appendChild(header);
  chatRoot.appendChild(messagesEl);
  if (miniQuestPanel) {
    chatRoot.appendChild(miniQuestPanel);
  }
  chatRoot.appendChild(inputWrap);

  document.body.appendChild(chatRoot);
  inputEl.focus();

  const initial = `Game: ${context.gameType}\nScore: ${context.score ?? 0}\nWrong attempts: ${context.wrongAttempts ?? 0}\nPlease summarize performance and suggest improvements.`;
  sendToAI(context, initial, true);
}
