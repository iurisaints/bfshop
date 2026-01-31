const ADMIN_API_URL = 'http://localhost:3000/api'; 
let currentProducts = []; 

document.addEventListener('DOMContentLoaded', () => {
    initAdminPage();
});

async function initAdminPage() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    // Verifica se app.js carregou
    if (typeof window.authFetch !== 'function') {
        alert("Erro de sistema: authFetch não encontrado. Recarregue a página.");
        return;
    }
    loadProductsList();
}

// --- CARREGAR LISTA ---
async function loadProductsList() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center;">Atualizando...</p>';

    try {
        const res = await fetch(`${ADMIN_API_URL}/products?t=${Date.now()}`);
        currentProducts = await res.json(); 

        list.innerHTML = '';

        if (!currentProducts || currentProducts.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#666;">Nenhum produto cadastrado.</p>';
            return;
        }

        currentProducts.forEach(p => {
            const img = p.image_url || 'https://via.placeholder.com/50';
            const price = parseFloat(p.price).toFixed(2).replace('.', ',');

            const item = document.createElement('div');
            item.className = 'product-list-item';
            item.innerHTML = `
                <div class="product-info">
                    <img src="${img}" class="product-img">
                    <div>
                        <strong style="color:#0f172a; display:block;">${p.title}</strong>
                        <span style="font-size:0.85rem; color:#64748b;">${p.category} • R$ ${price}</span>
                    </div>
                </div>
                <div class="actions">
                    <button onclick="startEditMode(${p.id})" class="btn-icon edit-btn" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button onclick="deleteProductItem(${p.id})" class="btn-icon delete-btn" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });

    } catch (error) {
        console.error(error);
        list.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar lista.</p>`;
    }
}

// --- SALVAR (COM UPLOAD DE FOTO) ---
async function handleProductSubmit(event) {
    event.preventDefault();

    // 1. Pega os elementos do DOM
    const idField = document.getElementById('p-id');
    const titleField = document.getElementById('p-title');
    const priceField = document.getElementById('p-price');
    const categoryField = document.getElementById('p-category');
    const descField = document.getElementById('p-desc');
    const imageField = document.getElementById('p-image');

    // Validação de segurança (evita o erro 'value of null')
    if (!titleField || !priceField) {
        alert("Erro no formulário: Campos não encontrados no HTML.");
        return;
    }

    const btn = document.getElementById('btn-save');
    const originalText = btn.innerText;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    // 2. Prepara os dados (FormData é obrigatório para arquivos)
    const formData = new FormData();
    formData.append('title', titleField.value);
    formData.append('price', priceField.value);
    formData.append('category', categoryField.value);
    formData.append('description', descField.value);

    // Só adiciona a imagem se o usuário escolheu uma
    if (imageField.files.length > 0) {
        formData.append('image', imageField.files[0]);
    }

    try {
        let res;
        const id = idField.value;

        if (id) {
            // EDIÇÃO (PUT)
            res = await window.authFetch(`${ADMIN_API_URL}/products/${id}`, {
                method: 'PUT',
                body: formData 
            });
        } else {
            // NOVO (POST)
            res = await window.authFetch(`${ADMIN_API_URL}/products`, {
                method: 'POST',
                body: formData
            });
        }

        if (res.ok) {
            alert(id ? "Produto atualizado!" : "Produto criado com sucesso!");
            cancelEditMode();
            loadProductsList();
            imageField.value = ''; // Limpa o input de arquivo
        } else {
            const errData = await res.json();
            alert("Erro: " + (errData.error || "Erro desconhecido"));
        }

    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- MODO DE EDIÇÃO ---
function startEditMode(id) {
    const product = currentProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('p-id').value = product.id;
    document.getElementById('p-title').value = product.title;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-category').value = product.category;
    document.getElementById('p-desc').value = product.description;
    
    // Obs: Não podemos setar o valor do input type="file" por segurança
    
    document.getElementById('form-title').innerText = "Editando: " + product.title;
    document.getElementById('btn-save').innerText = "ATUALIZAR";
    document.getElementById('btn-save').style.background = "#f59e0b";
    document.getElementById('btn-cancel').style.display = "block";
    
    document.querySelector('.admin-wrapper').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditMode() {
    document.getElementById('product-form').reset();
    document.getElementById('p-id').value = "";
    document.getElementById('p-image').value = "";
    
    document.getElementById('form-title').innerText = "+ Novo Produto";
    document.getElementById('btn-save').innerText = "CADASTRAR PRODUTO";
    document.getElementById('btn-save').style.background = "var(--red-bordo)";
    document.getElementById('btn-cancel').style.display = "none";
}

// --- DELETAR ---
async function deleteProductItem(id) {
    if (!confirm("Tem certeza?")) return;
    try {
        const res = await window.authFetch(`${ADMIN_API_URL}/products/${id}`, { method: 'DELETE' });
        if (res.ok) loadProductsList();
    } catch (e) { alert("Erro ao excluir."); }
}

// Exporta para o HTML
window.handleProductSubmit = handleProductSubmit;
window.startEditMode = startEditMode;
window.cancelEditMode = cancelEditMode;
window.deleteProductItem = deleteProductItem;