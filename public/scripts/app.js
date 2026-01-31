const API_URL = 'http://localhost:3000/api'; // Em produção use a URL do Railway

// ==================================================
// 1. AUTENTICAÇÃO E MENU
// ==================================================

// Torna a função GLOBAL para o cart.js conseguir usar
// app.js (Apenas a parte inicial)

window.authFetch = async function(url, options = {}) {
    const token = localStorage.getItem('token');
    
    // Configura headers padrão
    const headers = { ...options.headers };

    // SÓ adiciona JSON se NÃO for envio de arquivo (FormData)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
        if(response.status === 403 && url.includes('admin')) {
             alert("Sessão expirada ou sem permissão.");
        }
        logout(); 
    }
    return response;
};

function checkAuth() {
    const token = localStorage.getItem('token');
    const userNav = document.getElementById('user-nav');
    
    if (!userNav) return; 

    if (token) {
        const name = localStorage.getItem('userName') || 'Profa.';
        const role = localStorage.getItem('userRole'); 

        const adminLink = role === 'admin' 
            ? `<a href="admin.html" class="btn-header-link" style="color:#f59e0b;"><i class="fas fa-crown"></i> Admin</a>` 
            : '';

        userNav.innerHTML = `
            ${adminLink}
            <span class="user-greeting" style="font-size:0.9rem; font-weight:bold; color:var(--blue-navy);">Olá, ${name}</span>
            <button onclick="logout()" style="background:none; border:none; color:#666; cursor:pointer; font-size:0.9rem;">(Sair)</button>
        `;
    } else {
        userNav.innerHTML = `
            <a href="login.html" class="btn-header-link">Entrar</a>
            <a href="cadastro.html" style="background:var(--red-bordo); padding:6px 15px; border-radius:20px; color: white; font-weight:bold; font-size:0.85rem;">Cadastrar</a>
        `;
    }
}

function logout() {
    localStorage.clear(); // Limpa token, carrinho, favoritos... tudo.
    window.location.href = 'index.html';
}

// ==================================================
// 2. FAVORITOS (LOCALSTORAGE)
// ==================================================
function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites')) || [];
}

function toggleFavorite(id, btnElement) {
    // Impede que o clique no coração abra o modal do produto
    if(event) event.stopPropagation();

    let favs = getFavorites();
    const index = favs.indexOf(id);

    if (index === -1) {
        favs.push(id); // Adiciona
        if(btnElement) {
            btnElement.classList.add('active');
            btnElement.innerHTML = '<i class="fas fa-heart"></i>'; // Coração cheio
        }
    } else {
        favs.splice(index, 1); // Remove
        if(btnElement) {
            btnElement.classList.remove('active');
            btnElement.innerHTML = '<i class="far fa-heart"></i>'; // Coração vazio
        }
        
        // Se estivermos na página de favoritos, recarrega para sumir com o item removido
        if(window.location.pathname.includes('favoritos.html')) {
            loadFavoritesPage();
        }
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
}

function isFavorite(id) {
    const favs = getFavorites();
    return favs.includes(id);
}

// ==================================================
// 3. PRODUTOS E RENDERIZAÇÃO
// ==================================================
let allProducts = [];

async function loadProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;

    // Se tiver busca/categoria na URL ou inputs
    const searchInput = document.getElementById('search-input');
    const search = searchInput ? searchInput.value : '';
    
    // Pega categoria ativa (se houver lógica de filtro)
    const activeCatBtn = document.querySelector('.cat-btn.active');
    const category = activeCatBtn && activeCatBtn.innerText !== 'Todas' ? activeCatBtn.innerText : '';

    let url = `${API_URL}/products?t=${Date.now()}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await fetch(url);
        allProducts = await res.json();
        renderProducts(allProducts, container);
    } catch (error) {
        console.error("Erro:", error);
        container.innerHTML = '<p style="text-align:center; padding:20px;">Erro ao carregar produtos.</p>';
    }
}

// Função para carregar SOMENTE favoritos (usada na página favoritos.html)
async function loadFavoritesPage() {
    const container = document.getElementById('favorites-container');
    if(!container) return;

    const favIds = getFavorites();

    if(favIds.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px;">
                <i class="far fa-heart" style="font-size:4rem; color:#cbd5e1; margin-bottom:20px;"></i>
                <h3 style="color:var(--text-gray);">Sua lista está vazia</h3>
                <p style="color:#999; margin-bottom:20px;">Salve seus materiais preferidos aqui.</p>
                <a href="index.html" class="btn-buy" style="display:inline-block; width:auto; padding:10px 30px; text-decoration:none;">
                    Ir para a Loja
                </a>
            </div>
        `;
        return;
    }

    try {
        // Busca todos os produtos para filtrar (simples para poucos produtos)
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();
        allProducts = products; // Guarda globalmente para o modal funcionar
        
        // Filtra apenas os que estão nos favoritos
        const favProducts = products.filter(p => favIds.includes(p.id));
        renderProducts(favProducts, container);
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Erro ao carregar favoritos.</p>';
    }
}

