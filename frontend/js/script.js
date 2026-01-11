let userFavoritesIds = new Set();
let currentIngIndex = 0;
const ING_VISIBLE_COUNT = 5;

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('ingredient-input');
    const suggestionsList = document.getElementById('suggestions-list');
    const tagsContainer = document.getElementById('tags-container');
    const form = document.querySelector('.search');

    const recipesList = document.getElementById('recipes-list');
    const resultsContainer = document.getElementById('results');
    const aboutPanel = document.getElementById('about-panel');
    const pagination = document.getElementById('pagination');
    const paginationPages = document.getElementById('pagination-pages');
    const btnPrev = document.querySelector('.pagination__prev');
    const btnNext = document.querySelector('.pagination__next');
    const favPagination = document.getElementById('fav-pagination');
    const favPaginationPages = document.getElementById('fav-pagination-pages');
    const favBtnPrev = document.querySelector('.fav-pagination__prev');
    const favBtnNext = document.querySelector('.fav-pagination__next');
    const favGuestBlock = document.getElementById('fav-guest-block');
    const favUserBlock = document.getElementById('fav-user-block');
    const favContainer = document.getElementById('favorites-container');

    // Элементы страницы истории
    const historyGuestBlock = document.getElementById('history-guest-block');
    const historyUserBlock = document.getElementById('history-user-block');
    const historyList = document.getElementById('history-list');
    const historyPagination = document.getElementById('history-pagination');
    const historyPaginationPages = document.getElementById('history-pagination-pages');
    const historyBtnPrev = document.querySelector('.history-pagination__prev');
    const historyBtnNext = document.querySelector('.history-pagination__next');

    let selectedIngredients = [];
    let allRecipes = [];
    let currentLimit = 10;
    let currentPage = 1;

    let allFavorites = [];
    let currentFavPage = 1;
    let currentFavLimit = 10;

    let allHistory = [];
    let historyCurrentPage = 1;
    let historyCurrentLimit = 10;

    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsFromUrl = urlParams.get('ingredients');

    if (ingredientsFromUrl) {
        const ings = ingredientsFromUrl.split(',');
        ings.forEach(ing => {
            if (ing && !selectedIngredients.includes(ing)) {
                selectedIngredients.push(ing);
            }
        });
        setTimeout(() => {
             if (typeof renderTags === 'function') renderTags();
        }, 0);
        setTimeout(() => {
            const searchBtn = document.querySelector('.search__btn');
            if (searchBtn) {
                searchBtn.click();
            }
        }, 100);
    }

    const token = localStorage.getItem('access_token');
    loadAuthModals();

    if (token) {
        loadUserFavoritesIds();
    }

    if (favGuestBlock && favUserBlock) {
        if (!token) {
            favGuestBlock.classList.remove('is-hidden');
        } else {
            favUserBlock.classList.remove('is-hidden');
            loadFavoritesList();
        }
    }

    if (historyGuestBlock && historyUserBlock) {
        if (!token) {
            historyGuestBlock.classList.remove('is-hidden');
        } else {
            historyUserBlock.classList.remove('is-hidden');
            loadHistory();
        }
    }

    if (!localStorage.getItem('searchHistory')) {
        localStorage.setItem('searchHistory', JSON.stringify([]));
    }

    async function loadUserFavoritesIds() {
        try {
            const res = await fetch('/favorites', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                let favs = [];
                if (Array.isArray(data)) {
                    favs = data;
                } else if (data && (data.items || data.results)) {
                    favs = data.items || data.results;
                }
                userFavoritesIds = new Set(favs.map(f => f.spoonacular_id || f.id));

                const bm = document.getElementById('recipe-bookmark');
                if(bm && window.location.pathname.includes('recipe_detail.html')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const rId = parseInt(urlParams.get('id'));
                    if(rId && userFavoritesIds.has(rId)) {
                        bm.src = '/static/images/bookmark_filled.svg';
                    }
                }
            }
        } catch (e) {
            console.error("Не удалось загрузить ID избранного", e);
            userFavoritesIds = new Set();
        }
    }

    async function loadFavoritesList() {
        try {
            const response = await fetch('/favorites', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.reload();
                return;
            }
            const data = await response.json();

            let favorites = [];
            if (Array.isArray(data)) {
                favorites = data;
            } else if (data && (data.items || data.results)) {
                favorites = data.items || data.results;
            }
            allFavorites = favorites;
            currentFavPage = 1;
            renderFavPage();
        } catch (e) {
            console.error('Ошибка загрузки списка избранного:', e);
            if (favContainer) favContainer.innerHTML = '<p style="text-align:center">Ошибка загрузки</p>';
        }
    }

    function renderFavPage() {
        if (!favContainer) return;
        const start = (currentFavPage - 1) * currentFavLimit;
        const end = start + currentFavLimit;
        const pageItems = allFavorites.slice(start, end);
        favContainer.innerHTML = '';
        pageItems.forEach(renderFavoriteCard);
        updateFavPagination();
    }

    function updateFavPagination() {
        if (!favPagination || !favPaginationPages) return;
        const totalPages = Math.ceil(allFavorites.length / currentFavLimit);
        if (totalPages <= 1) {
            favPagination.style.display = 'none';
            return;
        }
        favPagination.style.display = 'flex';
        favPaginationPages.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (i === currentFavPage ? ' active' : '');
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentFavPage = i;
                renderFavPage();
            });
            favPaginationPages.appendChild(btn);
        }
        if (favBtnPrev) {
            favBtnPrev.disabled = currentFavPage === 1;
            favBtnPrev.onclick = () => {
                if (currentFavPage > 1) {
                    currentFavPage--;
                    renderFavPage();
                }
            };
        }
        if (favBtnNext) {
            favBtnNext.disabled = currentFavPage === totalPages;
            favBtnNext.onclick = () => {
                if (currentFavPage < totalPages) {
                    currentFavPage++;
                    renderFavPage();
                }
            };
        }
    }

    window.renderHistoryCard = function(item) {
        const template = document.getElementById('history-card-template');
        if (!template || !historyList) return;
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.history-item');
        const chipsContainer = clone.querySelector('.history-item__chips');
        if (chipsContainer) {
            chipsContainer.innerHTML = '';
            item.ingredients.forEach(ing => {
                const chip = document.createElement('span');
                chip.className = 'history-chip';
                chip.textContent = ing;
                chipsContainer.appendChild(chip);
            });
        }
        const clickHandler = () => {
            const query = item.ingredients.join(',');
            window.location.href = `/?ingredients=${encodeURIComponent(query)}`;
        };

        const returnIcon = card.querySelector('.history-item__label img');
        if (returnIcon) {
            returnIcon.style.cursor = 'pointer';
            returnIcon.onclick = clickHandler;
        }
        const labelText = card.querySelector('.history-item__label span');
        if (labelText) {
            labelText.style.cursor = 'pointer';
            labelText.onclick = clickHandler;
        }
        historyList.appendChild(clone);
    };

    function renderHistoryPage() {
        if (!historyList) return;
        historyList.innerHTML = '';
        const start = (historyCurrentPage - 1) * historyCurrentLimit;
        const end = start + historyCurrentLimit;
        const pageItems = allHistory.slice(start, end);

        if (pageItems.length === 0) {
            historyList.innerHTML = '<p style="text-align:center; padding:40px; color:#6B5E4B;">История пуста</p>';
            if (historyPagination) historyPagination.style.display = 'none';
            return;
        }

        pageItems.forEach(item => window.renderHistoryCard(item));
        updateHistoryPagination();
    }

    function updateHistoryPagination() {
        if (!historyPagination || !historyPaginationPages) return;
        const totalPages = Math.ceil(allHistory.length / historyCurrentLimit);
        if (totalPages <= 1) {
            historyPagination.style.display = 'none';
            return;
        }
        historyPagination.style.display = 'flex';
        historyPaginationPages.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('div');
            btn.className = `page-btn ${i === historyCurrentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                historyCurrentPage = i;
                renderHistoryPage();
                window.scrollTo({ top: historyList.offsetTop - 50, behavior: 'smooth' });
            });
            historyPaginationPages.appendChild(btn);
        }
        if (historyBtnPrev) {
            historyBtnPrev.disabled = historyCurrentPage === 1;
            historyBtnPrev.onclick = () => {
                if (historyCurrentPage > 1) {
                    historyCurrentPage--;
                    renderHistoryPage();
                }
            };
        }
        if (historyBtnNext) {
            const totalPages = Math.ceil(allHistory.length / historyCurrentLimit);
            historyBtnNext.disabled = historyCurrentPage === totalPages;
            historyBtnNext.onclick = () => {
                if (historyCurrentPage < totalPages) {
                    historyCurrentPage++;
                    renderHistoryPage();
                }
            };
        }
    }

    async function loadHistory() {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        if (token) {
            try {
                const res = await fetch('/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const serverHistory = await res.json();
                    history = [...(Array.isArray(serverHistory) ? serverHistory : []), ...history];
                }
            } catch (e) {
                console.error('Backend история не доступна:', e);
            }
        }
        allHistory = history.slice(0, 200);
        historyCurrentPage = 1;
        renderHistoryPage();
    }

    function addTag(name) {
        if (selectedIngredients.includes(name)) return;
        selectedIngredients.push(name);
        renderTags();
        input.value = '';
        suggestionsList.style.display = 'none';
        input.focus();
    }

    function removeTag(name) {
        selectedIngredients = selectedIngredients.filter(item => item !== name);
        renderTags();
    }

    function renderTags() {
        if (!tagsContainer) return;
        tagsContainer.innerHTML = '';
        selectedIngredients.forEach(ing => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip';
            chip.innerHTML = `${ing}<span class="tag-remove" data-name="${ing}">&times;</span>`;
            chip.querySelector('.tag-remove').addEventListener('click', (e) => removeTag(e.target.dataset.name));
            tagsContainer.appendChild(chip);
        });
    }

    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    if (input) {
        input.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) { suggestionsList.style.display = 'none'; return; }
            try {
                const response = await fetch(`/search/autocomplete?query=${query}`);
                const data = await response.json();
                const items = Array.isArray(data) ? data : (data.results || []);
                suggestionsList.innerHTML = '';
                if (items.length > 0) {
                    suggestionsList.style.display = 'block';
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item.name;
                        li.addEventListener('click', () => addTag(item.name));
                        suggestionsList.appendChild(li);
                    });
                } else { suggestionsList.style.display = 'none'; }
            } catch (error) { console.error(error); }
        }));
    }

    document.addEventListener('click', (e) => {
        if (suggestionsList && !e.target.closest('.search__control')) {
            suggestionsList.style.display = 'none';
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (selectedIngredients.length === 0) { alert("Выберите ингредиенты!"); return; }
            const searchItem = {
                id: Date.now(),
                ingredients: [...selectedIngredients],
                timestamp: new Date().toISOString()
            };
            let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            history.unshift(searchItem);
            history = history.slice(0, 200);
            localStorage.setItem('searchHistory', JSON.stringify(history));

            sessionStorage.setItem('lastSearchIngredients', JSON.stringify(selectedIngredients));

            const ingredientsStr = selectedIngredients.join(',');

            recipesList.innerHTML = '<p style="text-align:center; padding: 20px;">Загружаем вкусняшки...</p>';
            resultsContainer.classList.remove('is-hidden');
            if (aboutPanel) aboutPanel.style.display = 'none';
            if (pagination) pagination.style.display = 'none';

            try {
                const response = await fetch(`/search/recipes?ingredients=${ingredientsStr}&number=100`);
                allRecipes = await response.json();

                currentPage = 1;
                renderPage();

            } catch (error) {
                console.error(error);
                recipesList.innerHTML = '<p style="text-align:center;">Ошибка загрузки :(</p>';
            }
        });
    }

    function renderPage() {
        if (allRecipes.length === 0) {
            recipesList.innerHTML = '<p style="text-align:center;">Ничего не найдено.</p>';
            return;
        }

        const start = (currentPage - 1) * currentLimit;
        const end = start + currentLimit;
        const pageRecipes = allRecipes.slice(start, end);

        recipesList.innerHTML = '';

        pageRecipes.forEach(recipe => {
            const used = recipe.usedIngredients.map(i => ({ name: i.name, type: 'used' }));
            const missed = recipe.missedIngredients.map(i => ({ name: i.name, type: 'missed' }));
            const allIngs = [...used, ...missed].slice(0, 6);

            const ingTags = allIngs.map(ing => {
                const cssClass = ing.type === 'used' ? 'ingredient-tag--used' : 'ingredient-tag--missed';
                return `<div class="ingredient-tag ${cssClass}">${ing.name}</div>`;
            }).join('');

            const isFav = userFavoritesIds.has(recipe.id);
            const bookmarkIcon = isFav ? 'bookmark_filled.svg' : 'bookmark.svg';

            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-card__image"><img src="${recipe.image}" alt="${recipe.title}"></div>
                <div class="recipe-card__content">
                    <div class="recipe-card__header">
                        <img class="recipe-card__icon" src="/static/images/fork.svg" alt="">
                        <a href="/static/recipe_detail.html?id=${recipe.id}" class="recipe-card__title">${recipe.title}</a>
                    </div>
                    <div class="recipe-ingredients">${ingTags}</div>
                </div>
                <img class="recipe-card__bookmark"
                     src="/static/images/${bookmarkIcon}"
                     alt="В избранное"
                     style="cursor: pointer;"
                     onclick="toggleFavorite(this, ${recipe.id})">
            `;
            recipesList.appendChild(card);
        });

        updatePaginationUI();
    }

    function updatePaginationUI() {
        if (!pagination) return;
        pagination.style.display = 'flex';
        const totalPages = Math.ceil(allRecipes.length / currentLimit);

        paginationPages.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 10 && i > 5 && i < totalPages) {
                if (i === 6) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    paginationPages.appendChild(dots);
                }
                continue;
            }

            const btn = document.createElement('div');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentPage = i;
                renderPage();
                window.scrollTo({ top: resultsContainer.offsetTop - 50, behavior: 'smooth' });
            });
            paginationPages.appendChild(btn);
        }
        if (btnPrev) btnPrev.disabled = currentPage === 1;
        if (btnNext) btnNext.disabled = currentPage === totalPages;
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderPage(); }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const totalPages = Math.ceil(allRecipes.length / currentLimit);
            if (currentPage < totalPages) { currentPage++; renderPage(); }
        });
    }
    const limitBtns = document.querySelectorAll('.limit-btn');
    const historyLimitBtns = document.querySelectorAll('#history-limit-controls .limit-btn');
    const favLimitBtns = document.querySelectorAll('.fav-limits-buttons .limit-btn, .fav-controls-bar .limit-btn');
    const mainLimitBtns = document.querySelectorAll('#limit-controls .limit-btn');

    historyLimitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            historyLimitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            historyCurrentLimit = parseInt(btn.dataset.limit);
            historyCurrentPage = 1;
            renderHistoryPage();
        });
    });

    favLimitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            favLimitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFavLimit = parseInt(btn.dataset.limit);
            currentFavPage = 1;
            renderFavPage();
        });
    });

    mainLimitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
             mainLimitBtns.forEach(b => b.classList.remove('active'));
             btn.classList.add('active');
             currentLimit = parseInt(btn.dataset.limit);
             currentPage = 1;
             renderPage();
        });
    });

    async function loadAuthModals() {
        try {
            const response = await fetch('/static/auth_modal.html');
            if (!response.ok) return;
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            updateAuthUI();
        } catch (e) {
            console.error("Ошибка сети или JS при загрузке модалок:", e);
        }
    }
    window.loadAuthModals = loadAuthModals;
    window.loadUserFavoritesIds = loadUserFavoritesIds;
});

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
    }
}
function switchModal(currentId, targetId) {
    closeModal(currentId);
    openModal(targetId);
}

