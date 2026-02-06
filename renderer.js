const fs = require('fs');
const path = require('path');

// DOM ELEMENTS
const searchContainer = document.getElementById('search-container');
const presentationContainer = document.getElementById('presentation-container');
const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');

// Presentation Elements
const slideTitle = document.getElementById('slide-title');
const slideSubtitle = document.getElementById('slide-subtitle');
const slideBadge = document.getElementById('slide-badge');
const slideContent = document.getElementById('slide-content');
const paginationDots = document.getElementById('pagination-dots');

// Controls
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnHome = document.getElementById('btn-home');

// STATE
let hymns = [];
let filteredHymns = [];
let currentPresentation = {
    hymn: null,
    slides: [], // { type, label, lines }
    currentIndex: 0
};
let isPresentationMode = false;

// --- INITIALIZATION ---
function loadHymns() {
    try {
        const dataPath = path.join(__dirname, 'himnos.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');

        if (rawData.trim().startsWith('[')) {
            hymns = JSON.parse(rawData);
        } else {
            hymns = rawData.trim().split('\n').map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(h => h !== null);
        }

        renderResults(hymns);
    } catch (error) {
        console.error("Error loading hymns:", error);
        resultsList.innerHTML = `<div class="error">Error cargando himnos: ${error.message}</div>`;
    }
}

// --- SEARCH ---
function renderResults(list) {
    resultsList.innerHTML = '';
    list.forEach(hymn => {
        const div = document.createElement('div');
        div.className = 'hymn-item';
        div.innerHTML = `
            <span class="hymn-number">${hymn.numero}</span>
            <span class="hymn-title">${hymn.titulo}</span>
        `;
        div.onclick = () => startPresentation(hymn);
        resultsList.appendChild(div);
    });
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    filteredHymns = hymns.filter(h => {
        const matchNumber = h.numero.toString().includes(query);
        const matchTitle = h.titulo.toLowerCase().includes(query);
        const matchLyrics = h.estrofas.some(estrofa =>
            estrofa.lineas.some(linea => linea.toLowerCase().includes(query))
        );
        return matchNumber || matchTitle || matchLyrics;
    });

    renderResults(filteredHymns);
});

// --- PRESENTATION LOGIC ---
function startPresentation(hymn) {
    currentPresentation.hymn = hymn;
    currentPresentation.slides = [];

    const choruses = hymn.estrofas.filter(e => e.type === 'coro' || e.tipo === 'coro');
    const verses = hymn.estrofas.filter(e => e.type === 'verso' || e.tipo === 'verso');

    verses.forEach((verse, index) => {
        // Verse
        currentPresentation.slides.push({
            type: 'VERSO',
            label: `ESTROFA ${verse.numero}`,
            lines: verse.lineas
        });

        // Chorus Logic
        if (choruses.length > 0) {
            const isLastVerse = index === verses.length - 1;

            // Default to first chorus
            let chorusToShow = choruses[0];
            let chorusLabel = 'CORO';

            // If it's the last verse AND there is a second chorus, use the second one
            if (isLastVerse && choruses.length > 1) {
                chorusToShow = choruses[1];
                chorusLabel = 'CORO FINAL';
            }

            currentPresentation.slides.push({
                type: 'CORO',
                label: chorusLabel,
                lines: chorusToShow.lineas
            });
        }
    });

    currentPresentation.currentIndex = 0;
    isPresentationMode = true;
    updateView();
    updatePagination();
    renderSlide();
}

function updateView() {
    if (isPresentationMode) {
        searchContainer.classList.add('hidden-view');
        searchContainer.classList.remove('active-view');
        presentationContainer.classList.remove('hidden-view');
        presentationContainer.classList.add('active-view');
    } else {
        presentationContainer.classList.add('hidden-view');
        presentationContainer.classList.remove('active-view');
        searchContainer.classList.remove('hidden-view');
        searchContainer.classList.add('active-view');

        setTimeout(() => searchInput.focus(), 100);
    }
}

function renderSlide() {
    const slide = currentPresentation.slides[currentPresentation.currentIndex];
    if (!slide) return;

    // Header Info
    slideTitle.textContent = currentPresentation.hymn.titulo;
    // Pad number with zeros e.g. "042"
    const hymnNum = currentPresentation.hymn.numero.toString().padStart(3, '0');
    slideSubtitle.textContent = `HIMNO ${hymnNum}`;

    // Badge
    slideBadge.textContent = slide.label;

    // Content
    const newContent = slide.lines.join('\n');

    // Smooth transition
    slideContent.classList.add('fade-out');

    setTimeout(() => {
        slideContent.textContent = newContent;
        slideContent.classList.remove('fade-out');
        slideContent.classList.add('fade-in');

        // Trigger reflow to ensure the browser sees the 'fade-in' state
        void slideContent.offsetWidth;

        // Start the transition to visible
        slideContent.classList.remove('fade-in');
    }, 250); // Wait for fade out

    updatePagination();
}

function updatePagination() {
    paginationDots.innerHTML = '';
    currentPresentation.slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `dot ${index === currentPresentation.currentIndex ? 'active' : ''}`;
        paginationDots.appendChild(dot);
    });
}

function nextSlide() {
    if (currentPresentation.currentIndex < currentPresentation.slides.length - 1) {
        currentPresentation.currentIndex++;
        renderSlide();
    }
}

function prevSlide() {
    if (currentPresentation.currentIndex > 0) {
        currentPresentation.currentIndex--;
        renderSlide();
    }
}

function exitPresentation() {
    isPresentationMode = false;
    updateView();
}

// --- CONTROLS ---
document.addEventListener('keydown', (e) => {
    if (!isPresentationMode) {
        if (e.key === 'Enter') {
            if (filteredHymns.length === 1) startPresentation(filteredHymns[0]);
        }
        return;
    }

    switch (e.key) {
        case ' ':
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
            e.preventDefault();
            nextSlide();
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
            e.preventDefault();
            prevSlide();
            break;
        case 'Escape':
            e.preventDefault();
            exitPresentation();
            break;
    }
});

// Click Listeners
btnPrev.onclick = prevSlide;
btnNext.onclick = nextSlide;
btnHome.onclick = exitPresentation;

// START
loadHymns();