function renderProducts(products, containerElement) {
    containerElement.innerHTML = '';

    if (products.length === 0) {
        containerElement.innerHTML = '<p style="text-align:center; width:100%; color:#666; padding:20px;">Nenhum produto encontrado.</p>';
        return;
    }

    products.forEach(p => {
        const priceNum = parseFloat(p.price);
        const oldPrice = (priceNum * 1.2).toFixed(2).replace('.', ',');
        const currentPrice = priceNum.toFixed(2).replace('.', ',');
        
        // Verifica se é favorito para pintar o coração
        const activeClass = isFavorite(p.id) ? 'active' : '';
        const heartIcon = isFavorite(p.id) ? 'fas fa-heart' : 'far fa-heart'; // fas = cheio, far = borda

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="badge-promo">OFERTA</div>
            
            <div class="btn-favorite ${activeClass}" onclick="toggleFavorite(${p.id}, this)">
                <i class="${heartIcon}"></i>
            </div>

            <img src="${p.image_url}" class="card-img-top" onclick="openProductDetail(${p.id})" alt="${p.title}">
            
            <div class="card-body">
                <h3 class="card-title" onclick="openProductDetail(${p.id})">${p.title}</h3>
                
                <div class="price-row">
                    <span class="price-old">R$ ${oldPrice}</span>
                    <span class="price-new">R$ ${currentPrice}</span>
                </div>

                <button class="btn-buy" onclick="addToCartWrapper(${p.id})">
                    ADICIONAR
                </button>
            </div>
        `;
        containerElement.appendChild(div);
    });
}

// Wrapper para adicionar (Cartões da Vitrine)
function addToCartWrapper(id) {
    // Procura no array global
    let product = allProducts.find(p => p.id === id);
    
    // Se não achou (ex: erro de carregamento), tenta buscar do HTML (fallback) ou alerta
    if(!product) {
         alert("Erro ao identificar produto. Tente recarregar a página.");
         return;
    }
    
    // Chama a função do cart.js
    if (typeof addToCart === 'function') {
        addToCart(product);
    }
}

// ==================================================
// 4. MODAIS E INTERAÇÃO
// ==================================================
function openProductDetail(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    // Preenche Modal
    document.getElementById('pm-img').src = product.image_url;
    document.getElementById('pm-title').innerText = product.title;
    document.getElementById('pm-desc').innerText = product.description || "Sem descrição detalhada.";
    document.getElementById('pm-price').innerText = "R$ " + parseFloat(product.price).toFixed(2).replace('.', ',');

    // Configura botão de adicionar do modal
    const btn = document.getElementById('pm-add-btn');
    btn.onclick = function() {
        if (typeof addToCart === 'function') addToCart(product);
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

function closeProductModal(e) {
    // Fecha se clicar no fundo escuro OU no botão X
    if (e.target.id === 'product-detail-modal' || e.target.classList.contains('close-modal-btn')) {
        document.getElementById('product-detail-modal').style.display = 'none';
    }
}

function toggleFilterCollapse() {
    const container = document.getElementById('filter-container');
    const btn = document.querySelector('.btn-toggle-filters');
    
    container.classList.toggle('open');
    
    if (container.classList.contains('open')) {
        btn.innerHTML = '<i class="fas fa-times"></i> Fechar Filtros';
        btn.style.color = 'var(--red-bordo)';
    } else {
        btn.innerHTML = '<i class="fas fa-filter"></i> Filtrar Materiais';
        btn.style.color = 'var(--blue-navy)';
    }
}

function filterCategory(cat) {
    // Atualiza visual
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if(event.target) event.target.classList.add('active');
    
    // Recarrega produtos com filtro
    loadProducts();
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Se tiver container de produtos (Home)
    if (document.getElementById('products-container')) {
        loadProducts();
    }

    // Se tiver container de favoritos (Pagina Favoritos)
    if (document.getElementById('favorites-container')) {
        loadFavoritesPage();
    }
});