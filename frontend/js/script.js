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

    let selectedIngredients = [];
    let allRecipes = [];
    let currentLimit = 10;
    let currentPage = 1;

    //Теги и поиск
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

    //Поиск рецептов
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (selectedIngredients.length === 0) { alert("Выберите ингредиенты!"); return; }

            const ingredientsStr = selectedIngredients.join(',');

            recipesList.innerHTML = '<p style="text-align:center; padding: 20px;">Загружаем вкусняшки...</p>';
            resultsContainer.classList.remove('is-hidden');
            aboutPanel.style.display = 'none';
            pagination.style.display = 'none';

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
                <img class="recipe-card__bookmark" src="/static/images/bookmark.svg" alt="">
            `;
            recipesList.appendChild(card);
        });

        updatePaginationUI();
    }

    function updatePaginationUI() {
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
    limitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            limitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentLimit = parseInt(btn.dataset.limit);
            currentPage = 1;
            renderPage();
        });
    });

    //Загрузка модальных окон
    async function loadAuthModals() {
        try {
            const response = await fetch('/static/auth_modal.html');
            if (!response.ok) {
                console.error(`ОШИБКА ${response.status}: Файл /static/auth_modal.html не найден!`);
                return;
            }
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            console.log("Модалки успешно загружены!");

            updateAuthUI();

        } catch (e) {
            console.error("Ошибка сети или JS при загрузке модалок:", e);
        }
    }
    loadAuthModals();
});


//Управление модальными окнами
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Модалка не найдена: ' + id);
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

window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;


//Обновление интерфейса при авторизации
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
            } else {
                alert(result.detail || "Ошибка входа");
            }
        } catch (err) {
            console.error(err);
            alert("Ошибка сети");
        }
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
        } catch (err) {
            console.error(err);
            alert("Ошибка сети");
        }
    }
});
