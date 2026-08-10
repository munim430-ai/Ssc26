document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const cloneForm = document.getElementById('cloneForm');
  const targetUrlInput = document.getElementById('targetUrl');
  const cloneBtn = document.getElementById('cloneBtn');
  const limitContainer = document.getElementById('limitContainer');
  const crawlLimit = document.getElementById('crawlLimit');
  
  const statusConsole = document.getElementById('statusConsole');
  const statusMessage = document.getElementById('statusMessage');
  const progressFill = document.getElementById('progressFill');
  const logStream = document.getElementById('logStream');
  const statusTimer = document.getElementById('statusTimer');
  
  const libraryList = document.getElementById('libraryList');
  const librarySearch = document.getElementById('librarySearch');
  const cloneCount = document.getElementById('cloneCount');
  
  const welcomeScreen = document.getElementById('welcomeScreen');
  const studioViewer = document.getElementById('studioViewer');
  
  const viewTitle = document.getElementById('viewTitle');
  const viewUrl = document.getElementById('viewUrl');
  const previewIframe = document.getElementById('previewIframe');
  const iframeWrapper = document.getElementById('iframeWrapper');
  
  const markdownContent = document.getElementById('markdownContent');
  const htmlContent = document.getElementById('htmlContent');
  const metadataContent = document.getElementById('metadataContent');
  const screenshotImg = document.getElementById('screenshotImg');
  
  const openExternalBtn = document.getElementById('openExternalBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const copyMdBtn = document.getElementById('copyMdBtn');
  const copyHtmlBtn = document.getElementById('copyHtmlBtn');
  
  let currentClone = null;
  let timerInterval = null;

  // Initialize
  loadLibrary();

  // Mode change
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'crawl') {
        limitContainer.style.display = 'flex';
      } else {
        limitContainer.style.display = 'none';
      }
    });
  });

  // Quick Demo Buttons
  document.querySelectorAll('.demo-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      targetUrlInput.value = btn.dataset.url;
      cloneForm.dispatchEvent(new Event('submit'));
    });
  });

  // Form Submit
  cloneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = targetUrlInput.value.trim();
    if (!url) return;

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const limit = crawlLimit.value;

    startCloning(url, mode, limit);
  });

  async function startCloning(url, mode, limit) {
    // UI Reset
    statusConsole.style.display = 'flex';
    progressFill.style.width = '15%';
    logStream.innerHTML = '';
    cloneBtn.disabled = true;
    
    addLog(`🚀 Sending request to Firecrawl API for ${url}...`);
    addLog(`⚙️ Mode: ${mode.toUpperCase()} ${mode === 'crawl' ? `(Limit: ${limit} pages)` : ''}`);
    
    let seconds = 0;
    statusTimer.textContent = '00:00';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds++;
      const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      statusTimer.textContent = `${mins}:${secs}`;
    }, 1000);

    try {
      progressFill.style.width = '45%';
      statusMessage.textContent = mode === 'crawl' ? 'Crawling website pages...' : 'Scraping target page & extracting assets...';

      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode, limit })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Cloning failed');
      }

      progressFill.style.width = '100%';
      addLog(`✅ Cloning completed! Site saved to ${result.folderName}`);
      statusMessage.textContent = 'Website cloned successfully!';

      setTimeout(() => {
        statusConsole.style.display = 'none';
        clearInterval(timerInterval);
      }, 2000);

      await loadLibrary();
      selectClone(result.folderName);
    } catch (err) {
      clearInterval(timerInterval);
      progressFill.style.backgroundColor = '#f43f5e';
      statusMessage.textContent = `Error: ${err.message}`;
      addLog(`❌ Failure: ${err.message}`);
    } finally {
      cloneBtn.disabled = false;
    }
  }

  function addLog(msg) {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logStream.appendChild(div);
    logStream.scrollTop = logStream.scrollHeight;
  }

  // Load Cloned Sites Library
  async function loadLibrary() {
    try {
      const res = await fetch('/api/clones');
      const clones = await res.json();

      cloneCount.textContent = clones.length;

      if (clones.length === 0) {
        libraryList.innerHTML = `
          <div class="empty-state">
            <p>No cloned sites yet.</p>
            <small>Enter a URL to clone your first site.</small>
          </div>`;
        return;
      }

      libraryList.innerHTML = '';
      clones.forEach(clone => {
        const item = document.createElement('div');
        item.className = `library-item ${currentClone === clone.folderName ? 'active' : ''}`;
        item.dataset.folder = clone.folderName;

        const dateStr = clone.clonedAt ? new Date(clone.clonedAt).toLocaleDateString() : '';

        item.innerHTML = `
          <div class="item-top">
            <span class="item-title">${escapeHtml(clone.title || clone.folderName)}</span>
          </div>
          <span class="item-url">${escapeHtml(clone.targetUrl)}</span>
          <div class="item-meta">
            <span>${dateStr}</span>
            <span>${clone.totalPages ? clone.totalPages + ' pages' : 'Single page'}</span>
          </div>
          <div class="item-actions">
            <button class="btn-mini btn-view">Preview</button>
            <button class="btn-mini btn-delete" data-folder="${clone.folderName}">Delete</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation();
            deleteClone(clone.folderName);
          } else {
            selectClone(clone.folderName);
          }
        });

        libraryList.appendChild(item);
      });
    } catch (e) {
      console.error('Failed to load library:', e);
    }
  }

  // Select and View Clone
  async function selectClone(folderName) {
    currentClone = folderName;

    // Highlight sidebar
    document.querySelectorAll('.library-item').forEach(el => {
      el.classList.toggle('active', el.dataset.folder === folderName);
    });

    welcomeScreen.style.display = 'none';
    studioViewer.style.display = 'flex';

    try {
      const res = await fetch(`/api/clones/${folderName}`);
      const data = await res.json();

      viewTitle.textContent = data.metadata.title || folderName;
      viewUrl.textContent = data.metadata.targetUrl || '';
      openExternalBtn.href = data.previewUrl;
      downloadZipBtn.onclick = () => window.location.href = `/api/clones/${folderName}/download`;

      // Load tab contents
      previewIframe.src = data.previewUrl;
      markdownContent.textContent = data.markdown || 'No Markdown extracted.';
      htmlContent.textContent = data.html || 'No HTML extracted.';
      metadataContent.textContent = JSON.stringify(data.metadata, null, 2);

      if (data.screenshotUrl) {
        screenshotImg.src = data.screenshotUrl;
        document.querySelector('[data-tab="screenshot"]').style.display = 'block';
      } else {
        document.querySelector('[data-tab="screenshot"]').style.display = 'none';
      }
    } catch (err) {
      alert(`Error loading clone: ${err.message}`);
    }
  }

  // Delete Clone
  async function deleteClone(folderName) {
    if (!confirm(`Are you sure you want to delete "${folderName}"?`)) return;

    try {
      await fetch(`/api/clones/${folderName}`, { method: 'DELETE' });
      if (currentClone === folderName) {
        currentClone = null;
        studioViewer.style.display = 'none';
        welcomeScreen.style.display = 'flex';
      }
      loadLibrary();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  // Tabs Switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`pane-${btn.dataset.tab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Device Responsive Frame Toggle
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const device = btn.dataset.device;
      iframeWrapper.className = `iframe-wrapper ${device}`;
    });
  });

  // Copy Buttons
  copyMdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(markdownContent.textContent);
    copyMdBtn.textContent = 'Copied!';
    setTimeout(() => copyMdBtn.textContent = 'Copy Markdown', 2000);
  });

  copyHtmlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(htmlContent.textContent);
    copyHtmlBtn.textContent = 'Copied!';
    setTimeout(() => copyHtmlBtn.textContent = 'Copy HTML', 2000);
  });

  // Search Filter
  librarySearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.library-item').forEach(item => {
      const title = item.querySelector('.item-title').textContent.toLowerCase();
      const url = item.querySelector('.item-url').textContent.toLowerCase();
      item.style.display = (title.includes(q) || url.includes(q)) ? 'flex' : 'none';
    });
  });

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