function updateAuthUI() {
    const token = localStorage.getItem('access_token');
    const navLinks = document.querySelectorAll('.top-nav__item');
    let authBtn = null;

    navLinks.forEach(link => {
        if (link.innerText.includes('Вход') || link.innerText.includes('Выход')) {
            authBtn = link;
        }
    });
    if (authBtn) {
        const textSpan = authBtn.querySelector('.top-nav__text');
        if (token) {
            if (textSpan) textSpan.textContent = "Выход";
            else authBtn.textContent = "Выход";
            authBtn.onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                alert("Вы вышли из системы");
                updateAuthUI();
                if (location.pathname.includes('favorites.html')) location.reload();
            };
        } else {
            if (textSpan) textSpan.textContent = "Вход";
            else authBtn.textContent = "Вход";
            authBtn.onclick = (e) => {
                e.preventDefault();
                openModal('modal-login');
            };
        }
    }
}

window.toggleFavorite = async function(btn, recipeId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        openModal('modal-login');
        return;
    }
    const isFilled = btn.src.includes('bookmark_filled.svg');
    const idNum = parseInt(recipeId);
    try {
        if (isFilled) {
            const res = await fetch(`/favorites/${idNum}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                btn.src = '/static/images/bookmark.svg';
                if (btn.closest('.fav-card')) {
                    btn.closest('.fav-card').remove();
                }
                userFavoritesIds.delete(idNum);
            } else {
                console.error('Ошибка удаления из избранного', res.status);
            }
        } else {
            const res = await fetch('/favorites/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spoonacular_id: idNum })
            });
            if (res.ok) {
                btn.src = '/static/images/bookmark_filled.svg';
                userFavoritesIds.add(idNum);
            } else {
                 console.error('Ошибка добавления в избранное', res.status);
            }
        }
    } catch (e) {
        console.error("Ошибка сети при избранном:", e);
    }
};

window.removeFromFavorites = async function(id, card) {
    if (!confirm('Удалить из избранного?')) return;
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`/favorites/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            card.remove();
            userFavoritesIds.delete(parseInt(id));
        }
    } catch(e) { console.error(e); }
};

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('access_token', result.access_token);
                alert("Вы успешно вошли!");
                closeModal('modal-login');
                updateAuthUI();
                location.reload();
            } else {
                alert(result.detail || "Ошибка входа");
            }
        } catch (err) { console.error(err); alert("Ошибка сети"); }
    }

    if (e.target && e.target.id === 'register-form') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                alert("Регистрация успешна! Теперь войдите.");
                switchModal('modal-signup', 'modal-login');
            } else {
                alert(result.detail || "Ошибка регистрации");
            }
        } catch (err) { console.error(err); alert("Ошибка сети"); }
    }
});

