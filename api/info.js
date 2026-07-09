const ytdl = require('@distube/ytdl-core');

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

module.exports = async (req, res) => {
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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getBasicInfo(fullUrl);

    const duration = info.videoDetails.lengthSeconds || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return res.status(200).json({
      title: info.videoDetails.title || 'Unknown',
      channel: info.videoDetails.author?.name || 'Unknown',
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      durationSeconds: duration,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId
    });
  } catch (error) {
    console.error('Info error:', error);
    return res.status(500).json({ error: error.message });
  }
};
