let monacoEditor = null;
let openTabs = [];
let activeTab = null;

function getTab(filePath) {
  return openTabs.find(t => t.filePath === filePath);
}

function createFileTree(container, folderPath, files, depth = 0, showAll = false) {
 
  files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  const MAX_ITEMS = 20;
  const shouldCompress = !showAll && files.length > MAX_ITEMS;
  const filesToShow = shouldCompress ? files.slice(0, MAX_ITEMS) : files;

  filesToShow.forEach(f => {
    const li = document.createElement('li');
    li.className = 'py-1 px-2 rounded hover:bg-gray-700 cursor-pointer flex items-center';
    li.title = f.name;
    li.style.maxWidth = '200px';
    li.style.overflow = 'hidden';
    li.style.textOverflow = 'ellipsis';
    li.style.whiteSpace = 'nowrap';
    // Dotfiles/folders: de-emphasize
    if (f.name.startsWith('.')) {
      li.style.opacity = '0.6';
    }
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
          const ul = document.createElement('ul');
          ul.className = 'ml-4';
          createFileTree(ul, subPath, subFiles, depth + 1);
          li.appendChild(ul);
        }
      };
      // Collapse .git and other dotfolders by default
      if (f.name.startsWith('.')) {
        li.classList.add('collapsed');
      }
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

  if (shouldCompress) {
    const moreLi = document.createElement('li');
    moreLi.className = 'py-1 px-2 rounded hover:bg-gray-700 cursor-pointer flex items-center text-blue-400';
    moreLi.textContent = `Show ${files.length - MAX_ITEMS} more...`;
    moreLi.onclick = () => {
      container.innerHTML = '';
      createFileTree(container, folderPath, files, depth, true);
    };
    container.appendChild(moreLi);
  }
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
    
    const model = monaco.editor.createModel(content, language);
    tab = { 
      filePath, 
      fileName, 
      savedContent: content, 
      dirty: false, 
      language, 
      model,
      listener: null
    };

    tab.listener = model.onDidChangeContent(() => {
      tab.dirty = model.getValue() !== tab.savedContent;
      renderTabs();
      highlightSidebarFile(filePath);
    });

    openTabs.push(tab);
  }
  setActiveTab(filePath);
}

function setActiveTab(filePath) {
  activeTab = filePath;
  renderTabs();
  const tab = openTabs.find(t => t.filePath === filePath);
  if (tab && monacoEditor) {
    monacoEditor.setModel(tab.model);
    monacoEditor.updateOptions({ readOnly: false });
  }
  highlightSidebarFile(filePath);
}

function closeTab(filePath) {
  const idx = openTabs.findIndex(t => t.filePath === filePath);
  if (idx !== -1) {
    const tabToClose = openTabs[idx];
    if (tabToClose.model) tabToClose.model.dispose();
    if (tabToClose.listener) tabToClose.listener.dispose();

    openTabs.splice(idx, 1);
    if (activeTab === filePath) {
      if (openTabs.length > 0) {
        setActiveTab(openTabs[Math.max(0, idx - 1)].filePath);
      } else {
        activeTab = null;
        if (monacoEditor) {
          monacoEditor.setModel(null);
          monacoEditor.setValue('// Start coding Verilog here!\n');
        }
      }
    }
    renderTabs();
  }
}

