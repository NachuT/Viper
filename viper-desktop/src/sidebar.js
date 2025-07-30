// AI Sidebar logic for Viper Editor
const aiSidebar = document.getElementById('ai-sidebar');
const aiChatForm = document.getElementById('ai-chat-form');
const aiChatInput = document.getElementById('ai-chat-input');
const aiChatSend = document.getElementById('ai-chat-send');
const aiChatHistory = document.getElementById('ai-chat-history');

let aiMessages = [];

function removeContentBetweenKeywords(text, startKeyword, endKeyword) {
  const escapedStartKeyword = startKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEndKeyword = endKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedStartKeyword}).*?(${escapedEndKeyword})`, 's');
  return text.replace(regex, '$1$2');
}

function createCodeBox(code) {
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = `
    background: #1e2127;
    border: 1px solid #333;
    border-radius: 6px;
    margin: 8px 0;
    position: relative;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9em;
  `;

  const codeHeader = document.createElement('div');
  codeHeader.style.cssText = `
    background: #2a2d35;
    padding: 8px 12px;
    border-bottom: 1px solid #333;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8em;
    color: #888;
  `;
  codeHeader.textContent = 'Code';

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.style.cssText = `
    background: #4ecdc4;
    color: #1e2127;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 0.75em;
    cursor: pointer;
    font-weight: bold;
  `;
  copyButton.onmouseover = () => copyButton.style.background = '#5dd8d0';
  copyButton.onmouseout = () => copyButton.style.background = '#4ecdc4';
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied!';
      setTimeout(() => copyButton.textContent = 'Copy', 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  codeHeader.appendChild(copyButton);

  const codeContent = document.createElement('div');
  codeContent.style.cssText = `
    padding: 12px;
    color: #e6e6e6;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
    line-height: 1.4;
  `;
  codeContent.textContent = code;

  codeContainer.appendChild(codeHeader);
  codeContainer.appendChild(codeContent);
  return codeContainer;
}

function renderChat() {
  aiChatHistory.innerHTML = '';
  aiMessages.forEach(msg => {
    const div = document.createElement('div');
    div.style.cssText = `
      white-space: pre-wrap;
      word-break: break-word;
      padding: 0.7em 1em;
      border-radius: 8px;
      max-width: 90%;
      align-self: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};
      background: ${msg.role === 'user' ? '#7fff7f22' : '#181c22'};
      color: ${msg.role === 'user' ? '#7fff7f' : '#fff'};
    `;

    if (msg.role === 'assistant') {
     
      const content = msg.content;
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let lastIndex = 0;
      let match;
      const fragments = [];

      while ((match = codeBlockRegex.exec(content)) !== null) {
 
        if (match.index > lastIndex) {
          const textFragment = document.createElement('span');
          textFragment.textContent = content.substring(lastIndex, match.index);
          fragments.push(textFragment);
        }


        const code = match[2].trim();
        const codeBox = createCodeBox(code);
        fragments.push(codeBox);

        lastIndex = match.index + match[0].length;
      }

    
      if (lastIndex < content.length) {
        const textFragment = document.createElement('span');
        textFragment.textContent = content.substring(lastIndex);
        fragments.push(textFragment);
      }

    
      if (fragments.length === 0) {
        div.textContent = content;
      } else {
        fragments.forEach(fragment => div.appendChild(fragment));
      }
    } else {
      div.textContent = msg.content;
    }

    aiChatHistory.appendChild(div);
  });
  aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

aiChatForm.onsubmit = async (e) => {
  e.preventDefault();
  const userMsg = aiChatInput.value.trim();
  if (!userMsg) return;
  aiMessages.push({ role: 'user', content: userMsg });
  renderChat();
  aiChatInput.value = '';
  aiChatInput.disabled = true;
  aiChatSend.disabled = true;

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
  
    aiMessages = aiMessages.filter(m => m.content !== 'Thinking...');
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      let assistantContent = data.choices[0].message.content;
      
  
      assistantContent = assistantContent.replace(/<think>.*?<\/think>/gs, '');
      assistantContent = assistantContent.replace(/<think.*?<\/think>/gs, '');
      assistantContent = assistantContent.replace(/think>.*?<\/think>/gs, '');
      
      aiMessages.push({ role: 'assistant', content: assistantContent });
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

