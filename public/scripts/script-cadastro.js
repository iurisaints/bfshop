async function handleRegister(e) {
            e.preventDefault();
            
            const btn = document.getElementById('btn-register');
            const originalText = btn.innerText;
            
            // Coleta dados
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;

            // Validação local
            if (password !== confirmPassword) {
                alert("As senhas não coincidem!");
                return;
            }

            // UI de carregamento
            btn.innerText = "CRIANDO CONTA...";
            btn.disabled = true;
            btn.style.opacity = "0.7";

            try {
                // Envia para o Backend (API_URL vem do app.js)
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    alert("Conta criada com sucesso! Faça login para continuar.");
                    window.location.href = 'login.html';
                } else {
                    alert(data.error || "Erro ao criar conta.");
                }

            } catch (error) {
                console.error(error);
                alert("Erro de conexão com o servidor.");
            } finally {
                // Restaura botão
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = "1";
            }
        }