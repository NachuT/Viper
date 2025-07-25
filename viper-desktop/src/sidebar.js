// AI Sidebar logic for Viper Editor
const aiSidebar = document.getElementById('ai-sidebar');
const aiChatForm = document.getElementById('ai-chat-form');
const aiChatInput = document.getElementById('ai-chat-input');
const aiChatSend = document.getElementById('ai-chat-send');
const aiChatHistory = document.getElementById('ai-chat-history');

let aiMessages = [];

function renderChat() {
  aiChatHistory.innerHTML = '';
  aiMessages.forEach(msg => {
    const div = document.createElement('div');
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordBreak = 'break-word';
    div.style.padding = '0.7em 1em';
    div.style.borderRadius = '8px';
    div.style.maxWidth = '90%';
    div.style.alignSelf = msg.role === 'user' ? 'flex-end' : 'flex-start';
    div.style.background = msg.role === 'user' ? '#7fff7f22' : '#181c22';
    div.style.color = msg.role === 'user' ? '#7fff7f' : '#fff';
    div.textContent = msg.content;
    aiChatHistory.appendChild(div);
  });
  aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

// Remove all logic related to aiSidebarToggle and aiSidebarClose, and setSidebarVisible. Sidebar is always visible now.

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && aiSidebar.style.display === 'flex') {
    // This logic is no longer needed as the sidebar is always visible.
    // Keeping it for now in case it's used elsewhere or for future changes.
    // aiSidebar.style.display = 'none';
    // aiSidebar.style.minWidth = '0';
    // aiSidebar.style.maxWidth = '0';
    // aiSidebar.style.flex = '0 0 0';
    // aiSidebarToggle.style.display = 'flex';
  }
});

aiChatForm.onsubmit = async (e) => {
  e.preventDefault();
  const userMsg = aiChatInput.value.trim();
  if (!userMsg) return;
  aiMessages.push({ role: 'user', content: userMsg });
  renderChat();
  aiChatInput.value = '';
  aiChatInput.disabled = true;
  aiChatSend.disabled = true;
  // Show loading message
  aiMessages.push({ role: 'assistant', content: 'Thinking...' });
  renderChat();
  try {
    const response = await fetch('https://ai.hackclub.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: aiMessages.filter(m => m.role !== 'assistant') })
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    // Remove the loading message
    aiMessages = aiMessages.filter(m => m.content !== 'Thinking...');
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      aiMessages.push({ role: 'assistant', content: data.choices[0].message.content });
    } else {
      aiMessages.push({ role: 'assistant', content: 'Sorry, no response.' });
    }
    renderChat();
  } catch (err) {
    aiMessages = aiMessages.filter(m => m.content !== 'Thinking...');
    aiMessages.push({ role: 'assistant', content: 'Error: ' + err.message });
    renderChat();
  } finally {
    aiChatInput.disabled = false;
    aiChatSend.disabled = false;
    aiChatInput.focus();
  }
};

// Optional: open sidebar with Cmd+I or Ctrl+I
window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
    // This logic is no longer needed as the sidebar is always visible.
    // Keeping it for now in case it's used elsewhere or for future changes.
    // setSidebarVisible(true);
    aiChatInput.focus();
  }
}); 