// Main JavaScript for SEO Analyzer

let analysisData = null;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyzeForm');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
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
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Chyba při analýze');
      }
      
      const data = await response.json();
      analysisData = data;
      
      displayResults(data);
      
    } catch (error) {
      alert('Chyba: ' + error.message);
      console.error(error);
    } finally {
      loading.classList.add('hidden');
      analyzeBtn.disabled = false;
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
});

function displayResults(data) {
  const results = document.getElementById('results');
  const summary = document.getElementById('summary');
  const tableBody = document.getElementById('resultsTableBody');
  
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
  
  // Display table
  tableBody.innerHTML = '';
  data.results.forEach(result => {
    const row = document.createElement('tr');
    const statusClass = result.status === 'error' ? 'status-error' : 
                       result.status === 'warning' ? 'status-warning' : 
                       'status-ok';
    
    row.className = result.status === 'error' ? 'bg-red-50' : 
                   result.status === 'warning' ? 'bg-yellow-50' : 
                   'bg-green-50';
    
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
          `<ul class="list-disc list-inside text-xs">${result.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>` : 
          '<span class="text-gray-400">Žádné</span>'}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  results.classList.remove('hidden');
}

