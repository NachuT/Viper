let monacoEditor = null;
let openTabs = [];
let activeTab = null;

function getTab(filePath) {
  return openTabs.find(t => t.filePath === filePath);
}

function createFileTree(container, folderPath, files) {
  files.forEach(f => {
    const li = document.createElement('li');
    li.className = 'py-1 px-2 rounded hover:bg-gray-700 cursor-pointer flex items-center';
    li.title = f.name;
    li.style.maxWidth = '200px';
    li.style.overflow = 'hidden';
    li.style.textOverflow = 'ellipsis';
    li.style.whiteSpace = 'nowrap';
    if (f.isDirectory) {
      li.innerHTML = `<span class="mr-1">📁</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:170px;vertical-align:middle;">${f.name}</span>`;
      li.onclick = async (e) => {
        e.stopPropagation();
        if (li.classList.contains('expanded')) {
          li.classList.remove('expanded');
          const ul = li.querySelector('ul');
          if (ul) ul.remove();
        } else {
          li.classList.add('expanded');
          const subPath = folderPath + '/' + f.name;
          const subFiles = await window.electronAPI.readDir(subPath);
          console.log('Subfolder:', subPath, subFiles);
          const ul = document.createElement('ul');
          ul.className = 'ml-4';
          createFileTree(ul, subPath, subFiles);
          li.appendChild(ul);
        }
      };
    } else {
      const filePath = folderPath + '/' + f.name;
      const tab = openTabs.find(t => t.filePath === filePath);
      const dirtyDot = tab && tab.dirty ? '<span style="color:#ff5c5c;font-size:1.1em;margin-left:0.4em;">●</span>' : '';
      li.innerHTML = `<span class="mr-1">📄</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:140px;vertical-align:middle;">${f.name}</span>${dirtyDot}`;
      li.onclick = async (e) => {
        e.stopPropagation();
        openFileTab(filePath, f.name);
        highlightSidebarFile(filePath);
      };
      li.dataset.filePath = filePath;
    }
    container.appendChild(li);
  });
}

function highlightSidebarFile(filePath) {
  document.querySelectorAll('#file-list li').forEach(li => {
    if (li.dataset.filePath === filePath) {
      li.classList.add('selected');
    } else {
      li.classList.remove('selected');
    }
  });
  document.querySelectorAll('#file-list li').forEach(li => {
    if (li.dataset.filePath) {
      const tab = openTabs.find(t => t.filePath === li.dataset.filePath);
      const dotSpan = li.querySelector('span[dirty-dot]');
      if (tab && tab.dirty) {
        if (!dotSpan) {
          const dot = document.createElement('span');
          dot.setAttribute('dirty-dot', '');
          dot.style.color = '#ff5c5c';
          dot.style.fontSize = '1.1em';
          dot.style.marginLeft = '0.4em';
          dot.textContent = '●';
          li.appendChild(dot);
        }
      } else {
        if (dotSpan) dotSpan.remove();
      }
    }
  });
}

function renderTabs() {
  const tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = '';
  openTabs.forEach(tab => {
    const tabEl = document.createElement('button');
    tabEl.className = 'tab' + (tab.filePath === activeTab ? ' active' : '');
    tabEl.title = tab.fileName;
    const dot = tab.dirty ? '<span style="color:#ff5c5c;font-size:1.2em;margin-left:0.5em;">●</span>' : '';
    tabEl.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:120px;vertical-align:middle;">${tab.fileName}</span>${dot}<span class="close ml-2">&times;</span>`;
    tabEl.onclick = (e) => {
      if (e.target.classList.contains('close')) {
        closeTab(tab.filePath);
      } else {
        setActiveTab(tab.filePath);
      }
    };
    tabBar.appendChild(tabEl);
  });
}

async function openFileTab(filePath, fileName) {
  let tab = openTabs.find(tab => tab.filePath === filePath);
  if (!tab) {
    let language = 'verilog';
    if (fileName.toLowerCase().endsWith('.sv')) language = 'systemverilog';
    else if (fileName.toLowerCase().endsWith('.v')) language = 'verilog';
    else language = 'plaintext';
    const { content } = await window.electronAPI.openFileFromPath(filePath);
    tab = { filePath, fileName, content, savedContent: content, dirty: false, language };
    openTabs.push(tab);
  }
  setActiveTab(filePath);
}

