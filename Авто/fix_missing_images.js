const fs = require('fs');
const https = require('https');
const path = require('path');

const dataFile = path.join(__dirname, 'data.json');
const assetsDir = path.join(__dirname, 'assets');

let cars = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const targets = [
  'Toyota Camry', 'Honda Civic', 'Ford Focus', 'Chevrolet Malibu',
  'Nissan Altima', 'Hyundai Elantra', 'Kia Optima', 'Toyota Corolla',
  'Honda Accord', 'Nissan Sentra', 'Chevrolet Cruze', 'Hyundai Sonata',
  'Volkswagen Passat'
];

function fetchWikiPageImage(title) {
  return new Promise((resolve) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1000`;
    https.get(url, { headers: { 'User-Agent': 'LuxoraBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId !== '-1' && pages[pageId].thumbnail) {
             return resolve(pages[pageId].thumbnail.source);
          }
          resolve(null);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'LuxoraBot/1.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve(false);
      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);
      fileStream.on('finish', () => resolve(true));
      fileStream.on('error', () => resolve(false));
    }).on('error', () => resolve(false));
  });
}

(async () => {
  let updatedCount = 0;
  for (let car of cars) {
    const name = `${car.make} ${car.model}`;
    if (targets.includes(name) || (car.images && car.images[0] && (car.images[0].includes('wikimedia') || car.images[0].includes('unsplash')) && !car.images[0].startsWith('/assets/'))) {
      
      let imgUrl = await fetchWikiPageImage(name);
      if (!imgUrl) {
         imgUrl = await fetchWikiPageImage(car.model);
      }
      
      if (imgUrl) {
        console.log(`Found Wikipedia image for ${name}`);
        const filename = `car_${car.id}_${car.make}_${car.model}_fixed.jpg`.replace(/\s+/g, '_');
        const filepath = path.join(assetsDir, filename);
        
        await sleep(500);
        const success = await downloadImage(imgUrl, filepath);
        
        if (success) {
           car.images[0] = `/assets/${filename}`;
           updatedCount++;
           console.log(`Successfully fixed image for ${name}`);
        } else {
           console.log(`Failed to download Wikipedia image for ${name}`);
        }
      } else {
        console.log(`Could not find Wikipedia image for ${name}`);
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(dataFile, JSON.stringify(cars, null, 2));
    console.log(`Successfully fixed ${updatedCount} cars.`);
  }
})();
