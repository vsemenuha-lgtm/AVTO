const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (req.url.startsWith('/api/cars')) {
    if (req.method === 'GET') {
      fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to read data' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      // Set limit high for base64 uploads
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newCar = JSON.parse(body);
          fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            const cars = data ? JSON.parse(data) : [];
            newCar.id = cars.length ? Math.max(...cars.map(c => c.id)) + 1 : 1;
            
            // Process images
            if (newCar.images && Array.isArray(newCar.images)) {
              for (let i = 0; i < newCar.images.length; i++) {
                const imgStr = newCar.images[i];
                if (imgStr.startsWith('data:image/')) {
                  // Extract base64
                  const matches = imgStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                  if (matches && matches.length === 3) {
                    let ext = matches[1].split('/')[1] || 'jpg';
                    if (ext === 'svg+xml') ext = 'svg';
                    if (ext === 'x-icon') ext = 'ico';
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const filename = `car_${newCar.id}_img_${i}.${ext}`;
                    const filepath = path.join(ASSETS_DIR, filename);
                    
                    fs.writeFileSync(filepath, buffer);
                    newCar.images[i] = `/assets/${filename}`;
                  }
                }
              }
            }

            cars.push(newCar);
            fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2), err => {
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(newCar));
            });
          });
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    if (req.method === 'PUT') {
      const id = parseInt(req.url.split('/').pop());
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const updatedCar = JSON.parse(body);
          fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            const cars = data ? JSON.parse(data) : [];
            const carIndex = cars.findIndex(c => c.id === id);
            
            if (carIndex === -1) {
              res.writeHead(404);
              return res.end(JSON.stringify({ error: 'Car not found' }));
            }

            const oldCar = cars[carIndex];
            
            // Delete removed images
            if (oldCar.images) {
              oldCar.images.forEach(oldImg => {
                if (updatedCar.images && !updatedCar.images.includes(oldImg) && oldImg.startsWith('/assets/')) {
                  try { fs.unlinkSync(path.join(PUBLIC_DIR, oldImg)); } catch (e) {}
                }
              });
            }

            // Process new base64 images
            if (updatedCar.images && Array.isArray(updatedCar.images)) {
              for (let i = 0; i < updatedCar.images.length; i++) {
                const imgStr = updatedCar.images[i];
                if (imgStr.startsWith('data:image/')) {
                  const matches = imgStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                  if (matches && matches.length === 3) {
                    let ext = matches[1].split('/')[1] || 'jpg';
                    if (ext === 'svg+xml') ext = 'svg';
                    if (ext === 'x-icon') ext = 'ico';
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    // Add timestamp to prevent caching issues on edit
                    const filename = `car_${id}_img_${Date.now()}_${i}.${ext}`;
                    const filepath = path.join(ASSETS_DIR, filename);
                    fs.writeFileSync(filepath, buffer);
                    updatedCar.images[i] = `/assets/${filename}`;
                  }
                }
              }
            }

            updatedCar.id = id; // Ensure ID doesn't change
            cars[carIndex] = updatedCar;

            fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2), err => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(updatedCar));
            });
          });
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.url.split('/').pop());
      fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let cars = data ? JSON.parse(data) : [];
        // Delete files
        const carToDelete = cars.find(c => c.id === id);
        if (carToDelete && carToDelete.images) {
          carToDelete.images.forEach(imgPath => {
            if (imgPath.startsWith('/assets/')) {
              try {
                fs.unlinkSync(path.join(PUBLIC_DIR, imgPath));
              } catch (e) { /* ignore if not exists */ }
            }
          });
        }

        cars = cars.filter(c => c.id !== id);
        fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2), err => {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        });
      });
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  let extname = String(path.extname(filePath)).toLowerCase();
  let contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