function setActiveTab(filePath) {
  activeTab = filePath;
  renderTabs();
  const tab = openTabs.find(t => t.filePath === filePath);
  if (tab && monacoEditor) {
    monacoEditor.setValue(tab.content);
    monaco.editor.setModelLanguage(monacoEditor.getModel(), tab.language || 'plaintext');
    monacoEditor.updateOptions({ readOnly: false });
    if (monacoEditor._viperListener) monacoEditor._viperListener.dispose();
    monacoEditor._viperListener = monacoEditor.onDidChangeModelContent(() => {
      const current = monacoEditor.getValue();
      tab.dirty = current !== tab.savedContent;
      tab.content = current;
      renderTabs();
    });
  }
  highlightSidebarFile(filePath);
}

function closeTab(filePath) {
  const idx = openTabs.findIndex(t => t.filePath === filePath);
  if (idx !== -1) {
    openTabs.splice(idx, 1);
    if (activeTab === filePath) {
      if (openTabs.length > 0) {
        setActiveTab(openTabs[Math.max(0, idx - 1)].filePath);
      } else {
        activeTab = null;
        if (monacoEditor) monacoEditor.setValue('// Start coding Verilog here!\n');
      }
    } else {
      renderTabs();
    }
  }
}

async function saveActiveFile() {
  if (!activeTab) return;
  const tab = openTabs.find(t => t.filePath === activeTab);
  if (!tab) return;
  const content = monacoEditor ? monacoEditor.getValue() : tab.content;
  await window.electronAPI.saveFileDirect(tab.filePath, content);
  tab.savedContent = content;
  tab.dirty = false;
  renderTabs();
  const tabBar = document.getElementById('tab-bar');
  const tabEls = tabBar.querySelectorAll('.tab');
  tabEls.forEach(el => {
    if (el.title === tab.fileName) {
      el.classList.add('saved');
      setTimeout(() => el.classList.remove('saved'), 800);
    }
  });
}

window.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveActiveFile();
  }
});

window.getActiveFilePath = function() {
  if (!activeTab) return null;
  const tab = openTabs.find(t => t.filePath === activeTab);
  return tab ? tab.filePath : null;
};
window.saveActiveFile = saveActiveFile;

