const fs = require('fs');
const https = require('https');

const dataFile = './data.json';
const cars = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function fetchWikiPageImage(make, model) {
  return new Promise((resolve) => {
    // Some models need specific Wikipedia page names, e.g., "Mazda3", "Honda Accord"
    const title = encodeURIComponent(`${make} ${model}`.replace(/ Mazda3/, '3'));
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&pithumbsize=1000`;
    https.get(url, { headers: { 'User-Agent': 'Bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.query && json.query.pages) {
            const pages = json.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId && pageId !== '-1' && pages[pageId].thumbnail) {
               return resolve(pages[pageId].thumbnail.source);
            }
          }
          resolve(null);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  let updatedCount = 0;
  for (let car of cars) {
    if (car.images && car.images.length > 0 && car.images[0].includes('wikimedia.org')) {
      // Already found a good one from the previous run
      continue;
    }
    
    let imgUrl = await fetchWikiPageImage(car.make, car.model);
    
    if (!imgUrl) {
       // try just the model
       imgUrl = await fetchWikiPageImage('', car.model);
    }
    
    if (imgUrl) {
      console.log(`Found for ${car.make} ${car.model}: ${imgUrl}`);
      if (!car.images) car.images = [];
      if (car.images.length === 0) {
        car.images.push(imgUrl);
      } else {
        car.images[0] = imgUrl; // Update main photo
      }
      updatedCount++;
    } else {
      console.log(`Still not found for ${car.make} ${car.model}`);
    }
  }
  
  if (updatedCount > 0) {
    fs.writeFileSync(dataFile, JSON.stringify(cars, null, 2));
    console.log(`Updated ${updatedCount} more cars.`);
  } else {
    console.log('No new images found.');
  }
})();
