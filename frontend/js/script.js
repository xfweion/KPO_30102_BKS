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

    let allFavorites = [];
    let currentFavPage = 1;
    let currentFavLimit = 10;

    // Элементы страницы избранного
    const favGuestBlock = document.getElementById('fav-guest-block');
    const favUserBlock = document.getElementById('fav-user-block');
    const favContainer = document.getElementById('favorites-container');
    const favEmptyMsg = document.getElementById('fav-empty-msg');

    let selectedIngredients = [];
    let allRecipes = [];
    let currentLimit = 10;
    let currentPage = 1;
    let userFavoritesIds = new Set();

    // Элементы страницы истории
    const historyGuestBlock = document.getElementById('history-guest-block');
    const historyUserBlock = document.getElementById('history-user-block');
    const historyList = document.getElementById('history-list');
    const historyPagination = document.getElementById('history-pagination');
    const historyPaginationPages = document.getElementById('history-pagination-pages');
    const historyBtnPrev = document.querySelector('.history-pagination__prev');
    const historyBtnNext = document.querySelector('.history-pagination__next');

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
            loadHistory(); // грузим историю
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
        const returnIcon = card.querySelector('.history-item__label img');
        if (returnIcon) {
            returnIcon.style.cursor = 'pointer';
            returnIcon.onclick = () => {
                const query = item.ingredients.join(',');
                window.location.href = `/?ingredients=${encodeURIComponent(query)}`;
            };
        }
        const labelText = card.querySelector('.history-item__label span');
        if (labelText) {
            labelText.style.cursor = 'pointer';
            labelText.onclick = () => {
                const query = item.ingredients.join(',');
                window.location.href = `/?ingredients=${encodeURIComponent(query)}`;
            };
        }
        historyList.appendChild(clone);
    };

    // Пагинация
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
                        <a href="#" class="recipe-card__title">${recipe.title}</a>
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
    historyLimitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            historyLimitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            historyCurrentLimit = parseInt(btn.dataset.limit);
            historyCurrentPage = 1;
            renderHistoryPage();
        });
    });

    const favLimitBtns = document.querySelectorAll('.results-limit .limit-btn, .fav-limits-buttons .limit-btn, .fav-controls-bar .limit-btn');

    favLimitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            favLimitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFavLimit = parseInt(btn.dataset.limit);
            currentFavPage = 1;
            renderFavPage();
        });
    });

    const mainLimitBtns = document.querySelectorAll('.limit-btn:not(#history-limit-controls .limit-btn):not(.fav-controls-bar .limit-btn)');
    mainLimitBtns.forEach(btn => {
        if (btn.closest('#history-limit-controls') || btn.closest('.fav-controls-bar') || btn.closest('.results-limit')) return;
        btn.addEventListener('click', () => {
             document.querySelectorAll('.limit-btn').forEach(b => {
                 if (!b.closest('#history-limit-controls') && !b.closest('.fav-controls-bar')) {
                     b.classList.remove('active');
                 }
             });
             btn.classList.add('active');
             currentLimit = parseInt(btn.dataset.limit);
             currentPage = 1;
             renderPage();
        });
    });

    limitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            limitBtns.forEach(b => b.classList.remove('active'));
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
    try {
        if (isFilled) {
            const res = await fetch(`/favorites/${recipeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                btn.src = '/static/images/bookmark.svg';
                if (btn.closest('.fav-card')) {
                    btn.closest('.fav-card').remove();
                }
            }
        } else {
            const res = await fetch('/favorites/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spoonacular_id: recipeId })
            });
            if (res.ok) {
                btn.src = '/static/images/bookmark_filled.svg';
            }
        }
    } catch (e) {
        console.error("Ошибка избранного:", e);
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
        console.error("Шаблон #fav-card-template не найден!");
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
        if (details.dishTypes && details.dishTypes.length > 0) {
            const tag = document.createElement('div');
            tag.className = 'meta-tag pink';
            tag.textContent = details.dishTypes[0];
            tagsContainer.appendChild(tag);
        }
        if (details.cuisines && details.cuisines.length > 0) {
            const tag = document.createElement('div');
            tag.className = 'meta-tag green';
            tag.textContent = details.cuisines[0];
            tagsContainer.appendChild(tag);
        }
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