const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const dataFile = path.join(__dirname, 'data.json');
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

let cars = [];
try {
  cars = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} catch (e) {
  console.error("Could not read data.json");
  process.exit(1);
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return resolve(false);
      }
      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => resolve(false));
      });
    }).on('error', () => resolve(false));
  });
}

(async () => {
  let updatedCount = 0;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car.images && car.images.length > 0) {
      for (let j = 0; j < car.images.length; j++) {
        let imgUrl = car.images[j];
        if (imgUrl.startsWith('http')) {
          console.log(`Downloading ${imgUrl}...`);
          const extMatch = imgUrl.match(/\.(jpg|jpeg|png|webp|gif)/i);
          const ext = extMatch ? extMatch[0] : '.jpg';
          const filename = `car_${car.id}_ext_${j}${ext}`;
          const filepath = path.join(assetsDir, filename);
          
          const success = await downloadImage(imgUrl, filepath);
          if (success) {
            car.images[j] = `/assets/${filename}`;
            updatedCount++;
            console.log(`Saved to ${car.images[j]}`);
          } else {
            console.log(`Failed to download ${imgUrl}`);
            // If the main image failed to download, let's use a reliable placeholder
            if (j === 0) {
               car.images[j] = 'https://images.unsplash.com/photo-1550505187-571f543166d7?auto=format&fit=crop&w=600&q=80';
            }
          }
        }
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(dataFile, JSON.stringify(cars, null, 2));
    console.log(`Successfully downloaded and updated ${updatedCount} images.`);
  } else {
    console.log('No external images needed downloading.');
  }
})();
