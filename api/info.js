const COBALT_INSTANCES = [
  'https://nuko-c.meowing.de',
  'https://dog.kittycat.boo',
  'https://rue-cobalt.xenon.zone',
  'https://api.qwkuns.me',
  'https://cobaltapi.kittycat.boo',
  'https://cobaltapi.squair.xyz',
  'https://api.cobalt.liubquanti.click'
];

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

    for (const instance of COBALT_INSTANCES) {
      try {
        const response = await fetch(instance, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: fullUrl,
            downloadMode: 'auto',
            filenameStyle: 'basic'
          })
        });

        const data = await response.json();

        if (data.status === 'tunnel' || data.status === 'redirect') {
          return res.status(200).json({
            title: `YouTube Video ${videoId}`,
            channel: 'YouTube',
            downloadUrl: data.url,
            filename: data.filename || `youtube-${videoId}`
          });
        }
      } catch (e) {
        continue;
      }
    }

    return res.status(500).json({ error: 'All instances failed' });
  } catch (error) {
    console.error('Info error:', error);
    return res.status(500).json({ error: error.message });
  }
};