window.renderFavoriteCard = function(recipe) {
    const template = document.getElementById('fav-card-template');
    if (!template) {
        return;
    }
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.fav-card');
    const recId = recipe.spoonacular_id || recipe.id;
    card.dataset.id = recId;

    const img = card.querySelector('.fav-img');
    if (img) {
        img.src = recipe.image || '/static/images/no-image.png';
        img.alt = recipe.title;
    }

    const title = card.querySelector('.fav-card__title');
    if (title) {
        title.textContent = recipe.title;
        title.title = recipe.title;
        title.href = `/static/recipe_detail.html?id=${recId}`;
    }

    const deleteBtn = card.querySelector('.fav-bookmark-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => removeFromFavorites(recId, card));
    }

    const container = document.getElementById('favorites-container');
    if (container) container.appendChild(card);
    fetchRecipeDetails(recId, card);
}

async function getRecipeDetailsCached(recipeId) {
    const cacheKey = 'recipe_cache_' + recipeId;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    try {
        const response = await fetch(`/recipes/${recipeId}`);
        if (!response.ok) throw new Error('Ошибка загрузки рецепта');
        const data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (e) {
        console.error(e);
        return null;
    }
}

window.fetchRecipeDetails = async function(id, cardElement) {
    const details = await getRecipeDetailsCached(id);
    if (!details) return;
    const timeElem = cardElement.querySelector('.meta-time');
    if (timeElem) timeElem.textContent = details.readyInMinutes ? `${details.readyInMinutes} мин.` : '—';
    const tagsContainer = cardElement.querySelector('.meta-tags-container');
    const loadingText = cardElement.querySelector('.meta-loading');
    if (loadingText) loadingText.remove();
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        const dishType = (details.dishTypes && details.dishTypes.length > 0)
            ? details.dishTypes[0]
            : 'dish';
        const tag1 = document.createElement('div');
        tag1.className = 'meta-tag pink';
        tag1.textContent = dishType;
        tagsContainer.appendChild(tag1);
        const cuisine = (details.cuisines && details.cuisines.length > 0)
            ? details.cuisines[0]
            : 'universal';
        const tag2 = document.createElement('div');
        tag2.className = 'meta-tag green';
        tag2.textContent = cuisine;
        tagsContainer.appendChild(tag2);
    }

    const ingContainer = cardElement.querySelector('.fav-card__ingredients');
    if (ingContainer && details.extendedIngredients) {
        ingContainer.innerHTML = '';
        details.extendedIngredients.slice(0, 4).forEach(ing => {
            const span = document.createElement('span');
            span.className = 'ing-pill';
            span.textContent = ing.nameClean || ing.name;
            ingContainer.appendChild(span);
        });
    }
};

