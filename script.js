const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const videoInfo = document.getElementById('videoInfo');
const thumbnail = document.getElementById('thumbnail');
const duration = document.getElementById('duration');
const title = document.getElementById('title');
const channel = document.getElementById('channel');
const downloadBtn = document.getElementById('downloadBtn');
const status = document.getElementById('status');
const qualityBtns = document.querySelectorAll('.quality-btn');

let currentUrl = '';
let currentDownloadUrl = '';
let selectedQuality = '128';

analyzeBtn.addEventListener('click', analyzeVideo);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyzeVideo();
});

qualityBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    qualityBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedQuality = btn.dataset.quality;
  });
});

downloadBtn.addEventListener('click', downloadAudio);

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function analyzeVideo() {
  const url = urlInput.value.trim();

  if (!url) {
    showStatus('Por favor ingresa una URL', 'error');
    return;
  }

  if (!isValidYouTubeUrl(url)) {
    showStatus('URL de YouTube no válida', 'error');
    return;
  }

  setLoading(analyzeBtn, true);
  showStatus('Analizando video...', 'loading');

  try {
    const response = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al analizar el video');
    }

    currentUrl = url;
    currentDownloadUrl = data.downloadUrl;

    const videoId = extractVideoId(url);
    thumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    duration.textContent = '--:--';
    title.textContent = data.title || 'Video de YouTube';
    channel.textContent = data.channel || 'YouTube';

    videoInfo.classList.remove('hidden');
    hideStatus();
  } catch (error) {
    showStatus(error.message || 'Error al analizar el video', 'error');
  } finally {
    setLoading(analyzeBtn, false);
  }
}

async function downloadAudio() {
  if (!currentUrl) return;

  setLoading(downloadBtn, true);
  showStatus('Preparando descarga...', 'loading');

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, quality: selectedQuality })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al descargar');
    }

    const data = await response.json();

    if (data.downloadUrl) {
      window.open(data.downloadUrl, '_blank');
      showStatus('¡Descarga iniciada! Revisa tus descargas.', 'success');
    } else {
      throw new Error('No se pudo obtener el enlace de descarga');
    }
  } catch (error) {
    showStatus(error.message || 'Error al descargar el audio', 'error');
  } finally {
    setLoading(downloadBtn, false);
  }
}

function isValidYouTubeUrl(url) {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/
  ];
  return patterns.some((p) => p.test(url));
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
}

function hideStatus() {
  status.className = 'status hidden';
}

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}
