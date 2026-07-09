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
    const info = await ytdl.getInfo(fullUrl);

    const title = sanitizeFilename(info.videoDetails.title);

    const formatOptions = {
      quality: quality === '320' ? 'highestaudio' : quality === '128' ? 'lowestaudio' : 'highestaudio',
      filter: 'audioonly'
    };

    const stream = await ytdl.download(fullUrl, formatOptions);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);

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
      return res.status(500).json({ error: 'Failed to download audio: ' + error.message });
    }
  }
}