async function saveActiveFile() {
  if (!activeTab) return;
  const tab = openTabs.find(t => t.filePath === activeTab);
  if (!tab) return;
  const content = tab.model.getValue();
  await window.electronAPI.saveFileDirect(tab.filePath, content);
  tab.savedContent = content;
  tab.dirty = false;
  renderTabs();
  highlightSidebarFile(tab.filePath);
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
  // --- Top Search Bar Elements ---
  const topSearchBar = document.getElementById('top-search-bar');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  let allFilesFlat = [];
  let searchActive = false;

  if (folderPath) {
    const files = await window.electronAPI.readDir(folderPath);
    fileList.innerHTML = '';
    createFileTree(fileList, folderPath, files);
    // Recursively flatten all files for search
    async function flattenFiles(dir, files) {
      let out = [];
      for (const f of files) {
        if (f.isDirectory) {
          const subFiles = await window.electronAPI.readDir(dir + '/' + f.name);
          out = out.concat(await flattenFiles(dir + '/' + f.name, subFiles));
        } else {
          out.push({ filePath: dir + '/' + f.name, fileName: f.name });
        }
      }
      return out;
    }
    allFilesFlat = await flattenFiles(folderPath, files);
  } else {
    fileList.innerHTML = '<li class="text-red-400">No folder selected</li>';
  }



  searchInput && searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    searchResults.innerHTML = '';
    if (!q) { searchResults.style.display = 'none'; return; }
    let results = [];
    if (q.startsWith('>')) {
      // Command mode (basic demo)
      const commands = [
        { label: 'Toggle Terminal', action: () => document.getElementById('toggle-terminal-btn').click() },
        { label: 'New File (not implemented)', action: () => {} },
      ];
      results = commands.filter(cmd => cmd.label.toLowerCase().includes(q.slice(1).toLowerCase()));
      results.forEach((cmd, i) => {
        const li = document.createElement('li');
        li.textContent = cmd.label;
        li.className = 'px-2 py-1 rounded hover:bg-gray-700 cursor-pointer';
        li.onclick = () => { cmd.action(); searchResults.style.display = 'none'; };
        searchResults.appendChild(li);
      });
      searchResults.style.display = results.length ? 'block' : 'none';
      return;
    }
    // File search
    results = allFilesFlat.filter(f => f.fileName.toLowerCase().includes(q.toLowerCase()));
    results.slice(0, 20).forEach((f, i) => {
      const li = document.createElement('li');
      li.textContent = f.fileName + ' — ' + f.filePath;
      li.className = 'px-2 py-1 rounded hover:bg-gray-700 cursor-pointer';
      li.onclick = () => {
        openFileTab(f.filePath, f.fileName);
        searchResults.style.display = 'none';
      };
      searchResults.appendChild(li);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
  });
  // Keyboard navigation (basic)
  searchInput && searchInput.addEventListener('keydown', (e) => {
    const items = Array.from(searchResults.children);
    let idx = items.findIndex(li => li.classList.contains('selected'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx >= 0) items[idx].classList.remove('selected');
      idx = Math.min(idx + 1, items.length - 1);
      if (items[idx]) items[idx].classList.add('selected');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx >= 0) items[idx].classList.remove('selected');
      idx = Math.max(idx - 1, 0);
      if (items[idx]) items[idx].classList.add('selected');
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      items[idx].click();
    }
  });

  // Only use require() for Monaco
  require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
  require(['vs/editor/editor.main'], function (monaco) {
    // Use global Terminal and FitAddon from UMD bundles
    const Terminal = window.Terminal;
    const FitAddon = window.FitAddon.FitAddon || window.FitAddon;

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

    // Add Verilog syntax check functionality
    const syntaxCheckBtn = document.getElementById('syntax-check-btn');
    const syntaxCheckResult = document.getElementById('syntax-check-result');

    if (syntaxCheckBtn && syntaxCheckResult) {
      syntaxCheckResult.style.whiteSpace = 'pre-wrap';
      syntaxCheckResult.style.wordBreak = 'break-all';
      syntaxCheckResult.style.cursor = 'pointer';

      syntaxCheckBtn.onclick = async () => {
        if (!activeTab) {
          syntaxCheckResult.textContent = 'No active file selected.';
          syntaxCheckResult.style.color = '#ffcc00'; // A warning-yellow color
          setTimeout(() => { syntaxCheckResult.textContent = ''; }, 3000);
          return;
        }

        await saveActiveFile();

        const filePath = activeTab;
        syntaxCheckResult.textContent = 'Checking syntax...';
        syntaxCheckResult.style.color = '#d4d4d4'; // A neutral-gray color

        const result = await window.electronAPI.verilogSyntaxCheck(filePath);

        if (result.success) {
          syntaxCheckResult.textContent = 'Syntax OK';
          syntaxCheckResult.style.color = '#7fff7f'; // A success-green color
          setTimeout(() => { syntaxCheckResult.textContent = ''; }, 3000);
        } else {
          syntaxCheckResult.textContent = result.error;
          syntaxCheckResult.style.color = '#ff5c5c'; // A failure-red color
        }
      };
      
      syntaxCheckResult.onclick = () => {
        syntaxCheckResult.textContent = '';
      };
    }

    // Terminal Logic
    const terminalContainer = document.getElementById('terminal-container');
    const terminalEl = document.getElementById('terminal');
    const closeTerminalBtn = document.getElementById('close-terminal-btn');
    const toggleTerminalBtn = document.getElementById('toggle-terminal-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');
    let term = null;
    let fitAddon = null;

    function toggleTerminal(visible) {
      if (visible) {
        terminalContainer.style.display = 'block';
        if (!term) {
          term = new Terminal({
            cursorBlink: true,
            theme: {
              background: '#1e1e1e',
              foreground: '#d4d4d4',
              cursor: '#7fff7f',
            }
          });
          const FitAddonClass = window.FitAddon.FitAddon || window.FitAddon;
          fitAddon = new FitAddonClass();
          term.loadAddon(fitAddon);
          term.open(terminalEl);
          term.writeln('\x1b[36mType commands here. Press the remove icon to clear.\x1b[0m');
          window.electronAPI.termSpawn({
            shell: 'zsh',
            cols: term.cols,
            rows: term.rows,
            cwd: folderPath || process.env.HOME
          });

          fitAddon.fit();
          
          term.onData(data => window.electronAPI.termWrite(data));
          window.electronAPI.onTermData(data => term.write(data));
          window.electronAPI.onTermExit(() => {
            term.dispose();
            term = null;
            fitAddon = null;
            terminalContainer.style.display = 'none';
          });
        }
        setTimeout(() => term && term.focus(), 100);
      } else {
        terminalContainer.style.display = 'none';
      }
    }

    if (toggleTerminalBtn) {
      toggleTerminalBtn.onclick = () => {
        const isVisible = terminalContainer.style.display === 'block';
        toggleTerminal(!isVisible);
      };
    }

    closeTerminalBtn.onclick = () => toggleTerminal(false);
    
    if (clearTerminalBtn) {
      clearTerminalBtn.onclick = () => {
        if (term) {
          term.clear();
          term.writeln('\x1b[36mType commands here. Press the broom icon to clear.\x1b[0m');
        }
      };
    }
    
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (terminalContainer.style.display === 'block' && fitAddon) {
          fitAddon.fit();
          const { cols, rows } = term;
          window.electronAPI.termResize({ cols, rows });
        }
      }).observe(terminalContainer);
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

    // --- Toolchain Banner Logic ---
    const toolchainBanner = document.getElementById('toolchain-banner');
    const toolchainInstructions = document.getElementById('toolchain-instructions');
    const copyToolchainCmd = document.getElementById('copy-toolchain-cmd');
    let toolchainCmd = '';
    function detectOS() {
      const platform = (typeof process !== 'undefined' && process.platform) ? process.platform : navigator.platform;
      if (platform.startsWith('Win') || platform === 'win32') {
        toolchainCmd = 'pacman -Syu\npacman -S mingw-w64-x86_64-yosys mingw-w64-x86_64-icestorm mingw-w64-x86_64-nextpnr-ice40';
        toolchainInstructions.textContent = 'On Windows (MSYS2): Install MSYS2, then run:';
      } else if (platform === 'darwin' || platform.toLowerCase().includes('mac')) {
        toolchainCmd = 'brew install yosys icestorm nextpnr-ice40';
        toolchainInstructions.textContent = 'On macOS: Run this in your terminal:';
      } else {
        toolchainCmd = 'sudo apt install yosys icestorm nextpnr-ice40';
        toolchainInstructions.textContent = 'On Linux: Run this in your terminal:';
      }
    }
    detectOS();
    copyToolchainCmd.onclick = () => {
      navigator.clipboard.writeText(toolchainCmd);
      copyToolchainCmd.textContent = 'Copied!';
      setTimeout(() => { copyToolchainCmd.textContent = 'Copy Command'; }, 1500);
    };
  });
  const bitstreamBtn = document.getElementById('bitstream-btn');
  if (bitstreamBtn) {
    bitstreamBtn.onclick = () => {
      const folder = localStorage.getItem('viper-selected-folder') || '';
      window.location = `generation.html${folder ? '?folder=' + encodeURIComponent(folder) : ''}`;
    };
  }
}; 