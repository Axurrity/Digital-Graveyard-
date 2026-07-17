  //this hash function is used to give memorials a pinned position in the garden.//
function hashStr(str) {                                                                  
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// All memorials are stored as one JSON array under a single local storage key here.//
const STORAGE_KEY = 'digitalGraveyard.memorials';

function getMemorials() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveMemorials(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
function getMemorial(id) { return getMemorials().find(m => m.id === id); }
function updateMemorial(id, mutateFn) {
  const list = getMemorials();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) return;
  mutateFn(list[idx]);
  saveMemorials(list);
}
function deleteMemorial(id) { saveMemorials(getMemorials().filter(m => m.id !== id)); }
function uid() { return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function formatDates(m) {
  if (!m.born && !m.passed) return '';
  return [m.born, m.passed].filter(Boolean).join(' — ');
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks + (weeks === 1 ? ' week ago' : ' weeks ago');
  return new Date(iso).toLocaleDateString();
}

//Ambient soundscapes that play a looping ambient audio (rain, wind, forest, ocean) using the native HTML5 audio api, the tracks are mp3 royalty free audio tracks stored within a local audio folder.//
let currentAudioEl = null;
const SOUND_FILES = {                          //maps each sound option to its local audio file//
  rain: 'assets/audio/rain.mp3',               //sound files//
  wind: 'assets/audio/wind.mp3',
  birdsong: 'assets/audio/forest.mp3',
  ocean: 'assets/audio/ocean.mp3'
};

function stopSoundscape() {                   //stops and resets whenever ambient track is currently playing// 
  if (currentAudioEl) {
    currentAudioEl.pause();
    currentAudioEl.currentTime = 0;
    currentAudioEl = null;
  }
}

function playSoundscape(type) {              //starts playing the given soundscape on loop// 
  stopSoundscape();
  if (type === 'silence' || !type || !SOUND_FILES[type]) return;
  currentAudioEl = new Audio(SOUND_FILES[type]);
  currentAudioEl.loop = true;
  currentAudioEl.volume = 0.35;
  currentAudioEl.play().catch(() => {
  });
}

let soundPlaying = false;                     //on/off toggle used by the listen button// 
function toggleSound(soundscape, btn) {
  if (!soundscape || soundscape === 'silence') return;
  soundPlaying = !soundPlaying;
  if (btn) { btn.classList.toggle('active', soundPlaying); }
  if (soundPlaying) playSoundscape(soundscape); else stopSoundscape();
}

const SOUND_LABELS = { rain: 'Rain', wind: 'Wind', birdsong: 'Forest', ocean: 'Ocean', silence: 'Silence' };

//garden scene// 
function renderGallery() {                 
  const scene = document.getElementById('gardenScene');   
  const empty = document.getElementById('emptyState');           //shows a friendly empty message if no memorials currently exist// 
  if (!scene) return;
  const memorials = getMemorials();

  if (memorials.length === 0) {                          
    scene.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';                        //used so that the garden scene's height grows to fit all memorials// 
  scene.style.display = 'block';

  const cols = Math.max(3, Math.min(6, memorials.length));
  const rows = Math.ceil(memorials.length / cols);
  scene.style.minHeight = Math.max(280, rows * 150) + 'px';            //used to keep memorial pins scattered around garden area// 
 
  scene.innerHTML = memorials.map((m, i) => {
    const h = hashStr(m.id);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = 100 / cols;
    const jitterX = ((h % 100) / 100 - 0.5) * (cellW * 0.5);
    const jitterY = (((h >> 8) % 100) / 100 - 0.5) * 40;
    const x = col * cellW + cellW / 2 + jitterX;
    const y = row * 130 + 70 + jitterY;
    return `
      <a class="pin" style="left:${x}%; top:${y}px;" href="memorial.html?id=${m.id}">
        ${m.photo ? `<img class="pin-photo" src="${m.photo}" alt="">` : `<div class="pin-fallback"></div>`}
        <span class="pin-name">${escapeHtml(m.name)}</span>
      </a>
    `;
  }).join('');
}

//Create page//
function fileToDataURL(file) {                        //converts an uploaded image file into a data url// 
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function parseMilestones(raw) {
  if (!raw) return [];
  return raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return { date: '', text: line };
    return { date: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));         
}
//wires up the create a memorial form, image previews and gallery// 
//on submit builds the full memorial object from the form data//
function initCreateForm() {
  const form = document.getElementById('createForm');          
  if (!form) return;

  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoUploadLabel = document.getElementById('photoUploadLabel');
  let photoData = null;

  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files[0];
      if (!file) return;
      photoData = await fileToDataURL(file);
      photoPreview.src = photoData;
      photoPreview.style.display = 'block';
      photoUploadLabel.textContent = file.name;
    });
  }

  const galleryInput = document.getElementById('galleryInput');
  const galleryPreview = document.getElementById('galleryPreviewStrip');
  let galleryData = [];

  if (galleryInput) {
    galleryInput.addEventListener('change', async () => {
      const files = Array.from(galleryInput.files).slice(0, 8);
      galleryData = await Promise.all(files.map(fileToDataURL));
      galleryPreview.innerHTML = galleryData.map(src => `<img src="${src}" alt="">`).join('');     
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const memorial = {
      id: uid(),
      name: (data.get('name') || '').trim() || 'Untitled',
      type: data.get('type') || 'person',
      born: data.get('born') || '',
      passed: data.get('passed') || '',
      tribute: (data.get('tribute') || '').trim(),
      quote: (data.get('quote') || '').trim(),
      soundscape: data.get('soundscape') || 'silence',
      isPrivate: data.get('isPrivate') === 'on',
      photo: photoData,
      gallery: galleryData,
      milestones: parseMilestones(data.get('milestones')),
      candles: 0,
      flowers: 0,
      guestbook: [],
      created: Date.now()
    };
    const list = getMemorials();
    list.push(memorial);
    saveMemorials(list);
    window.location.href = `memorial.html?id=${memorial.id}`;
  });
}

//Memorial page// 
function getIdFromQuery() { return new URLSearchParams(window.location.search).get('id'); }      //reads the memorials Id out of the page URL//

function renderMemorial() {
  const root = document.getElementById('memorialRoot');
  if (!root) return;
  const id = getIdFromQuery();
  const m = getMemorial(id);

  if (!m) {
    root.innerHTML = `<div class="empty-state" style="margin:6vh auto; max-width:500px;"><p>This memorial could not be found.</p><a href="index.html">Return to the garden</a></div>`;
    return;
  }
  document.title = `${m.name} · Digital Graveyard Collective`;
  const gallery = m.gallery || [];
  const milestones = m.milestones || [];
//builds the whole page in one go, identity band at the top (photo,names,dates) followed by a tabbed content area below (about,timeline & memories)
  root.innerHTML = `
    <section class="dark-band identity-band">
      <div class="dark-band-inner">
        <a class="back-link" href="index.html">← Back to the garden</a>
        ${m.photo ? `<img class="memorial-photo" src="${m.photo}" alt="">` : ''}
        <h1 class="id-name">${escapeHtml(m.name)}</h1>
        <p class="id-dates">${formatDates(m)}</p>
        ${m.isPrivate ? `<span class="private-badge">🔒 Private memorial</span>` : ''}
        ${m.quote ? `<p class="quote">${escapeHtml(m.quote)}</p>` : ''}
        ${m.tribute ? `<p class="tribute-dark">${escapeHtml(m.tribute)}</p>` : ''}

        <div class="candle-row" id="candleRow" aria-live="polite"></div>
        <div class="flower-row" id="flowerRow" aria-live="polite"></div>

        <div class="controls-row">
          <button class="gesture-btn filled" id="plantFlowerBtn">🌸 Plant a Flower <span class="count" id="flowerCount">${m.flowers}</span></button>
          <button class="gesture-btn" id="lightCandleBtn">🕯️ Light a Candle <span class="count" id="candleCount">${m.candles}</span></button>
        </div>
      </div>
    </section>

    <main>
      <div class="tab-bar" id="tabBar">
        <button class="tab-btn active" data-tab="about">About</button>
        <button class="tab-btn" data-tab="timeline">Timeline</button>
        <button class="tab-btn" data-tab="memories">Memories</button>
        <button class="tab-btn" data-tab="gallery">Gallery</button>
        <button class="tab-btn" data-tab="reflections">Reflections</button>
      </div>

      <div class="tab-panel active" id="tab-about">
        <h3 class="section-heading">About ${escapeHtml(m.name.split(' ')[0])}</h3>
        <p>${m.tribute ? escapeHtml(m.tribute) : '<em style="color:var(--muted-2);">No biography added yet.</em>'}</p>
      </div>

      <div class="tab-panel" id="tab-timeline">
        <h3 class="section-heading">Memory Timeline</h3>
        ${milestones.length ? `
          <div class="timeline">
            ${milestones.map(ms => `
              <div class="timeline-item">
                ${ms.date ? `<span class="timeline-date">${escapeHtml(ms.date)}</span>` : ''}
                <span class="timeline-text">${escapeHtml(ms.text)}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p style="color:var(--muted-2);">No timeline entries yet.</p>`}
      </div>

      <div class="tab-panel" id="tab-memories">
        <div class="memories-layout">
          <div>
            <h3 class="section-heading">Leave a Memory</h3>
            <p style="color:var(--muted-2); font-size:0.88rem; margin-top:-10px;">Share your memory, thought or message.</p>
            <div class="leave-form-tabs">
              <button class="active" data-mode="write">Write a Message</button>
              <button class="disabled" disabled title="Coming soon">Record Audio</button>
            </div>
            <form class="guestbook-form" id="guestbookForm">
              <input type="text" name="visitor" placeholder="Your name (optional)" maxlength="60">
              <textarea name="message" id="memoryText" placeholder="Write your memory here..." maxlength="1000" required></textarea>
              <div class="char-count"><span id="charCount">0</span> / 1000</div>
              <button type="submit" class="btn btn-primary" style="align-self:flex-start;">Share Memory</button>
            </form>
          </div>
          <div class="memories-from-others">
            <h4>Memories from others</h4>
            <div id="guestbookEntries"></div>
          </div>
        </div>
      </div>

      <div class="tab-panel" id="tab-gallery">
        <h3 class="section-heading">Gallery</h3>
        <div class="gallery-strip" id="galleryStrip">
          ${gallery.map((src, i) => `<img src="${src}" data-idx="${i}" alt="">`).join('')}
        </div>
        <div class="btn-row" style="justify-content:flex-start; margin-top:18px;">
          <button class="btn btn-ghost" id="addPhotoBtn">+ Add a Photo</button>
          <input type="file" id="addPhotoInput" accept="image/*" style="display:none;">
        </div>
      </div>

      <div class="tab-panel" id="tab-reflections">
        <div class="reflections-cta">
          <h3>Reflection Mode</h3>
          <p>A quiet, distraction-free space to sit with ${escapeHtml(m.name)}'s memory. Take a deep breath. Listen. Remember.</p>
          <button class="btn btn-inverse" id="reflectionBtn">Enter Reflection Mode</button>
        </div>
      </div>

      <div style="text-align:center; margin-top:8vh;">
        <a href="#" id="removeLink" class="remove-link">Remove this memorial</a>
      </div>
    </main>
  `;
  //fills in the dynamic bits on the memorial page (candle, flowers rows, guestbook entries.// 


  renderGestures(m);
  renderGuestbook(m);
  initTabs();
//event delegation//
  document.getElementById('lightCandleBtn').addEventListener('click', () => {
    updateMemorial(m.id, mm => { mm.candles += 1; });
    renderGestures(getMemorial(m.id));
  });
  document.getElementById('plantFlowerBtn').addEventListener('click', () => {
    updateMemorial(m.id, mm => { mm.flowers += 1; });
    renderGestures(getMemorial(m.id));                    
  });

  document.getElementById('reflectionBtn').addEventListener('click', () => startReflectionMode(getMemorial(m.id)));

  const strip = document.getElementById('galleryStrip');
  strip.addEventListener('click', e => { if (e.target.tagName === 'IMG') openLightbox(e.target.src); });

  document.getElementById('addPhotoBtn').addEventListener('click', () => document.getElementById('addPhotoInput').click());
  document.getElementById('addPhotoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    updateMemorial(m.id, mm => { mm.gallery = (mm.gallery || []).concat(dataUrl); });
    const updated = getMemorial(m.id);
    strip.innerHTML = updated.gallery.map((src, i) => `<img src="${src}" data-idx="${i}" alt="">`).join('');
  });
//add a photo lets any visitor contribute an image after the memorial exists// 


  const memoryText = document.getElementById('memoryText');
  const charCount = document.getElementById('charCount');
  memoryText.addEventListener('input', () => { charCount.textContent = memoryText.value.length; });

  document.getElementById('guestbookForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const visitor = form.visitor.value.trim() || 'Anonymous';
    const message = form.message.value.trim();
    if (!message) return;
    updateMemorial(m.id, mm => { mm.guestbook.push({ visitor, message, date: new Date().toISOString() }); });
    form.reset();
    charCount.textContent = '0';
    renderGuestbook(getMemorial(m.id));
  });
//deletes the memorial after an explicit confirmation dialog//
  document.getElementById('removeLink').addEventListener('click', e => {
    e.preventDefault();
    const sure = window.confirm(`Remove ${m.name}'s memorial? This can't be undone.`);
    if (sure) { deleteMemorial(m.id); window.location.href = 'index.html'; }
  });
}
//wires up the about/timeline/memories/gallery and reflection tab bar// 
function initTabs() {
  const bar = document.getElementById('tabBar');
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
}
//the set of flower icons used when rendering planted flowers - cycles through all 5//
const FLOWER_IMAGES = [
  'assets/images/flower-1.png', 'assets/images/flower-2.png', 'assets/images/flower-3.png',
  'assets/images/flower-4.png', 'assets/images/flower-5.png'
];
//renders the row of lit candels and planted flowers and updates thier counters, is capped on display//
function renderGestures(m) {
  const candleRow = document.getElementById('candleRow');
  const flowerRow = document.getElementById('flowerRow');
  const candleCount = document.getElementById('candleCount');
  const flowerCount = document.getElementById('flowerCount');
  candleRow.innerHTML = Array.from({ length: Math.min(m.candles, 24) }).map(() => `<div class="candle"></div>`).join('');
  flowerRow.innerHTML = Array.from({ length: Math.min(m.flowers, 40) }).map((_, i) => `<img class="planted-flower" src="${FLOWER_IMAGES[i % FLOWER_IMAGES.length]}" alt="">`).join('');
  candleCount.textContent = m.candles;
  flowerCount.textContent = m.flowers;
}
//renders the memories from others guestbook list// 
function renderGuestbook(m) {
  const el = document.getElementById('guestbookEntries');
  if (!m.guestbook.length) {
    el.innerHTML = `<p style="color:var(--muted-2); font-size:0.9rem;">Be the first to leave a memory.</p>`;
    return;
  }
  el.innerHTML = m.guestbook.slice().reverse().map(g => `
    <div class="entry">
      <div class="entry-meta-row">
        <div class="avatar-dot"></div>
        <span class="entry-name">${escapeHtml(g.visitor)}</span>
        <span class="entry-time">${timeAgo(g.date)}</span>
      </div>
      <div class="entry-text">${escapeHtml(g.message)}</div>
    </div>
  `).join('');
}

//lightbox//
function openLightbox(src) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `<img src="${src}" alt="">`;
  box.addEventListener('click', () => box.remove());
  document.body.appendChild(box);
}

//reflection mode, a fullscreen distraction free, slideshow of a memorials, quotes and photos with ambient background sounds//
function startReflectionMode(m) {
  const slides = [];
  slides.push({ type: 'title', name: m.name, quote: m.quote, photo: m.photo });
  if (m.tribute) slides.push({ type: 'text', text: m.tribute });
  (m.gallery || []).forEach(src => slides.push({ type: 'image', src }));
//builds the fullscreen overlay//
  const overlay = document.createElement('div');
  overlay.className = 'reflection-overlay';
  overlay.innerHTML = `
    <button class="reflection-exit" id="reflectionExit">Exit reflection</button>
    <div class="player-bar" id="playerBar">
      <button class="player-btn" id="prevBtn">⏮</button>
      <button class="player-btn play-pause" id="playPauseBtn">⏸</button>
      <button class="player-btn" id="nextBtn">⏭</button>
      <button class="player-btn" id="ambientToggle" title="Ambient sounds">♪</button>
    </div>
  `;
  document.body.appendChild(overlay);
  //reflection mode auto plays the memorials chosen ambient sound (if one was set)

  let currentSound = (m.soundscape && m.soundscape !== 'silence') ? m.soundscape : null;
  if (currentSound) playSoundscape(currentSound);

  let i = 0, slideEl = null, playing = true, interval = null;
  //renders a single slide by index wrapping around at both ends//
  function showSlide(index) {
    if (slideEl) slideEl.remove();
    const s = slides[((index % slides.length) + slides.length) % slides.length];
    slideEl = document.createElement('div');
    slideEl.className = 'reflection-slide';
    if (s.type === 'title') {
      slideEl.innerHTML = `${s.photo ? `<img class="r-photo" src="${s.photo}" alt="">` : ''}<div class="r-name">${escapeHtml(s.name)}</div>${s.quote ? `<div class="r-quote">"${escapeHtml(s.quote)}"</div>` : ''}`;
    } else if (s.type === 'text') {
      slideEl.innerHTML = `<div class="r-text">${escapeHtml(s.text)}</div>`;
    } else if (s.type === 'image') {
      slideEl.innerHTML = `<img src="${s.src}" alt="">`;
    }
    overlay.insertBefore(slideEl, overlay.querySelector('.reflection-exit'));
    requestAnimationFrame(() => slideEl.classList.add('visible'));
  }

  function startInterval() { interval = setInterval(() => { i++; showSlide(i); }, 4500); }
  function stopInterval() { clearInterval(interval); }

  showSlide(i);
  startInterval();
  //manual navigation resets the auto advance timer so it doesnt immediately jump forward again right after a manual click//

  document.getElementById('prevBtn').addEventListener('click', () => { i--; showSlide(i); stopInterval(); if (playing) startInterval(); });
  document.getElementById('nextBtn').addEventListener('click', () => { i++; showSlide(i); stopInterval(); if (playing) startInterval(); });
  document.getElementById('playPauseBtn').addEventListener('click', function () {
    playing = !playing;
    this.textContent = playing ? '⏸' : '▶';
    if (playing) startInterval(); else stopInterval();
  });
//ambient sound picker, a small popover panel, letting the visitor switch or mute the ambient track//
  document.getElementById('ambientToggle').addEventListener('click', () => {
    let panel = document.getElementById('ambientPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.className = 'ambient-panel';
    panel.id = 'ambientPanel';
    const options = ['rain', 'wind', 'birdsong', 'ocean'];
    panel.innerHTML = `<h5>Ambient Sounds</h5>` + options.map(opt => `
      <button class="ambient-option ${currentSound === opt ? 'active' : ''}" data-sound="${opt}">${SOUND_LABELS[opt]}</button>
    `).join('') + `<button class="ambient-option ${!currentSound ? 'active' : ''}" data-sound="silence">Silence</button>`;
    overlay.appendChild(panel);
    panel.addEventListener('click', e => {
      const b = e.target.closest('.ambient-option');
      if (!b) return;
      const sound = b.dataset.sound;
      panel.querySelectorAll('.ambient-option').forEach(o => o.classList.remove('active'));
      b.classList.add('active');
      currentSound = sound === 'silence' ? null : sound;
      if (currentSound) playSoundscape(currentSound); else stopSoundscape();
    });
  });

  document.getElementById('reflectionExit').addEventListener('click', () => {
    stopInterval();
    stopSoundscape();
    overlay.remove();
  });
}
//utilities//  
function escapeHtml(str) {                       
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  renderGallery();
  initCreateForm();
  renderMemorial();
});
