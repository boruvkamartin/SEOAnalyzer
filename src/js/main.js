// Main JavaScript for SEO Analyzer

let analysisData = null;
let filteredResults = [];
let currentSort = 'status';
let currentFilter = 'all';
let currentSearch = '';

// Helper functions for SEO score display
function getScoreColor(score) {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreTextColor(score) {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-blue-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function showErrorToast(message) {
  // Vytvořit toast notification
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 glass p-4 rounded-xl border border-red-500/30 bg-red-500/10 shadow-2xl z-50 max-w-md animate-slide-in';
  toast.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold text-red-400 mb-1">Chyba</p>
        <p class="text-sm text-dark-text">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-dark-text-muted hover:text-dark-text transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Automaticky odstranit po 8 sekundách
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyzeForm');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  let abortController = null;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const url = formData.get('url').trim();
    const timeout = parseInt(formData.get('timeout')) || 10;
    const delay = parseFloat(formData.get('delay')) || 0.5;
    const limit = formData.get('limit') ? parseInt(formData.get('limit')) : null;
    const skipLinks = formData.get('skipLinks') === 'on';
    
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('URL musí začínat http:// nebo https://');
      return;
    }
    
    // Hide results, show loading
    results.classList.add('hidden');
    loading.classList.remove('hidden');
    analyzeBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    abortController = new AbortController();
    
    // Update progress
    updateProgress(0, 'Inicializace...');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          timeout,
          delay,
          limit,
          skipLinks
        }),
        signal: abortController.signal
      });
      
      // Přečíst response jako text (můžeme pak parsovat jako JSON nebo použít jako text)
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Chyba při analýze';
        try {
          // Zkusit parsovat jako JSON
          const error = JSON.parse(responseText);
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // Pokud není JSON, použít text přímo
          if (responseText && (responseText.includes('timeout') || responseText.includes('Timeout') || responseText.includes('timed out'))) {
            errorMessage = 'Analýza trvala příliš dlouho a byla přerušena. Zkuste snížit počet stránek pomocí limitu nebo přeskočit validaci broken links.';
          } else if (responseText) {
            errorMessage = responseText.substring(0, 200);
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      // Parsovat úspěšnou odpověď
      let data;
      try {
        if (!responseText || responseText.trim() === '') {
          throw new Error('Prázdná odpověď ze serveru');
        }
        data = JSON.parse(responseText);
      } catch (e) {
        // Pokud response není validní JSON
        if (responseText && (responseText.includes('timeout') || responseText.includes('Timeout'))) {
          throw new Error('Analýza trvala příliš dlouho a byla přerušena. Zkuste snížit počet stránek pomocí limitu nebo přeskočit validaci broken links.');
        }
        throw new Error('Neplatná odpověď ze serveru. Zkuste to znovu nebo snižte počet analyzovaných stránek.');
      }
      analysisData = data;
      
      updateProgress(100, 'Dokončeno!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      displayResults(data);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        updateProgress(0, 'Analýza byla zrušena');
      } else {
        // Zobrazit uživatelsky přívětivou chybovou hlášku
        const errorMessage = error.message || 'Neznámá chyba';
        updateProgress(0, 'Chyba při analýze');
        
        // Vytvořit moderní error toast místo alert
        showErrorToast(errorMessage);
        console.error('Analysis error:', error);
      }
    } finally {
      loading.classList.add('hidden');
      analyzeBtn.disabled = false;
      cancelBtn.classList.add('hidden');
      abortController = null;
    }
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
    }
  });
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', async () => {
    if (!analysisData) return;
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
      });
      
      if (!response.ok) {
        throw new Error('Chyba při exportu');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seo_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      alert('Chyba při exportu: ' + error.message);
      console.error(error);
    }
  });
  
  // Filters and sorting
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    applyFilters();
  });
  
  document.getElementById('sortBy').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });
  
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  });
  
  // Modal close
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('detailModal').classList.add('hidden');
  });
  
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
      document.getElementById('detailModal').classList.add('hidden');
    }
  });
});

