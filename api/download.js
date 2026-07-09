import { YtdlCore } from '@ybd-project/ytdl-core/serverless';

const ytdl = new YtdlCore();

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

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, quality } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getFullInfo(fullUrl);

    const title = sanitizeFilename(info.videoDetails.title);

    const audioFormats = info.formats.filter(
      (f) => f.mimeType?.startsWith('audio/') && f.hasAudio
    );

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'No audio formats available' });
    }

    let selectedFormat;

    if (quality === '320') {
      selectedFormat = audioFormats.reduce((best, curr) =>
        (curr.audioBitrate || 0) > (best.audioBitrate || 0) ? curr : best
      );
    } else if (quality === '128') {
      selectedFormat = audioFormats.reduce((best, curr) =>
        (curr.audioBitrate || 0) < (best.audioBitrate || 0) ? curr : best
      );
    } else {
      selectedFormat = audioFormats.reduce((best, curr) => {
        const currDiff = Math.abs((curr.audioBitrate || 192) - 192);
        const bestDiff = Math.abs((best.audioBitrate || 192) - 192);
        return currDiff < bestDiff ? curr : best;
      });
    }

    const stream = await ytdl.download(fullUrl, { format: selectedFormat });

    const ext = selectedFormat.mimeType?.includes('webm') ? 'webm' : 'mp4';
    const mimeType = selectedFormat.mimeType?.split(';')[0] || 'audio/webm';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${ext}"`);

    const reader = stream.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };

    await pump();
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to download audio' });
    }
  }
}