window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;

if (window.location.pathname.includes('recipe_detail.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (recipeId) {
        loadRecipeFull(recipeId);
    } else {
        document.getElementById('recipe-loading').textContent = 'ID рецепта не указан.';
    }
}

async function loadRecipeFull(id) {
    try {
        let details = await getRecipeDetailsCached(id);
        if (!details) {
            const res = await fetch(`/recipes/${id}`);
            if (!res.ok) throw new Error('Err');
            details = await res.json();
        }
        renderRecipePage(details);

        const rId = parseInt(id);
        const bookmark = document.getElementById('recipe-bookmark');

        if (bookmark) {
            bookmark.onclick = () => toggleFavorite(bookmark, rId);
            if (userFavoritesIds.size > 0) {
                const isFav = userFavoritesIds.has(rId);
                bookmark.src = isFav ? '/static/images/bookmark_filled.svg' : '/static/images/bookmark.svg';
            } else {
                const token = localStorage.getItem('access_token');
                if (token) {
                    await loadUserFavoritesIds();
                    const isFav = userFavoritesIds.has(rId);
                    bookmark.src = isFav ? '/static/images/bookmark_filled.svg' : '/static/images/bookmark.svg';
                }
            }
        }
    } catch (e) {
        console.error(e);
        const loading = document.getElementById('recipe-loading');
        if(loading) loading.textContent = 'Ошибка загрузки рецепта.';
    }
}

