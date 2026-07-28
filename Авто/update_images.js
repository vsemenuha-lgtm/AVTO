const fs = require('fs');
const https = require('https');

const dataFile = './data.json';
const cars = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function fetchWikiImage(query) {
  return new Promise((resolve) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=File:${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json`;
    https.get(url, { headers: { 'User-Agent': 'Bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.query && json.query.pages) {
            const pages = json.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId && pageId !== '-1' && pages[pageId].imageinfo && pages[pageId].imageinfo[0].url) {
              // Ensure it's a JPG or PNG (avoid webm/ogg/pdf)
              const imgUrl = pages[pageId].imageinfo[0].url;
              if (imgUrl.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
                return resolve(imgUrl);
              }
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
  for (let car of cars) {
    const query1 = `${car.year} ${car.make} ${car.model}`;
    const query2 = `${car.make} ${car.model}`;
    
    let imgUrl = await fetchWikiImage(query1);
    if (!imgUrl) {
      console.log(`Fallback for ${query1}`);
      imgUrl = await fetchWikiImage(query2);
    }
    
    if (imgUrl) {
      console.log(`Found for ${query1}: ${imgUrl}`);
      if (!car.images) car.images = [];
      
      // Keep existing images but update the first one
      if (car.images.length === 0) {
        car.images.push(imgUrl);
      } else {
        // Only replace the first image
        car.images[0] = imgUrl;
      }
    } else {
      console.log(`Not found for ${query1}`);
    }
  }
  fs.writeFileSync(dataFile, JSON.stringify(cars, null, 2));
  console.log('Done!');
})();
