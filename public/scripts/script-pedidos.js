// Lógica Específica desta Página
        document.addEventListener('DOMContentLoaded', async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const container = document.getElementById('orders-list');

            try {
                // Usa o window.authFetch global que criamos
                const res = await window.authFetch(`${API_URL}/orders`);
                const orders = await res.json();

                container.innerHTML = '';

                if (orders.length === 0) {
                    container.innerHTML = `
                        <div style="text-align:center; padding:60px 20px; background:white; border-radius:16px; border:1px solid #eee;">
                            <i class="fas fa-folder-open" style="font-size:4rem; color:#cbd5e1; margin-bottom:20px;"></i>
                            <h3 style="color:var(--text-gray);">Nenhum pedido encontrado</h3>
                            <a href="index.html" class="btn-buy" style="display:inline-block; width:auto; margin-top:20px; text-decoration:none;">
                                Explorar Loja
                            </a>
                        </div>
                    `;
                    return;
                }

                // Renderiza cada pedido
                orders.forEach(order => {
                    // Formata Data
                    const date = new Date(order.created_at).toLocaleDateString('pt-BR');
                    
                    // Define Status (Simulação, ajuste conforme seu backend)
                    const statusClass = order.status === 'paid' ? 'paid' : 'pending';
                    const statusLabel = order.status === 'paid' ? 'Pago' : 'Pendente';
                    const cardStatusClass = order.status === 'paid' ? 'status-paid' : 'status-pending';

                    // Formata Itens (Assumindo que o backend retorna items_summary ou array)
                    // Se não tiver detalhes, mostra texto genérico
                    const itemsHtml = order.items 
                        ? order.items.map(i => `<li class="order-item"><i class="fas fa-check-circle"></i> ${i.title}</li>`).join('')
                        : `<li class="order-item"><i class="fas fa-file-pdf"></i> Materiais Digitais Diversos</li>`;

                    const div = document.createElement('div');
                    div.className = `order-card ${cardStatusClass}`;
                    
                    div.innerHTML = `
                        <div class="order-header">
                            <div class="order-id">
                                <i class="fas fa-hashtag" style="color:#cbd5e1;"></i> Pedido #${order.id}
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span class="order-date"><i class="far fa-calendar-alt"></i> ${date}</span>
                                <span class="status-badge ${statusClass}">${statusLabel}</span>
                            </div>
                        </div>

                        <ul class="order-items-list">
                            ${itemsHtml}
                        </ul>

                        <div class="order-footer">
                            <span class="order-total">Total: R$ ${parseFloat(order.total).toFixed(2).replace('.', ',')}</span>
                            
                            ${order.status === 'paid' 
                                ? `<a href="#" onclick="alert('Iniciando Download...')" class="btn-download-order">
                                     <i class="fas fa-cloud-download-alt"></i> BAIXAR MATERIAIS
                                   </a>` 
                                : `<button disabled style="opacity:0.5; cursor:not-allowed;" class="btn-download-order">Aguardando Pagamento</button>`
                            }
                        </div>
                    `;
                    container.appendChild(div);
                });

            } catch (error) {
                console.error(error);
                container.innerHTML = '<p style="text-align:center; color:red;">Erro ao carregar pedidos.</p>';
            }
        });