function renderRecipePage(recipe) {
    const loader = document.getElementById('recipe-loading');
    if(loader) loader.style.display = 'none';
    const content = document.getElementById('recipe-content');
    if(content) content.style.display = 'block';
    const titleEl = document.getElementById('recipe-title');
    if(titleEl) titleEl.textContent = recipe.title;
    const imgEl = document.getElementById('recipe-img');
    if(imgEl) imgEl.src = recipe.image;
    const timeEl = document.getElementById('recipe-time');
    if(timeEl) timeEl.textContent = (recipe.readyInMinutes || '—') + ' мин.';
    const servEl = document.getElementById('recipe-servings');
    if(servEl) servEl.textContent = (recipe.servings || '—') + ' порц.';
    const dishEl = document.getElementById('recipe-dish-type');
    if(dishEl) dishEl.textContent = (recipe.dishTypes && recipe.dishTypes[0]) ? recipe.dishTypes[0] : 'dish';
    const cuisEl = document.getElementById('recipe-cuisine');
    if(cuisEl) cuisEl.textContent = (recipe.cuisines && recipe.cuisines[0]) ? recipe.cuisines[0] : 'universal';

    const bookmark = document.getElementById('recipe-bookmark');
    if(bookmark) {
        const isFav = userFavoritesIds.has(parseInt(recipe.id));
        bookmark.src = isFav ? '/static/images/bookmark_filled.svg' : '/static/images/bookmark.svg';
        bookmark.onclick = () => toggleFavorite(bookmark, recipe.id);
    }

    if (recipe.nutrition && recipe.nutrition.nutrients) {
        const findNut = (name) => {
            const n = recipe.nutrition.nutrients.find(n => n.name === name);
            return n ? Math.round(n.amount) : '—';
        };
        const cal = document.getElementById('nutri-cal'); if(cal) cal.textContent = findNut('Calories');
        const pro = document.getElementById('nutri-prot'); if(pro) pro.textContent = findNut('Protein');
        const fat = document.getElementById('nutri-fat'); if(fat) fat.textContent = findNut('Fat');
        const carb = document.getElementById('nutri-carb'); if(carb) carb.textContent = findNut('Carbohydrates');
    }

    const ingList = document.getElementById('ing-list-track');
    const ingTmpl = document.getElementById('tmpl-ingredient');
    const ings = recipe.extendedIngredients || [];

    if(ingList && ingTmpl) {
        ingList.innerHTML = '';
        ings.forEach(ing => {
            const clone = ingTmpl.content.cloneNode(true);
            const iImg = clone.querySelector('.ing-img');
            if(iImg) iImg.src = `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`;

            const iName = clone.querySelector('.ing-name');
            if(iName) iName.textContent = ing.nameClean || ing.name;

            const iAm = clone.querySelector('.ing-amount');
            if(iAm) iAm.textContent = `${Math.round(ing.amount)} ${ing.unit}`;

            ingList.appendChild(clone);
        });

        const track = document.getElementById('ing-list-track');
        if(track.children.length > 0) {
            track.children[0].style.marginLeft = '0px';
        }
        if (ings.length <= 5) {
            track.style.justifyContent = 'center';
        } else {
            track.style.justifyContent = 'flex-start';
        }
        initIngCarousel(ings.length);
    }
    const stepsContainer = document.getElementById('steps-container');
    const stepTmpl = document.getElementById('tmpl-step');

    if(stepsContainer && stepTmpl) {
        stepsContainer.innerHTML = '';
        if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
            recipe.analyzedInstructions[0].steps.forEach(step => {
                const clone = stepTmpl.content.cloneNode(true);
                clone.querySelector('.step-num').textContent = step.number + '.';
                clone.querySelector('.step-text').textContent = step.step;
                stepsContainer.appendChild(clone);
            });
        } else {
            stepsContainer.innerHTML = '<p style="text-align:center">Инструкций нет.</p>';
        }
    }
}