function updateProgress(percent, text) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const loadingSubtext = document.getElementById('loadingSubtext');
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = `${Math.round(percent)}%`;
  }
  if (loadingSubtext) {
    loadingSubtext.textContent = text;
  }
}

function applyFilters() {
  if (!analysisData) return;
  
  let filtered = analysisData.results.filter(result => result.status !== 'ok');
  
  // Status filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(result => result.status === currentFilter);
  }
  
  // Search filter
  if (currentSearch) {
    filtered = filtered.filter(result => {
      const url = (result.url || '').toLowerCase();
      const title = (result.title || '').toLowerCase();
      return url.includes(currentSearch) || title.includes(currentSearch);
    });
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'url':
        return (a.url || '').localeCompare(b.url || '');
      case 'issues':
        return (b.issues?.length || 0) - (a.issues?.length || 0);
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'score':
        const scoreA = a.seo_score?.score || 0;
        const scoreB = b.seo_score?.score || 0;
        return scoreB - scoreA; // Sort descending (highest score first)
      case 'status':
      default:
        const statusOrder = { 'error': 0, 'warning': 1, 'ok': 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
    }
  });
  
  filteredResults = filtered;
  renderTable(filtered);
  updateResultsCount(filtered.length);
}

function updateResultsCount(count) {
  const total = analysisData ? analysisData.results.filter(r => r.status !== 'ok').length : 0;
  document.getElementById('resultsCount').textContent = `Zobrazeno ${count} z ${total} výsledků`;
}

