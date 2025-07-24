window.onload = async function() {
  const boardSelect = document.getElementById('board-select');
  const nextToFolderBtn = document.getElementById('next-to-folder');
  const folderInput = document.getElementById('folder-input');
  const pickFolderBtn = document.getElementById('pick-folder-btn');
  const nextToModuleBtn = document.getElementById('next-to-module');
  const moduleInput = document.getElementById('module-input');
  const buildBtn = document.getElementById('build-btn');
  const buildResult = document.getElementById('build-result');
  const step0 = document.querySelector('.step-0');
  const step1 = document.querySelector('.step-1');
  const step2 = document.querySelector('.step-2');
  let selectedBoard = '';
  let selectedFolder = '';
  const successOverlay = document.getElementById('success-overlay');
  const successCanvas = document.getElementById('success-canvas');
  const successMessage = document.getElementById('success-message');
  const form = document.getElementById('generation-form');
  const returnHomeBtn = document.getElementById('return-home-btn');

  // Fetch board list and populate dropdown
  try {
    const boards = await window.electronAPI.apioBoardList();
    boards.forEach(boardLine => {
      // Match lines like: • boardname  (FPGA:...)
      const match = boardLine.match(/^•\s+([a-zA-Z0-9._-]+)/);
      if (match) {
        const shortName = match[1];
        const opt = document.createElement('option');
        opt.value = shortName;
        opt.textContent = shortName;
        boardSelect.appendChild(opt);
      }
    });
  } catch (e) {
    boardSelect.innerHTML = '<option value="">(Failed to load boards)</option>';
  }

  boardSelect.onchange = () => {
    selectedBoard = boardSelect.value;
    nextToFolderBtn.disabled = !selectedBoard;
  };

  nextToFolderBtn.onclick = () => {
    step0.classList.remove('active');
    step1.classList.add('active');
  };

  // Get folder from query param if present
  const params = new URLSearchParams(window.location.search);
  const initialFolder = params.get('folder');
  if (initialFolder) {
    selectedFolder = initialFolder;
    folderInput.value = initialFolder;
    nextToModuleBtn.disabled = false;
  }

  pickFolderBtn.onclick = async () => {
    const folder = await window.electronAPI.chooseFolder();
    if (folder) {
      selectedFolder = folder;
      folderInput.value = folder;
      nextToModuleBtn.disabled = false;
    }
  };

  nextToModuleBtn.onclick = () => {
    step1.classList.remove('active');
    step2.classList.add('active');
  };

  document.getElementById('generation-form').onsubmit = async (e) => {
    e.preventDefault();
    buildResult.style.color = '#7ecfff';
    buildResult.textContent = 'Building bitstream with Apio...';
    try {
      const result = await window.electronAPI.apioBuild({
        projectDir: selectedFolder,
        topFile: '', // No file selection now
        topModule: moduleInput.value,
        board: selectedBoard
      });
      if (result && result.success) {
        buildResult.style.color = '#7fff7f';
        buildResult.textContent = 'Bitstream generated: ' + (result.bitstream || 'Success!');
        runSuccessAnimation(result.bitstream);
      } else {
        buildResult.style.color = '#ff5c5c';
        buildResult.textContent = (result && result.error ? result.error : 'Bitstream generation failed.')
          + (result && result.output ? '\n\n' + result.output : '');
        if (result && result.output) {
          console.log('[Apio Build Output]', result.output);
        }
      }
    } catch (err) {
      buildResult.style.color = '#ff5c5c';
      buildResult.textContent = err.message || 'Bitstream generation failed.';
    }
  };

  function runSuccessAnimation(bitstreamPath) {
    // Hide form and result
    form.style.display = 'none';
    buildResult.style.display = 'none';
    // Show overlay
    successOverlay.style.display = 'flex';
    const confettiCanvas = document.getElementById('confetti-canvas');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const ctx = confettiCanvas.getContext('2d');
    const W = confettiCanvas.width;
    const H = confettiCanvas.height;
    ctx.clearRect(0, 0, W, H);
    // Confetti setup
    const colors = ['#7fff7f', '#00ff99', '#39ff14', '#00ffcc', '#baffc9', '#fff', '#ffb86c', '#7ecfff'];
    const confetti = [];
    const numConfetti = 80;
    for (let i = 0; i < numConfetti; i++) {
      confetti.push({
        x: Math.random() * W,
        y: Math.random() * -H,
        r: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2 + Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
    let startTime = null;
    let duration = 2000; // 2 seconds
    let messageShown = false;
    function drawConfettiPiece(c) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    }
    function animate(ts) {
      if (!startTime) startTime = ts;
      let elapsed = ts - startTime;
      ctx.clearRect(0, 0, W, H);
      confetti.forEach(c => {
        c.x += Math.sin(c.angle) * 1.5;
        c.y += c.speed;
        c.angle += c.spin;
        if (c.y > H + 20) {
          c.y = -10;
          c.x = Math.random() * W;
        }
        drawConfettiPiece(c);
      });
      if (!messageShown && elapsed < duration) {
        requestAnimationFrame(animate);
      } else if (!messageShown) {
        messageShown = true;
        setTimeout(() => {
          confettiCanvas.style.transition = 'opacity 0.7s';
          confettiCanvas.style.opacity = 0;
          setTimeout(() => {
            confettiCanvas.style.display = 'none';
            successMessage.style.display = 'block';
            successMessage.style.transform = 'translateY(-80px)';
            successMessage.style.opacity = 0;
            successMessage.innerHTML = `Success!<br>Your bitstream is at:<br><span style='font-size:1.1rem;color:#fff;text-shadow:0 0 8px #7fff7f;'>${bitstreamPath || ''}</span>`;
            setTimeout(() => {
              successMessage.style.transition = 'opacity 0.7s, transform 0.7s';
              successMessage.style.opacity = 1;
              successMessage.style.transform = 'translateY(0)';
              returnHomeBtn.style.display = 'block';
            }, 50);
          }, 700);
        }, 300);
        // Keep confetti falling after message
        function confettiLoop() {
          ctx.clearRect(0, 0, W, H);
          confetti.forEach(c => {
            c.x += Math.sin(c.angle) * 1.5;
            c.y += c.speed;
            c.angle += c.spin;
            if (c.y > H + 20) {
              c.y = -10;
              c.x = Math.random() * W;
            }
            drawConfettiPiece(c);
          });
          if (successMessage.style.display === 'block') {
            requestAnimationFrame(confettiLoop);
          }
        }
        confettiLoop();
      }
    }
    requestAnimationFrame(animate);
    returnHomeBtn.onclick = () => {
      window.location = 'index.html';
    };
  }
}; 