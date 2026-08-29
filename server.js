const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route handling for clean URLs (e.g. /theory -> theory.html)
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    const potentialFile = path.join(__dirname, req.path + '.html');
    res.sendFile(potentialFile, (err) => {
      if (err) {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
      }
    });
  } else {
    next();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EduSafe server running on http://0.0.0.0:${PORT}`);
});
