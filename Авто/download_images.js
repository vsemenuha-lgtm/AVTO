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

const sleep = ms => new Promise(r => setTimeout(r, ms));

function downloadImage(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'LuxoraBot/1.0 (contact@luxora.local)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, filepath, retries).then(resolve).catch(reject);
      }
      if (res.statusCode === 429 && retries > 0) {
        console.log(`429 Too Many Requests for ${url}. Retrying in 2 seconds...`);
        return sleep(2000).then(() => downloadImage(url, filepath, retries - 1)).then(resolve);
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
          // Use car model to make filename unique to avoid cache conflicts
          const filename = `car_${car.id}_${car.make}_${car.model}_ext_${j}${ext}`.replace(/\s+/g, '_');
          const filepath = path.join(assetsDir, filename);
          
          await sleep(500); // 500ms delay between requests to be polite

          const success = await downloadImage(imgUrl, filepath);
          if (success) {
            car.images[j] = `/assets/${filename}`;
            updatedCount++;
            console.log(`Saved to ${car.images[j]}`);
          } else {
            console.log(`Failed to download ${imgUrl}`);
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