window.onload = async function() {
  const folderPath = localStorage.getItem('viper-selected-folder');
  const fileList = document.getElementById('file-list');
  if (folderPath) {
    const files = await window.electronAPI.readDir(folderPath);
    console.log('Root folder:', folderPath, files);
    fileList.innerHTML = '';
    createFileTree(fileList, folderPath, files);
  } else {
    fileList.innerHTML = '<li class="text-red-400">No folder selected</li>';
  }

  require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
  require(['vs/editor/editor.main'], function () {
   
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'verilog')) {
      monaco.languages.register({ id: 'verilog' });
    }
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'systemverilog')) {
      monaco.languages.register({ id: 'systemverilog' });
    }
    const verilogTokenizer = {
      keywords: [
        'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'logic', 'always', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'for', 'while', 'repeat', 'forever', 'assign', 'function', 'endfunction', 'task', 'endtask', 'parameter', 'localparam', 'generate', 'endgenerate', 'genvar', 'initial', 'posedge', 'negedge', 'or', 'and', 'not', 'xor', 'nand', 'nor', 'xnor', 'default', 'disable', 'fork', 'join', 'wait', 'return', 'integer', 'real', 'time', 'signed', 'unsigned', 'typedef', 'enum', 'struct', 'union', 'package', 'import', 'export', 'virtual', 'interface', 'modport', 'ref', 'const', 'static', 'automatic', 'string', 'event', 'cell', 'config', 'design', 'library', 'use', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'else', 'elsif', 'undef', 'timescale', 'begin', 'end', 'do', 'while', 'break', 'continue', 'assert', 'cover', 'property', 'sequence', 'endproperty', 'endsequence', 'clocking', 'rand', 'randc', 'constraint', 'solve', 'before', 'inside', 'dist', 'unique', 'priority', 'randcase', 'randsequence', 'expect', 'covergroup', 'endgroup', 'coverpoint', 'cross', 'bins', 'illegal_bins', 'ignore_bins', 'wildcard', 'with', 'matches', 'intersect', 'throughout', 'first_match', 'nexttime', 's_nexttime', 'eventually', 's_eventually', 'until', 'until_with', 'implies', 'iff', 'accept_on', 'reject_on', 'sync_accept_on', 'sync_reject_on', 'restrict', 'let'
      ],
      operators: [ '=', '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '&', '|', '^', '~', '!', '&&', '||', '?', ':', '::', '.', ',', ';', '->', '<-', '#', '@', '$', '::', '**', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=' ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      tokenizer: {
        root: [
          [/[a-zA-Z_][a-zA-Z0-9_]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          { include: '@whitespace' },
          [/\d+'[bB][01xzXZ]+/, 'number.binary'],
          [/\d+'[hH][0-9a-fA-FxzXZ]+/, 'number.hex'],
          [/\d+'[oO][0-7xzXZ]+/, 'number.octal'],
          [/\d+'[dD][0-9xzXZ]+/, 'number'],
          [/\d+/, 'number'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],
          [/[{}\[\]()]/, '@brackets'],
          [/\"([^\"\\]|\\.)*$/, 'string.invalid'],
          [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],
          [/\/\*/,  'comment', '@comment' ],
          [/\/\/.*/, 'comment'],
        ],
        comment: [
          [/[^*/]+/, 'comment' ],
          [/\*\//,    'comment', '@pop'  ],
          [/./,  'comment' ]
        ],
        string: [
          [/[^\\"]+/,  'string'],
          [/\\./,      'string.escape.invalid'],
          [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
        ],
        whitespace: [
          [/\s+/, 'white'],
        ],
      }
    };
    monaco.languages.setMonarchTokensProvider('verilog', verilogTokenizer);
    monaco.languages.setMonarchTokensProvider('systemverilog', verilogTokenizer);
    monaco.editor.defineTheme('viper-verilog-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7fff7f', fontStyle: 'bold' },
        { token: 'number', foreground: 'ffb86c' },
        { token: 'number.hex', foreground: 'ffb86c' },
        { token: 'number.binary', foreground: 'ffb86c' },
        { token: 'number.octal', foreground: 'ffb86c' },
        { token: 'string', foreground: '7ecfff' },
        { token: 'string.quote', foreground: '7ecfff' },
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'operator', foreground: 'f78c6c' },
        { token: 'identifier', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editorLineNumber.foreground': '#444b55',
        'editorCursor.foreground': '#7fff7f',
        'editor.selectionBackground': '#31363f',
        'editor.inactiveSelectionBackground': '#232a36',
        'editor.lineHighlightBackground': '#232a36',
        'editorIndentGuide.background': '#232a36',
        'editorIndentGuide.activeBackground': '#7fff7f',
      }
    });
    monacoEditor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Start coding Verilog here!\n',
      language: 'verilog',
      theme: 'viper-verilog-dark',
      fontSize: 16,
      minimap: { enabled: false }
    });
    renderTabs();
    window.addEventListener('resize', () => {
      if (monacoEditor) monacoEditor.layout();
    });
    const editorContainer = document.getElementById('editor');
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (monacoEditor) monacoEditor.layout();
      }).observe(editorContainer);
    }

    const verilogKeywords = [
      'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'logic', 'always', 'always_comb', 'always_ff', 'always_latch', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'for', 'while', 'repeat', 'forever', 'assign', 'function', 'endfunction', 'task', 'endtask', 'parameter', 'localparam', 'generate', 'endgenerate', 'genvar', 'initial', 'posedge', 'negedge', 'or', 'and', 'not', 'xor', 'nand', 'nor', 'xnor', 'default', 'disable', 'fork', 'join', 'wait', 'return', 'integer', 'real', 'time', 'signed', 'unsigned', 'typedef', 'enum', 'struct', 'union', 'package', 'import', 'export', 'virtual', 'interface', 'modport', 'ref', 'const', 'static', 'automatic', 'string', 'event', 'cell', 'config', 'design', 'library', 'use', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'elsif', 'undef', 'timescale', 'do', 'break', 'continue', 'assert', 'cover', 'property', 'sequence', 'endproperty', 'endsequence', 'clocking', 'rand', 'randc', 'constraint', 'solve', 'before', 'inside', 'dist', 'unique', 'priority', 'randcase', 'randsequence', 'expect', 'covergroup', 'endgroup', 'coverpoint', 'cross', 'bins', 'illegal_bins', 'ignore_bins', 'wildcard', 'with', 'matches', 'intersect', 'throughout', 'first_match', 'nexttime', 's_nexttime', 'eventually', 's_eventually', 'until', 'until_with', 'implies', 'iff', 'accept_on', 'reject_on', 'sync_accept_on', 'sync_reject_on', 'restrict', 'let'
    ];
    function keywordCompletions() {
      return verilogKeywords.map(kw => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        detail: 'keyword',
      }));
    }
    ['verilog', 'systemverilog'].forEach(lang => {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: function(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };
          return {
            suggestions: keywordCompletions().map(item => ({ ...item, range }))
          };
        },
        triggerCharacters: ['.', ':', ' ', '_']
      });
    });
  });
}; 