window.initIngCarousel = function(totalCount) {
    currentIngIndex = 0;
    const prevBtn = document.querySelector('.ing-carousel-btn.prev-btn');
    const nextBtn = document.getElementById('ing-btn-next');
    if(prevBtn) prevBtn.classList.add('hidden');
    if(nextBtn) {
        if(totalCount <= ING_VISIBLE_COUNT) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
    }
}

window.moveIngCarousel = function(direction) {
    const track = document.getElementById('ing-list-track');
    if(!track) return;
    const cards = track.children;
    const total = cards.length;
    const cardWidth = 175;

    currentIngIndex += direction;
    if (currentIngIndex < 0) currentIngIndex = 0;
    if (currentIngIndex > total - 5) currentIngIndex = total - 5;
    if (cards.length > 0) {
        cards[0].style.marginLeft = `-${currentIngIndex * cardWidth}px`;
        cards[0].style.transition = 'margin-left 0.3s ease';
    }
    const prevBtn = document.querySelector('.ing-carousel-btn.prev-btn');
    const nextBtn = document.getElementById('ing-btn-next');
    if (prevBtn) {
        if (currentIngIndex === 0) prevBtn.classList.add('hidden');
        else prevBtn.classList.remove('hidden');
    }
    if (nextBtn) {
        if (currentIngIndex >= total - ING_VISIBLE_COUNT) nextBtn.classList.add('hidden');
        else nextBtn.classList.remove('hidden');
    }
};