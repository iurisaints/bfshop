// ==========================================
// CONFIGURAÇÃO GLOBAL DO CARRINHO
// ==========================================
const CART_KEY = 'brenda_shop_cart_v1'; // Chave única para evitar conflitos

// ==========================================
// FUNÇÕES PRINCIPAIS
// ==========================================

// 1. Adicionar ao Carrinho
function addToCart(product) {
    let cart = getCart();

    // Verifica se já existe
    const exists = cart.find(item => item.id === product.id);
    if (exists) {
        if(typeof showToast === 'function') showToast("Item já está no carrinho!", "info");
        else alert("Este item já está no carrinho!");
        return;
    }

    // Adiciona
    cart.push(product);
    saveCart(cart);

    // Feedback
    if(typeof showToast === 'function') showToast("Adicionado ao carrinho!", "success");
    
    // Atualiza contadores e abre o modal
    updateCartCount();
    renderCartModal();
    const modal = document.getElementById('cart-modal');
    if (modal && modal.style.display !== 'flex') {
        toggleCart(); // Abre o carrinho automaticamente
    }
}

// 2. Remover do Carrinho
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    
    updateCartCount();
    renderCartModal();
}

// 3. Finalizar Compra (Checkout)
async function checkoutCart() {
    console.log("Iniciando Checkout...");
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Por favor, faça login para continuar.");
        window.location.href = 'login.html';
        return;
    }

    // AQUI ESTAVA O ERRO: Agora usamos a mesma função getCart()
    const cart = getCart();
    console.log("Itens no carrinho:", cart);

    if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    // Feedback visual no botão
    const btn = document.getElementById('btn-checkout-final');
    const originalText = btn ? btn.innerText : 'FINALIZAR';
    if(btn) {
        btn.innerText = "PROCESSANDO...";
        btn.disabled = true;
    }

    try {
        const res = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cartItems: cart })
        });

        const data = await res.json();

        if (res.ok && data.url) {
            window.location.href = data.url; // Redireciona para Mercado Pago
        } else {
            console.error(data);
            alert("Erro ao criar pagamento: " + (data.error || "Tente novamente."));
            if(btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor.");
        if(btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

// ==========================================
// FUNÇÕES AUXILIARES E VISUAIS
// ==========================================

// Pega o carrinho do localStorage (SEMPRE USANDO A MESMA CHAVE)
function getCart() {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Salva no localStorage
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
}

// Atualiza a bolinha vermelha com o número
function updateCartCount() {
    const cart = getCart();
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = cart.length;
}

// Abre/Fecha o Modal
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        // Se estiver fechado (none ou vazio), abre flex. Se não, fecha none.
        const isClosed = modal.style.display === 'none' || modal.style.display === '';
        modal.style.display = isClosed ? 'flex' : 'none';
        
        if (isClosed) renderCartModal(); // Renderiza ao abrir
    }
}

// Desenha os itens dentro do Modal
function renderCartModal() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-value'); // Elemento do total
    if (!container) return;

    const cart = getCart();
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#cbd5e1;">
                <i class="fas fa-shopping-basket" style="font-size:3rem; margin-bottom:10px;"></i>
                <p>Seu carrinho está vazio.</p>
            </div>
        `;
        if(totalEl) totalEl.innerText = "R$ 0,00";
        return;
    }

    let total = 0;

    cart.forEach(item => {
        const price = parseFloat(item.price);
        total += price;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee;";
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${item.image_url || 'https://via.placeholder.com/50'}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                <div>
                    <strong style="color:var(--blue-navy); display:block; font-size:0.9rem;">${item.title}</strong>
                    <span style="color:#64748b; font-size:0.85rem;">R$ ${price.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
            <button onclick="removeFromCart(${item.id})" style="color:red; background:none; border:none; cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // Atualiza o Total lá embaixo
    if(totalEl) {
        totalEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

// Inicializa o contador ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});