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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const { Innertube } = await import('youtubei.js');
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    const title = info.video?.title || info.basic_info?.title || 'Unknown';
    const channel = info.video?.author || info.basic_info?.author || info.video?.channel?.name || 'Unknown';
    const duration = info.basic_info?.duration || info.video?.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return res.status(200).json({
      title: typeof title === 'object' ? title.toString() : title,
      channel: typeof channel === 'object' ? channel.toString() : channel,
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      durationSeconds: duration,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId
    });
  } catch (error) {
    console.error('Info error:', error);
    return res.status(500).json({ error: error.message });
  }
}
