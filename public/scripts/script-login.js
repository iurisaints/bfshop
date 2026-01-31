async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // 1. SALVA DADOS ESSENCIAIS
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role); // Importante para o Header
            localStorage.setItem('userId', data.id);     // Importante para o Carrinho

            // 2. MIGRAÇÃO DE CARRINHO (Visitante -> Usuário Logado)
            // Pega o que estava no carrinho temporário
            const guestCart = JSON.parse(localStorage.getItem('cart_guest')) || [];
            
            if (guestCart.length > 0) {
                const userKey = `cart_${data.id}`;
                const userCart = JSON.parse(localStorage.getItem(userKey)) || [];
                
                // Junta os dois carrinhos
                const mergedCart = [...userCart, ...guestCart];
                
                // Salva na conta do usuário e limpa o temporário
                localStorage.setItem(userKey, JSON.stringify(mergedCart));
                localStorage.removeItem('cart_guest');
            }

            // 3. REDIRECIONAMENTO INTELIGENTE
            alert("Login realizado com sucesso!");
            
            if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert(data.error || "Erro ao fazer login.");const API_URL = 'http://localhost:3000/api';

// Inicializa quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

async function initAdmin() {
    // 1. Verifica token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Carrega Estatísticas
    try {
        // Usa o window.authFetch do app.js para já mandar o Token
        if (typeof window.authFetch !== 'function') {
            console.error("authFetch não carregou. Verifique a ordem dos scripts no HTML.");
            return;
        }

        const res = await window.authFetch(`${API_URL}/admin/stats`);
        
        if (res.ok) {
            const data = await res.json();
            
            // Atualiza a tela (com proteção contra null)
            const elRevenue = document.getElementById('total-revenue');
            const elSales = document.getElementById('total-sales');
            const elUsers = document.getElementById('total-users');

            if (elRevenue) elRevenue.innerText = parseFloat(data.revenue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if (elSales) elSales.innerText = data.sales;
            if (elUsers) elUsers.innerText = data.users;
        } else {
            console.error("Erro ao carregar stats:", res.status);
        }

    } catch (error) {
        console.error("Erro de conexão no Admin:", error);
    }

    // 3. Carrega a Lista de Produtos (Se existir a função)
    if (typeof loadAdminProducts === 'function') {
        loadAdminProducts();
    }
}

// --- FUNÇÕES DE PRODUTO (CRUD) ---

// Carregar lista de produtos
async function loadAdminProducts() {
    const list = document.getElementById('admin-product-list');
    if(!list) return;

    try {
        const res = await fetch(`${API_URL}/products?t=${Date.now()}`);
        const products = await res.json();

        list.innerHTML = '';
        
        products.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = "display:flex; justify-content:space-between; padding:15px; background:#f8fafc; margin-bottom:10px; border-radius:8px; border:1px solid #e2e8f0; align-items:center;";
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${p.image_url}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div>
                        <strong style="color:var(--blue-navy);">${p.title}</strong><br>
                        <small>R$ ${parseFloat(p.price).toFixed(2).replace('.', ',')}</small>
                    </div>
                </div>
                <div>
                    <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

// Salvar produto (Formulário)
async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    // Coleta dados simples
    const title = document.getElementById('p-title').value;
    const price = parseFloat(document.getElementById('p-price').value);
    const category = document.getElementById('p-category').value;
    const description = document.getElementById('p-desc').value;
    
    // Aqui usaremos uma imagem fixa por enquanto para evitar complexidade de Upload agora
    // Depois podemos implementar upload real
    const imageUrl = "https://img.freepik.com/free-vector/hand-drawn-back-school-background_23-2149464866.jpg"; 

    try {
        const res = await window.authFetch(`${API_URL}/products`, {
            method: 'POST',
            body: JSON.stringify({ title, price, category, description, image_url: imageUrl })
        });

        if(res.ok) {
            alert("Produto Salvo!");
            document.getElementById('product-form').reset();
            loadAdminProducts(); // Recarrega lista
        } else {
            alert("Erro ao salvar produto.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Deletar Produto
async function deleteProduct(id) {
    if(!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
        const res = await window.authFetch(`${API_URL}/products/${id}`, {
            method: 'DELETE'
        });

        if(res.ok) {
            loadAdminProducts();
        } else {
            alert("Erro ao excluir.");
        }
    } catch (e) {
        console.error(e);
    }
}

function resetForm() {
    document.getElementById('product-form').reset();
}
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor.");
    }
}