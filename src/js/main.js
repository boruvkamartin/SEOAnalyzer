// Main JavaScript for SEO Analyzer

let analysisData = null;
let filteredResults = [];
let currentSort = 'status';
let currentFilter = 'all';
let currentSearch = '';

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
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Chyba při analýze');
      }
      
      const data = await response.json();
      analysisData = data;
      
      updateProgress(100, 'Dokončeno!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      displayResults(data);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        updateProgress(0, 'Analýza byla zrušena');
      } else {
        alert('Chyba: ' + error.message);
        console.error(error);
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
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          <p class="text-lg font-semibold">Žádné výsledky</p>
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
    
    row.className = result.status === 'error' ? 'bg-red-50 hover:bg-red-100' : 
                   result.status === 'warning' ? 'bg-yellow-50 hover:bg-yellow-100' : 
                   'bg-green-50 hover:bg-green-100';
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
        ${result.title || '<span class="text-gray-400">Chybí</span>'}
        ${result.title ? `<br><span class="text-xs text-gray-500">${result.title.length} znaků</span>` : ''}
      </td>
      <td class="px-6 py-4 text-sm">
        ${result.meta_description || '<span class="text-gray-400">Chybí</span>'}
        ${result.meta_description ? `<br><span class="text-xs text-gray-500">${result.meta_description.length} znaků</span>` : ''}
      </td>
      <td class="px-6 py-4 text-sm">
        ${result.h1 || '<span class="text-gray-400">Chybí</span>'}
      </td>
      <td class="px-6 py-4 text-sm">
        ${result.issues && result.issues.length > 0 ? 
          `<ul class="list-disc list-inside text-xs">${result.issues.slice(0, 3).map(issue => `<li>${issue}</li>`).join('')}</ul>
           ${result.issues.length > 3 ? `<span class="text-xs text-gray-500">+${result.issues.length - 3} dalších</span>` : ''}` : 
          '<span class="text-gray-400">Žádné</span>'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <button 
          class="text-blue-600 hover:text-blue-800 text-sm font-medium detail-btn"
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
      <!-- Basic Info -->
      <div>
        <h4 class="text-lg font-semibold mb-3">Základní informace</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Status</p>
            <p class="font-semibold ${result.status === 'error' ? 'text-red-600' : result.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}">
              ${result.status === 'error' ? 'Chyba' : result.status === 'warning' ? 'Varování' : 'OK'}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-600">HTTPS</p>
            <p class="font-semibold">${result.https ? 'Ano' : 'Ne'}</p>
          </div>
          ${result.page_size ? `
          <div>
            <p class="text-sm text-gray-600">Velikost stránky</p>
            <p class="font-semibold">${(result.page_size / 1024).toFixed(2)} KB</p>
          </div>
          ` : ''}
          ${result.mobile_friendly !== undefined ? `
          <div>
            <p class="text-sm text-gray-600">Mobile-friendly</p>
            <p class="font-semibold">${result.mobile_friendly ? 'Ano' : 'Ne'}</p>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- SEO Elements -->
      <div>
        <h4 class="text-lg font-semibold mb-3">SEO prvky</h4>
        <div class="space-y-2">
          <div>
            <p class="text-sm text-gray-600">Title</p>
            <p class="font-semibold">${result.title || '<span class="text-gray-400">Chybí</span>'}</p>
            ${result.title ? `<p class="text-xs text-gray-500">${result.title.length} znaků</p>` : ''}
          </div>
          <div>
            <p class="text-sm text-gray-600">Meta Description</p>
            <p class="font-semibold">${result.meta_description || '<span class="text-gray-400">Chybí</span>'}</p>
            ${result.meta_description ? `<p class="text-xs text-gray-500">${result.meta_description.length} znaků</p>` : ''}
          </div>
          <div>
            <p class="text-sm text-gray-600">H1</p>
            <p class="font-semibold">${result.h1 || '<span class="text-gray-400">Chybí</span>'}</p>
          </div>
          ${result.canonical ? `
          <div>
            <p class="text-sm text-gray-600">Canonical URL</p>
            <p class="font-semibold"><a href="${result.canonical}" target="_blank" class="text-blue-600 hover:underline">${result.canonical}</a></p>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Issues -->
      <div>
        <h4 class="text-lg font-semibold mb-3">Problémy (${result.issues?.length || 0})</h4>
        ${result.issues && result.issues.length > 0 ? `
          <ul class="list-disc list-inside space-y-1">
            ${result.issues.map(issue => `<li class="text-sm">${issue}</li>`).join('')}
          </ul>
        ` : '<p class="text-sm text-gray-500">Žádné problémy</p>'}
      </div>
      
      <!-- Extended Metrics -->
      ${result.external_links_count !== undefined || result.internal_links_count !== undefined ? `
      <div>
        <h4 class="text-lg font-semibold mb-3">Odkazy</h4>
        <div class="grid grid-cols-2 gap-4">
          ${result.external_links_count !== undefined ? `
          <div>
            <p class="text-sm text-gray-600">Externí odkazy</p>
            <p class="font-semibold text-xl">${result.external_links_count}</p>
          </div>
          ` : ''}
          ${result.internal_links_count !== undefined ? `
          <div>
            <p class="text-sm text-gray-600">Interní odkazy</p>
            <p class="font-semibold text-xl">${result.internal_links_count}</p>
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
            <div class="p-3 bg-gray-50 rounded">
              <p class="font-semibold">${sd.type}</p>
              ${sd.valid === false ? `
                <p class="text-sm text-red-600">Neplatné</p>
                ${sd.errors ? `<ul class="text-xs text-red-600 mt-1">${sd.errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
              ` : '<p class="text-sm text-green-600">Platné</p>'}
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
                <li><a href="${link.url}" target="_blank" class="text-blue-600 hover:underline">${link.url}</a> (${link.status || 'Error'})</li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          ${result.broken_links_detail.broken_images && result.broken_links_detail.broken_images.length > 0 ? `
          <div>
            <p class="text-sm font-semibold mb-1">Broken obrázky:</p>
            <ul class="list-disc list-inside text-sm space-y-1">
              ${result.broken_links_detail.broken_images.slice(0, 10).map(img => `
                <li><a href="${img.url}" target="_blank" class="text-blue-600 hover:underline">${img.url}</a> (${img.status || 'Error'})</li>
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
      <h2 class="text-xl font-semibold mb-4">📊 Dashboard a statistiky</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-sm text-blue-600">Průměrná velikost stránky</p>
          <p class="text-2xl font-bold text-blue-900">${stats.avgPageSize > 0 ? (stats.avgPageSize / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <p class="text-sm text-purple-600">Celkem externích odkazů</p>
          <p class="text-2xl font-bold text-purple-900">${stats.totalExternalLinks}</p>
        </div>
        <div class="bg-indigo-50 p-4 rounded-lg">
          <p class="text-sm text-indigo-600">Celkem interních odkazů</p>
          <p class="text-2xl font-bold text-indigo-900">${stats.totalInternalLinks}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-sm text-green-600">Mobile-friendly stránek</p>
          <p class="text-2xl font-bold text-green-900">${stats.mobileFriendlyPages} / ${stats.totalPages}</p>
        </div>
      </div>
      
      ${stats.topIssues && stats.topIssues.length > 0 ? `
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-3">🔴 Top problémy</h3>
        <div class="space-y-2">
          ${stats.topIssues.slice(0, 5).map((item, idx) => `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded">
              <span class="text-sm">${idx + 1}. ${item.issue}</span>
              <span class="px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">${item.count}x</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${data.advancedChecks ? `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-yellow-50 rounded-lg">
          <h3 class="font-semibold mb-2">Sitemap</h3>
          <p class="text-sm ${data.advancedChecks.sitemap.valid ? 'text-green-600' : 'text-red-600'}">
            ${data.advancedChecks.sitemap.valid ? '✓ Validní' : '✗ Nevalidní'}
          </p>
          ${data.advancedChecks.sitemap.issues && data.advancedChecks.sitemap.issues.length > 0 ? `
            <ul class="text-xs text-yellow-800 mt-2 list-disc list-inside">
              ${data.advancedChecks.sitemap.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <div class="p-4 bg-yellow-50 rounded-lg">
          <h3 class="font-semibold mb-2">robots.txt</h3>
          <p class="text-sm ${data.advancedChecks.robots.exists ? 'text-green-600' : 'text-red-600'}">
            ${data.advancedChecks.robots.exists ? '✓ Existuje' : '✗ Chybí'}
          </p>
          ${data.advancedChecks.robots.issues && data.advancedChecks.robots.issues.length > 0 ? `
            <ul class="text-xs text-yellow-800 mt-2 list-disc list-inside">
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
    <h2 class="text-xl font-semibold mb-4">Shrnutí analýzy</h2>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-sm text-gray-600">Celkem stránek</p>
        <p class="text-2xl font-bold text-gray-900">${data.results.length}</p>
      </div>
      <div class="bg-red-50 p-4 rounded-lg">
        <p class="text-sm text-red-600">Chyby</p>
        <p class="text-2xl font-bold text-red-900">${errorCount}</p>
      </div>
      <div class="bg-yellow-50 p-4 rounded-lg">
        <p class="text-sm text-yellow-600">Varování</p>
        <p class="text-2xl font-bold text-yellow-900">${warningCount}</p>
      </div>
      <div class="bg-green-50 p-4 rounded-lg">
        <p class="text-sm text-green-600">OK</p>
        <p class="text-2xl font-bold text-green-900">${okCount}</p>
      </div>
    </div>
    ${data.duplicateTitles.length > 0 || data.duplicateDescriptions.length > 0 ? `
      <div class="mt-4 p-4 bg-yellow-50 rounded-lg">
        <p class="font-semibold text-yellow-900 mb-2">Duplicity:</p>
        ${data.duplicateTitles.length > 0 ? `<p class="text-sm text-yellow-800">Duplicitní title: ${data.duplicateTitles.length}</p>` : ''}
        ${data.duplicateDescriptions.length > 0 ? `<p class="text-sm text-yellow-800">Duplicitní description: ${data.duplicateDescriptions.length}</p>` : ''}
      </div>
    ` : ''}
  `;
  
  // Apply filters and render table
  applyFilters();
  
  results.classList.remove('hidden');
}
