const express = require('express');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SnapVid Node.js Express Gateway',
    pythonBackend: PYTHON_BACKEND_URL
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SnapVid Node.js Express Gateway',
    pythonBackend: PYTHON_BACKEND_URL
  });
});

// Proxy extract request to Python backend
app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ detail: 'URL is required.' });
    }

    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/extract`, { url }, {
      timeout: 30000
    });

    return res.json(response.data);
  } catch (error) {
    const status = error.response ? error.response.status : 500;
    const detail = error.response && error.response.data ? error.response.data.detail : error.message;
    return res.status(status).json({ detail });
  }
});

// Stream media downloads
app.get('/api/download', async (req, res) => {
  try {
    const { url, type, mute, audio_only, filename } = req.query;
    if (!url) {
      return res.status(400).send('URL query parameter is required.');
    }

    // Forward to Python backend for extraction and streaming
    const pyStreamUrl = `${PYTHON_BACKEND_URL}/api/download?url=${encodeURIComponent(url)}&type=${type || 'video'}&mute=${mute || false}&audio_only=${audio_only || false}&filename=${encodeURIComponent(filename || 'snapvid')}`;

    const streamResponse = await axios({
      method: 'GET',
      url: pyStreamUrl,
      responseType: 'stream',
      timeout: 120000
    });

    // Pipe response headers and content
    if (streamResponse.headers['content-type']) {
      res.setHeader('Content-Type', streamResponse.headers['content-type']);
    }
    if (streamResponse.headers['content-disposition']) {
      res.setHeader('Content-Disposition', streamResponse.headers['content-disposition']);
    }

    streamResponse.data.pipe(res);
  } catch (error) {
    const status = error.response ? error.response.status : 500;
    return res.status(status).send(error.message || 'Error downloading media');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SnapVid Node.js Express] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[SnapVid Node.js Express] Forwarding extractor calls to ${PYTHON_BACKEND_URL}`);
});