function renderTable(results) {
  const tableBody = document.getElementById('resultsTableBody');
  tableBody.innerHTML = '';
  
  if (results.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-8 text-center text-dark-text-muted">
          <p class="text-lg font-semibold text-dark-text">Žádné výsledky</p>
          <p class="text-sm mt-2">Zkuste změnit filtry nebo vyhledávání.</p>
        </td>
      </tr>
    `;
    return;
  }
  
  results.forEach((result, index) => {
    const row = document.createElement('tr');
    const statusClass = result.status === 'error' ? 'status-error' : 
                       result.status === 'warning' ? 'status-warning' : 
                       'status-ok';
    
    row.className = result.status === 'error' ? 'bg-red-500/10 hover:bg-red-500/20 border-l-4 border-red-500' : 
                   result.status === 'warning' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-yellow-500' : 
                   'bg-green-500/10 hover:bg-green-500/20 border-l-4 border-green-500';
    row.dataset.index = index;
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-semibold rounded ${statusClass}">
          ${result.status === 'error' ? 'Chyba' : result.status === 'warning' ? 'Varování' : 'OK'}
        </span>
      </td>
      <td class="px-6 py-4">
        <a href="${result.url}" target="_blank" class="text-blue-600 hover:underline text-sm">
          ${result.url}
        </a>
      </td>
      <td class="px-6 py-4 text-sm">
        ${result.title || '<span class="text-dark-text-muted">Chybí</span>'}
        ${result.title ? `<br><span class="text-xs text-dark-text-muted">${result.title.length} znaků</span>` : ''}
      </td>
      <td class="px-6 py-4 text-sm text-dark-text">
        ${result.meta_description || '<span class="text-dark-text-muted">Chybí</span>'}
        ${result.meta_description ? `<br><span class="text-xs text-dark-text-muted">${result.meta_description.length} znaků</span>` : ''}
      </td>
      <td class="px-6 py-4 text-sm text-dark-text">
        ${result.h1 || '<span class="text-dark-text-muted">Chybí</span>'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        ${result.seo_score ? `
          <div class="flex items-center space-x-2">
            <div class="relative">
              <div class="w-16 h-16 rounded-full ${getScoreColor(result.seo_score.score)} flex items-center justify-center">
                <span class="text-lg font-bold text-white">${result.seo_score.score}</span>
              </div>
              <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-dark-surface border-2 ${getScoreColor(result.seo_score.score)} flex items-center justify-center shadow-lg">
                <span class="text-xs font-bold text-white">${result.seo_score.grade}</span>
              </div>
            </div>
          </div>
        ` : '<span class="text-dark-text-muted">-</span>'}
      </td>
      <td class="px-6 py-4 text-sm">
        ${result.issues && result.issues.length > 0 ? 
          `<ul class="list-disc list-inside text-xs">${result.issues.slice(0, 3).map(issue => `<li>${issue}</li>`).join('')}</ul>
           ${result.issues.length > 3 ? `<span class="text-xs text-dark-text-muted">+${result.issues.length - 3} dalších</span>` : ''}` : 
          '<span class="text-dark-text-muted">Žádné</span>'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <button 
          class="text-indigo-400 hover:text-indigo-300 text-sm font-medium detail-btn transition-colors"
          data-index="${index}"
        >
          Detail
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners for detail buttons
  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      showDetail(results[index]);
    });
  });
}

function showDetail(result) {
  const modal = document.getElementById('detailModal');
  const modalContent = document.getElementById('modalContent');
  const modalTitle = document.getElementById('modalTitle');
  
  modalTitle.textContent = result.url;
  
  modalContent.innerHTML = `
    <div class="space-y-6">
      <!-- SEO Score -->
      ${result.seo_score ? `
      <div class="glass p-6 rounded-xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-lg font-semibold text-dark-text mb-4 gradient-text">SEO Skóre</h4>
            <div class="flex items-center space-x-6">
              <div class="relative">
                <div class="w-24 h-24 rounded-full ${getScoreColor(result.seo_score.score)} flex items-center justify-center shadow-2xl">
                  <span class="text-3xl font-bold text-white">${result.seo_score.score}</span>
                </div>
                <div class="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-dark-surface border-4 ${getScoreColor(result.seo_score.score)} flex items-center justify-center shadow-lg">
                  <span class="text-lg font-bold text-white">${result.seo_score.grade}</span>
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <p class="text-sm text-dark-text-muted">Základní SEO</p>
                  <p class="text-lg font-semibold text-dark-text">${result.seo_score.breakdown.basic}/100</p>
                </div>
                <div>
                  <p class="text-sm text-dark-text-muted">Obsah</p>
                  <p class="text-lg font-semibold text-dark-text">${result.seo_score.breakdown.content}/100</p>
                </div>
                <div>
                  <p class="text-sm text-dark-text-muted">Technické</p>
                  <p class="text-lg font-semibold text-dark-text">${result.seo_score.breakdown.technical}/100</p>
                </div>
                <div>
                  <p class="text-sm text-dark-text-muted">Performance</p>
                  <p class="text-lg font-semibold text-dark-text">${result.seo_score.breakdown.performance}/100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Recommendations -->
      ${result.seo_score && result.seo_score.recommendations && result.seo_score.recommendations.length > 0 ? `
      <div>
        <h4 class="text-lg font-semibold mb-3">Doporučení (${result.seo_score.recommendations.length})</h4>
        <div class="space-y-3">
          ${result.seo_score.recommendations.map(rec => `
            <div class="border-l-4 ${rec.priority === 'high' ? 'border-red-500' : rec.priority === 'medium' ? 'border-yellow-500' : 'border-indigo-500'} glass p-4 rounded-xl">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <span class="px-3 py-1 text-xs font-semibold rounded-lg ${rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}">
                      ${rec.priority === 'high' ? 'Vysoká' : rec.priority === 'medium' ? 'Střední' : 'Nízká'} priorita
                    </span>
                    <span class="text-xs text-dark-text-muted">${rec.category}</span>
                  </div>
                  <p class="font-semibold text-dark-text mb-1">${rec.issue}</p>
                  <p class="text-sm text-dark-text mb-1">${rec.recommendation}</p>
                  <p class="text-xs text-dark-text-muted">Dopad: ${rec.impact}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Basic Info -->
      <div>
        <h4 class="text-lg font-semibold mb-3 text-dark-text">Základní informace</h4>
        <div class="grid grid-cols-2 gap-4">
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Status</p>
            <p class="font-semibold ${result.status === 'error' ? 'text-red-400' : result.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}">
              ${result.status === 'error' ? 'Chyba' : result.status === 'warning' ? 'Varování' : 'OK'}
            </p>
          </div>
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">HTTPS</p>
            <p class="font-semibold text-dark-text">${result.https ? 'Ano' : 'Ne'}</p>
          </div>
          ${result.page_size ? `
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Velikost stránky</p>
            <p class="font-semibold text-dark-text">${(result.page_size / 1024).toFixed(2)} KB</p>
          </div>
          ` : ''}
          ${result.mobile_friendly !== undefined ? `
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Mobile-friendly</p>
            <p class="font-semibold text-dark-text">${result.mobile_friendly ? 'Ano' : 'Ne'}</p>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- SEO Elements -->
      <div>
        <h4 class="text-lg font-semibold mb-3 text-dark-text">SEO prvky</h4>
        <div class="space-y-3">
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Title</p>
            <p class="font-semibold text-dark-text">${result.title || '<span class="text-dark-text-muted">Chybí</span>'}</p>
            ${result.title ? `<p class="text-xs text-dark-text-muted mt-1">${result.title.length} znaků</p>` : ''}
          </div>
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Meta Description</p>
            <p class="font-semibold text-dark-text">${result.meta_description || '<span class="text-dark-text-muted">Chybí</span>'}</p>
            ${result.meta_description ? `<p class="text-xs text-dark-text-muted mt-1">${result.meta_description.length} znaků</p>` : ''}
          </div>
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">H1</p>
            <p class="font-semibold text-dark-text">${result.h1 || '<span class="text-dark-text-muted">Chybí</span>'}</p>
          </div>
          ${result.canonical ? `
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Canonical URL</p>
            <p class="font-semibold"><a href="${result.canonical}" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition-colors">${result.canonical}</a></p>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Issues -->
      <div>
        <h4 class="text-lg font-semibold mb-3 text-dark-text">Problémy (${result.issues?.length || 0})</h4>
        ${result.issues && result.issues.length > 0 ? `
          <div class="glass p-4 rounded-xl">
            <ul class="list-disc list-inside space-y-2">
              ${result.issues.map(issue => `<li class="text-sm text-dark-text">${issue}</li>`).join('')}
            </ul>
          </div>
        ` : '<p class="text-sm text-dark-text-muted">Žádné problémy</p>'}
      </div>
      
      <!-- Extended Metrics -->
      ${result.external_links_count !== undefined || result.internal_links_count !== undefined ? `
      <div>
        <h4 class="text-lg font-semibold mb-3 text-dark-text">Odkazy</h4>
        <div class="grid grid-cols-2 gap-4">
          ${result.external_links_count !== undefined ? `
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Externí odkazy</p>
            <p class="font-semibold text-xl text-dark-text">${result.external_links_count}</p>
          </div>
          ` : ''}
          ${result.internal_links_count !== undefined ? `
          <div class="glass p-4 rounded-xl">
            <p class="text-sm text-dark-text-muted mb-1">Interní odkazy</p>
            <p class="font-semibold text-xl text-dark-text">${result.internal_links_count}</p>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      <!-- Structured Data -->
      ${result.structured_data && result.structured_data.length > 0 ? `
      <div>
        <h4 class="text-lg font-semibold mb-3">Strukturovaná data</h4>
        <div class="space-y-2">
          ${result.structured_data.map((sd, idx) => `
            <div class="glass p-4 rounded-xl">
              <p class="font-semibold text-dark-text">${sd.type}</p>
              ${sd.valid === false ? `
                <p class="text-sm text-red-400 mt-1">Neplatné</p>
                ${sd.errors ? `<ul class="text-xs text-red-400 mt-2 list-disc list-inside space-y-1">${sd.errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
              ` : '<p class="text-sm text-green-400 mt-1">Platné</p>'}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Broken Links -->
      ${result.broken_links_count !== undefined && result.broken_links_count > 0 ? `
      <div>
        <h4 class="text-lg font-semibold mb-3">Broken Links (${result.broken_links_count})</h4>
        ${result.broken_links_detail ? `
          ${result.broken_links_detail.broken_links && result.broken_links_detail.broken_links.length > 0 ? `
          <div class="mb-3">
            <p class="text-sm font-semibold mb-1">Broken odkazy:</p>
            <ul class="list-disc list-inside text-sm space-y-1">
              ${result.broken_links_detail.broken_links.slice(0, 10).map(link => `
                <li><a href="${link.url}" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition-colors">${link.url}</a> <span class="text-dark-text-muted">(${link.status || 'Error'})</span></li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          ${result.broken_links_detail.broken_images && result.broken_links_detail.broken_images.length > 0 ? `
          <div>
            <p class="text-sm font-semibold mb-2 text-dark-text">Broken obrázky:</p>
            <ul class="list-disc list-inside text-sm space-y-1">
              ${result.broken_links_detail.broken_images.slice(0, 10).map(img => `
                <li><a href="${img.url}" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition-colors">${img.url}</a> <span class="text-dark-text-muted">(${img.status || 'Error'})</span></li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
        ` : ''}
      </div>
      ` : ''}
    </div>
  `;
  
  modal.classList.remove('hidden');
}

function displayResults(data) {
  const results = document.getElementById('results');
  const summary = document.getElementById('summary');
  const dashboard = document.getElementById('dashboard');
  
  // Display dashboard/statistics
  if (data.statistics) {
    const stats = data.statistics;
    dashboard.innerHTML = `
      <h2 class="text-2xl font-bold mb-6 gradient-text">📊 Dashboard a statistiky</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="glass p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent">
          <p class="text-sm text-indigo-400 mb-2 font-semibold">Průměrná velikost stránky</p>
          <p class="text-3xl font-bold text-dark-text">${stats.avgPageSize > 0 ? (stats.avgPageSize / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
        </div>
        <div class="glass p-5 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
          <p class="text-sm text-purple-400 mb-2 font-semibold">Celkem externích odkazů</p>
          <p class="text-3xl font-bold text-dark-text">${stats.totalExternalLinks}</p>
        </div>
        <div class="glass p-5 rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent">
          <p class="text-sm text-pink-400 mb-2 font-semibold">Celkem interních odkazů</p>
          <p class="text-3xl font-bold text-dark-text">${stats.totalInternalLinks}</p>
        </div>
        <div class="glass p-5 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
          <p class="text-sm text-green-400 mb-2 font-semibold">Mobile-friendly stránek</p>
          <p class="text-3xl font-bold text-dark-text">${stats.mobileFriendlyPages} / ${stats.totalPages}</p>
        </div>
      </div>
      
      ${stats.topIssues && stats.topIssues.length > 0 ? `
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4 text-dark-text">🔴 Top problémy</h3>
        <div class="space-y-2">
          ${stats.topIssues.slice(0, 5).map((item, idx) => `
            <div class="flex items-center justify-between p-4 glass rounded-xl border-l-4 border-red-500">
              <span class="text-sm text-dark-text">${idx + 1}. ${item.issue}</span>
              <span class="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30">${item.count}x</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${data.advancedChecks ? `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="glass p-5 rounded-xl border border-yellow-500/30">
          <h3 class="font-semibold mb-3 text-dark-text">Sitemap</h3>
          <p class="text-sm ${data.advancedChecks.sitemap.valid ? 'text-green-400' : 'text-red-400'} font-semibold">
            ${data.advancedChecks.sitemap.valid ? '✓ Validní' : '✗ Nevalidní'}
          </p>
          ${data.advancedChecks.sitemap.issues && data.advancedChecks.sitemap.issues.length > 0 ? `
            <ul class="text-xs text-yellow-400 mt-3 list-disc list-inside space-y-1">
              ${data.advancedChecks.sitemap.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <div class="glass p-5 rounded-xl border border-yellow-500/30">
          <h3 class="font-semibold mb-3 text-dark-text">robots.txt</h3>
          <p class="text-sm ${data.advancedChecks.robots.exists ? 'text-green-400' : 'text-red-400'} font-semibold">
            ${data.advancedChecks.robots.exists ? '✓ Existuje' : '✗ Chybí'}
          </p>
          ${data.advancedChecks.robots.issues && data.advancedChecks.robots.issues.length > 0 ? `
            <ul class="text-xs text-yellow-400 mt-3 list-disc list-inside space-y-1">
              ${data.advancedChecks.robots.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
      ` : ''}
    `;
  }
  
  // Display summary
  const errorCount = data.results.filter(r => r.status === 'error').length;
  const warningCount = data.results.filter(r => r.status === 'warning').length;
  const okCount = data.results.filter(r => r.status === 'ok').length;
  
  summary.innerHTML = `
    <h2 class="text-2xl font-bold mb-6 gradient-text">Shrnutí analýzy</h2>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass p-5 rounded-xl border border-dark-border/30">
        <p class="text-sm text-dark-text-muted mb-2 font-semibold">Celkem stránek</p>
        <p class="text-3xl font-bold text-dark-text">${data.results.length}</p>
      </div>
      <div class="glass p-5 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
        <p class="text-sm text-red-400 mb-2 font-semibold">Chyby</p>
        <p class="text-3xl font-bold text-red-400">${errorCount}</p>
      </div>
      <div class="glass p-5 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent">
        <p class="text-sm text-yellow-400 mb-2 font-semibold">Varování</p>
        <p class="text-3xl font-bold text-yellow-400">${warningCount}</p>
      </div>
      <div class="glass p-5 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
        <p class="text-sm text-green-400 mb-2 font-semibold">OK</p>
        <p class="text-3xl font-bold text-green-400">${okCount}</p>
      </div>
      ${(() => {
        const scores = data.results.filter(r => r.seo_score?.score !== undefined).map(r => r.seo_score.score);
        if (scores.length > 0) {
          const avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
          return `
            <div class="glass p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
              <p class="text-sm text-indigo-400 mb-3 font-semibold">Průměrné SEO skóre</p>
              <div class="flex items-center space-x-3">
                <div class="w-14 h-14 rounded-full ${getScoreColor(avgScore)} flex items-center justify-center shadow-lg">
                  <span class="text-xl font-bold text-white">${avgScore}</span>
                </div>
                <div>
                  <p class="text-2xl font-bold text-dark-text">${avgScore}/100</p>
                  <p class="text-xs text-dark-text-muted">${scores.length} stránek hodnoceno</p>
                </div>
              </div>
            </div>
          `;
        }
        return '';
      })()}
    </div>
    ${data.duplicateTitles.length > 0 || data.duplicateDescriptions.length > 0 ? `
      <div class="mt-4 glass p-5 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent">
        <p class="font-semibold text-yellow-400 mb-3">Duplicity:</p>
        ${data.duplicateTitles.length > 0 ? `<p class="text-sm text-yellow-300 mb-1">Duplicitní title: ${data.duplicateTitles.length}</p>` : ''}
        ${data.duplicateDescriptions.length > 0 ? `<p class="text-sm text-yellow-300">Duplicitní description: ${data.duplicateDescriptions.length}</p>` : ''}
      </div>
    ` : ''}
  `;
  
  // Apply filters and render table
  applyFilters();
  
  results.classList.remove('hidden');
}
