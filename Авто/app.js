let carsData = [];
let isAdmin = false;
let currentSlide = 0;
let carouselImages = [];
let touchStartX = 0;
let touchEndX = 0;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await fetchCars();
  handleHashChange();
  initLightboxEvents();
});

window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === 'home') {
    navigate('home');
  } else if (hash === 'catalog') {
    navigate('catalog');
  } else if (hash === 'admin') {
    if (!isAdmin) {
      showAdminLogin();
      // Reset hash if not logged in so back button works correctly
      window.location.hash = 'home';
    } else {
      navigate('admin');
    }
  } else if (hash.startsWith('car-')) {
    const carId = parseInt(hash.replace('car-', ''));
    showCarDetails(carId);
  } else {
    navigate('home');
  }
}

// Mobile Menu
function toggleMobileMenu() {
  document.getElementById('nav-links').classList.toggle('active');
}
function closeMobileMenu() {
  document.getElementById('nav-links').classList.remove('active');
}

// Navigation
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(`${pageId}-page`).classList.add('active');
  window.scrollTo(0, 0);
}

function scrollToInventory() {
  document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

// Fetch Cars from API
async function fetchCars() {
  try {
    // If on GitHub Pages, fetch the static data.json instead of hitting the local API
    const isGitHub = window.location.hostname.includes('github.io');
    const dataUrl = isGitHub ? './data.json' : '/api/cars';
    
    const res = await fetch(dataUrl);
    carsData = await res.json();
    renderCars();
    renderFeaturedCars();
    renderPromoCars();
    if(isAdmin) renderAdminCars();
  } catch (err) {
    console.error('Failed to fetch cars', err);
  }
}

// Price Formatter Helper
function getPriceHtml(car) {
  if (car.promotionalPrice) {
    return `<del class="price-original">$${car.price.toLocaleString()}</del> <span class="price-promo">$${car.promotionalPrice.toLocaleString()}</span>`;
  }
  return `$${car.price.toLocaleString()}`;
}

// Render Cars Grid
function renderCars() {
  const grid = document.getElementById('cars-grid');
  grid.innerHTML = '';
  
  carsData.forEach(car => {
    // Show first image or placeholder
    let imgUrl = (car.images && car.images.length > 0) ? car.images[0] : '/assets/placeholder.jpg';
    if (window.location.hostname.includes('github.io') && imgUrl.startsWith('/assets/')) {
      imgUrl = '.' + imgUrl;
    }
    
    const card = document.createElement('div');
    card.className = 'car-card';
    card.onclick = () => { window.location.hash = 'car-' + car.id; };
    card.innerHTML = `
      <img src="${imgUrl}" alt="${car.make} ${car.model}" class="car-image">
      <div class="car-info">
        <div class="car-title">${car.make} ${car.model} (${car.year})</div>
        <div class="car-price">${getPriceHtml(car)}</div>
        <div class="car-specs">
          <span>Пробег: ${car.mileage.toLocaleString()} км</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Render Featured Cars (New Arrivals)
function renderFeaturedCars() {
  const track = document.getElementById('featured-track');
  if (!track) return;
  track.innerHTML = '';
  
  // Get 10 newest cars (highest id)
  const newestCars = [...carsData].sort((a, b) => b.id - a.id).slice(0, 10);
  
  newestCars.forEach(car => {
    let imgUrl = (car.images && car.images.length > 0) ? car.images[0] : '/assets/placeholder.jpg';
    if (window.location.hostname.includes('github.io') && imgUrl.startsWith('/assets/')) {
      imgUrl = '.' + imgUrl;
    }
    
    const card = document.createElement('div');
    card.className = 'car-card';
    card.onclick = () => { window.location.hash = 'car-' + car.id; };
    card.innerHTML = `
      <img src="${imgUrl}" alt="${car.make} ${car.model}" class="car-image">
      <div class="car-info">
        <div class="car-title">${car.make} ${car.model} (${car.year})</div>
        <div class="car-price">${getPriceHtml(car)}</div>
      </div>
    `;
    track.appendChild(card);
  });
}

// Scroll Featured Carousel
function scrollFeatured(direction) {
  const track = document.getElementById('featured-track');
  if (!track) return;
  // scroll by approx one card width + gap (300px + 2rem)
  const scrollAmount = 330 * direction;
  track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// Render Promotional Cars
function renderPromoCars() {
  const track = document.getElementById('promo-track');
  if (!track) return;
  track.innerHTML = '';
  
  const promoCars = carsData.filter(c => c.promotionalPrice);
  
  promoCars.forEach(car => {
    let imgUrl = (car.images && car.images.length > 0) ? car.images[0] : '/assets/placeholder.jpg';
    if (window.location.hostname.includes('github.io') && imgUrl.startsWith('/assets/')) {
      imgUrl = '.' + imgUrl;
    }
    const card = document.createElement('div');
    card.className = 'car-card';
    card.onclick = () => { window.location.hash = 'car-' + car.id; };
    card.innerHTML = `
      <img src="${imgUrl}" alt="${car.make} ${car.model}" class="car-image">
      <div class="car-info">
        <div class="car-title">${car.make} ${car.model} (${car.year})</div>
        <div class="car-price">${getPriceHtml(car)}</div>
      </div>
    `;
    track.appendChild(card);
  });
}

function scrollPromo(direction) {
  const track = document.getElementById('promo-track');
  if (!track) return;
  const scrollAmount = 330 * direction;
  track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// Show Details & Carousel Logic
function showCarDetails(id) {
  const car = carsData.find(c => c.id === id);
  if (!car) return;

  const container = document.getElementById('details-container');
  carouselImages = (car.images && car.images.length > 0) ? car.images.map(imgUrl => {
    if (window.location.hostname.includes('github.io') && imgUrl.startsWith('/assets/')) {
      return '.' + imgUrl;
    }
    return imgUrl;
  }) : ['/assets/placeholder.jpg'];
  currentSlide = 0;
  
  let trackHtml = carouselImages.map((src, i) => `<div class="carousel-slide" onclick="openLightbox(${i})" style="cursor: zoom-in;"><img src="${src}" alt="slide ${i}"></div>`).join('');
  let dotsHtml = carouselImages.map((_, i) => `<div class="dot ${i===0?'active':''}" onclick="goToSlide(${i})"></div>`).join('');

  container.innerHTML = `
    <button class="btn-secondary" onclick="window.location.hash='catalog'" style="margin-bottom: 2rem;">&larr; Назад к каталогу</button>
    
    <div class="details-content">
      <div class="carousel-wrapper" id="carousel-wrapper">
        <div class="carousel-track" id="carousel-track">
          ${trackHtml}
        </div>
        ${carouselImages.length > 1 ? `
          <button class="carousel-btn prev" onclick="prevSlide()">&#10094;</button>
          <button class="carousel-btn next" onclick="nextSlide()">&#10095;</button>
          <div class="carousel-dots" id="carousel-dots">${dotsHtml}</div>
        ` : ''}
      </div>

      <div class="details-info">
        <h1>${car.make} ${car.model}</h1>
        <div class="details-price">${getPriceHtml(car)}</div>
        <p class="details-desc">${car.description}</p>
        
        <table class="specs-table">
          <tbody>
            <tr><th>Год выпуска</th><td>${car.year}</td></tr>
            <tr><th>Пробег</th><td>${car.mileage.toLocaleString()} км</td></tr>
            ${car.specs ? `
              <tr><th>Двигатель</th><td>${car.specs.engine || '-'}</td></tr>
              <tr><th>Мощность</th><td>${car.specs.horsepower ? car.specs.horsepower + ' л.с.' : '-'}</td></tr>
              <tr><th>Коробка передач</th><td>${car.specs.transmission || '-'}</td></tr>
              <tr><th>Привод</th><td>${car.specs.drivetrain || '-'}</td></tr>
            ` : ''}
          </tbody>
        </table>

        <button class="btn-primary" onclick="alert('Связываемся с менеджером...')">Связаться с дилером</button>
      </div>
    </div>
  `;
  
  navigate('details');

  // Add swipe listeners
  if (carouselImages.length > 1) {
    const track = document.getElementById('carousel-track');
    track.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    });
    track.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
  }
}

function updateCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.querySelectorAll('.dot');
  if(track) {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }
  if(dots.length > 0) {
    dots.forEach(d => d.classList.remove('active'));
    dots[currentSlide].classList.add('active');
  }
}

function nextSlide() {
  if (currentSlide < carouselImages.length - 1) currentSlide++;
  else currentSlide = 0;
  updateCarousel();
}

function prevSlide() {
  if (currentSlide > 0) currentSlide--;
  else currentSlide = carouselImages.length - 1;
  updateCarousel();
}

function goToSlide(index) {
  currentSlide = index;
  updateCarousel();
}

function handleSwipe() {
  const threshold = 50;
  if (touchEndX < touchStartX - threshold) nextSlide();
  if (touchEndX > touchStartX + threshold) prevSlide();
}

// Lightbox Logic
let currentLightboxIndex = 0;

function openLightbox(index) {
  currentLightboxIndex = index;
  const modal = document.getElementById('lightbox-modal');
  updateLightboxImage();
  modal.style.display = 'flex';
}

function updateLightboxImage() {
  const img = document.getElementById('lightbox-img');
  img.src = carouselImages[currentLightboxIndex];
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  modal.style.display = 'none';
}

function prevLightboxImage(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (currentLightboxIndex > 0) currentLightboxIndex--;
  else currentLightboxIndex = carouselImages.length - 1;
  updateLightboxImage();
}

function nextLightboxImage(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (currentLightboxIndex < carouselImages.length - 1) currentLightboxIndex++;
  else currentLightboxIndex = 0;
  updateLightboxImage();
}

let lightboxTouchStartX = 0;
let lightboxTouchEndX = 0;

function initLightboxEvents() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  
  modal.addEventListener('touchstart', e => {
    lightboxTouchStartX = e.changedTouches[0].screenX;
  });
  modal.addEventListener('touchend', e => {
    lightboxTouchEndX = e.changedTouches[0].screenX;
    const threshold = 50;
    if (lightboxTouchEndX < lightboxTouchStartX - threshold) nextLightboxImage();
    if (lightboxTouchEndX > lightboxTouchStartX + threshold) prevLightboxImage();
  });

  document.addEventListener('keydown', e => {
    if (modal.style.display === 'flex') {
      if (e.key === 'ArrowLeft') prevLightboxImage();
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'Escape') closeLightbox();
    }
  });
}

// Admin Logic
function showAdminLogin() {
  if (isAdmin) {
    navigate('admin');
  } else {
    document.getElementById('admin-modal').style.display = 'flex';
  }
}

function closeAdminLogin() {
  document.getElementById('admin-modal').style.display = 'none';
}

function loginAdmin() {
  const pass = document.getElementById('admin-password').value;
  if (pass === 'admin123') { 
    isAdmin = true;
    closeAdminLogin();
    window.location.hash = 'admin';
    renderAdminCars();
  } else {
    alert('Неверный пароль!');
  }
}

function showAddCarForm() {
  document.getElementById('add-car-form').classList.remove('hidden');
}
function hideAddCarForm() {
  document.getElementById('add-car-form').classList.add('hidden');
}

// Convert File to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Add Car
async function addCar() {
  const make = document.getElementById('new-make').value;
  const model = document.getElementById('new-model').value;
  const year = parseInt(document.getElementById('new-year').value);
  const price = parseInt(document.getElementById('new-price').value);
  const promoPriceStr = document.getElementById('new-promotional-price').value;
  const promoPrice = promoPriceStr ? parseInt(promoPriceStr) : null;
  const mileage = parseInt(document.getElementById('new-mileage').value);
  const desc = document.getElementById('new-desc').value;

  const engine = document.getElementById('new-engine').value;
  const hp = parseInt(document.getElementById('new-hp').value);
  const trans = document.getElementById('new-transmission').value;
  const drive = document.getElementById('new-drivetrain').value;

  if (!make || !model || !price) {
    alert('Пожалуйста, заполните основные поля (Марка, Модель, Цена)');
    return;
  }

  // Read files
  const fileInput = document.getElementById('new-images');
  const files = fileInput.files;
  if(files.length > 10) {
    alert('Можно загрузить максимум 10 фотографий');
    return;
  }
  
  let base64Images = [];
  for(let i=0; i<files.length; i++) {
    const b64 = await fileToBase64(files[i]);
    base64Images.push(b64);
  }

  const newCar = { 
    make, model, year, price, mileage, description: desc,
    promotionalPrice: promoPrice,
    images: base64Images,
    specs: { engine, horsepower: hp, transmission: trans, drivetrain: drive }
  };

  document.querySelector('.admin-container').style.opacity = '0.5';

  try {
    await fetch('/api/cars', {
      method: 'POST',
      body: JSON.stringify(newCar),
      headers: { 'Content-Type': 'application/json' }
    });
    hideAddCarForm();
    // Clear form
    document.getElementById('new-make').value = '';
    document.getElementById('new-model').value = '';
    document.getElementById('new-price').value = '';
    document.getElementById('new-promotional-price').value = '';
    document.getElementById('new-desc').value = '';
    document.getElementById('new-engine').value = '';
    document.getElementById('new-hp').value = '';
    fileInput.value = '';
    
    fetchCars(); // Refresh data
  } catch (err) {
    console.error(err);
    alert('Ошибка при сохранении машины.');
  } finally {
    document.querySelector('.admin-container').style.opacity = '1';
  }
}

// Render Admin List
function renderAdminCars() {
  const list = document.getElementById('admin-list');
  list.innerHTML = '';
  carsData.forEach(car => {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div><strong>${car.make} ${car.model}</strong> (${car.year}) - $${car.price}</div>
      <div>
        <button style="background:#3b82f6" onclick="showEditForm(${car.id})">Редактировать</button>
        <button onclick="deleteCar(${car.id})">Удалить</button>
      </div>
    `;
    list.appendChild(item);
  });
}

async function deleteCar(id) {
  if(confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
    try {
      await fetch('/api/cars/' + id, { method: 'DELETE' });
      fetchCars();
    } catch (err) {
      console.error(err);
    }
  }
}

// Edit Logic
let editImagesToKeep = [];

function showEditForm(id) {
  const car = carsData.find(c => c.id === id);
  if(!car) return;

  hideAddCarForm();
  document.getElementById('edit-car-form').classList.remove('hidden');
  
  document.getElementById('edit-id').value = car.id;
  document.getElementById('edit-make').value = car.make;
  document.getElementById('edit-model').value = car.model;
  document.getElementById('edit-year').value = car.year;
  document.getElementById('edit-price').value = car.price;
  document.getElementById('edit-promotional-price').value = car.promotionalPrice || '';
  document.getElementById('edit-mileage').value = car.mileage;
  document.getElementById('edit-desc').value = car.description;

  document.getElementById('edit-engine').value = car.specs?.engine || '';
  document.getElementById('edit-hp').value = car.specs?.horsepower || '';
  document.getElementById('edit-transmission').value = car.specs?.transmission || '';
  document.getElementById('edit-drivetrain').value = car.specs?.drivetrain || '';

  editImagesToKeep = [...(car.images || [])];
  renderEditImages();
}

function hideEditCarForm() {
  document.getElementById('edit-car-form').classList.add('hidden');
}

function renderEditImages() {
  const container = document.getElementById('edit-current-images');
  container.innerHTML = '';
  editImagesToKeep.forEach((img, index) => {
    container.innerHTML += `
      <div class="edit-img-wrapper">
        <img src="${img}" alt="car img">
        <button class="remove-img-btn" onclick="removeEditImage(${index})">X</button>
      </div>
    `;
  });
}

function removeEditImage(index) {
  editImagesToKeep.splice(index, 1);
  renderEditImages();
}

async function saveEditCar() {
  const id = parseInt(document.getElementById('edit-id').value);
  const make = document.getElementById('edit-make').value;
  const model = document.getElementById('edit-model').value;
  const year = parseInt(document.getElementById('edit-year').value);
  const price = parseInt(document.getElementById('edit-price').value);
  const promoPriceStr = document.getElementById('edit-promotional-price').value;
  const promoPrice = promoPriceStr ? parseInt(promoPriceStr) : null;
  const mileage = parseInt(document.getElementById('edit-mileage').value);
  const desc = document.getElementById('edit-desc').value;

  const engine = document.getElementById('edit-engine').value;
  const hp = parseInt(document.getElementById('edit-hp').value);
  const trans = document.getElementById('edit-transmission').value;
  const drive = document.getElementById('edit-drivetrain').value;

  if (!make || !model || !price) {
    alert('Пожалуйста, заполните основные поля (Марка, Модель, Цена)');
    return;
  }

  // Read new files
  const fileInput = document.getElementById('edit-images');
  const files = fileInput.files;
  
  if(editImagesToKeep.length + files.length > 10) {
    alert('Суммарно можно сохранить максимум 10 фотографий');
    return;
  }

  let base64Images = [];
  for(let i=0; i<files.length; i++) {
    const b64 = await fileToBase64(files[i]);
    base64Images.push(b64);
  }

  // Combine kept images with new base64 images
  const finalImages = [...editImagesToKeep, ...base64Images];

  const updatedCar = { 
    make, model, year, price, mileage, description: desc,
    promotionalPrice: promoPrice,
    images: finalImages,
    specs: { engine, horsepower: hp, transmission: trans, drivetrain: drive }
  };

  document.querySelector('.admin-container').style.opacity = '0.5';

  try {
    await fetch('/api/cars/' + id, {
      method: 'PUT',
      body: JSON.stringify(updatedCar),
      headers: { 'Content-Type': 'application/json' }
    });
    hideEditCarForm();
    fileInput.value = '';
    fetchCars(); // Refresh data
  } catch (err) {
    console.error(err);
    alert('Ошибка при сохранении машины.');
  } finally {
    document.querySelector('.admin-container').style.opacity = '1';
  }
}


