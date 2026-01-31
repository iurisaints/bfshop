const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();

// ==========================================
// CONFIGURAÇÃO MERCADO PAGO
// ==========================================
// Token de teste que você forneceu
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-796531286340245-121718-9ea2052dcbe94cbdfd14605bc34995fd-3074538889', 
    options: { timeout: 5000 } 
});

// Configurações Básicas
app.use(express.json());
app.use(cors());

// Chave Segura
const SECRET_KEY = 'sua_chave_secreta_super_segura'; 

// --- CONFIGURAÇÃO DE UPLOAD ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));
// IMPORTANTE: Serve os arquivos estáticos (HTML/CSS) para não dar erro 404
app.use(express.static(path.join(__dirname, '/')));

// --- BANCO DE DADOS ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      
    password: 'root', // Sua senha
    database: 'brenda_shop'
});

db.connect(err => {
    if (err) console.error('Erro MySQL:', err);
    else console.log('MySQL Conectado!');
});

// --- AUTENTICAÇÃO ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// ==========================================
// ROTAS DE USUÁRIO
// ==========================================
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
        [name, email, hashedPassword], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sucesso!" });
        });
    } catch (e) { res.status(500).json({ error: "Erro interno" }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ error: "Usuário não encontrado" });
        
        const user = results[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ message: "Logado", token, id: user.id, name: user.name, role: user.role });
        } else {
            res.status(400).json({ error: "Senha incorreta" });
        }
    });
});

// ==========================================
// ROTAS DE PRODUTOS
// ==========================================
app.get('/api/products', (req, res) => {
    const { search, category } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    let params = [];
    
    if (category && category !== 'Todas') { sql += " AND category = ?"; params.push(category); }
    if (search) { sql += " AND (title LIKE ? OR description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    
    sql += " ORDER BY id DESC";
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, price, category, description } = req.body;
    let image_url = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : 'https://via.placeholder.com/150';
    
    db.query("INSERT INTO products (title, price, category, description, image_url) VALUES (?, ?, ?, ?, ?)", 
    [title, price, category, description, image_url], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Criado", id: result.insertId });
    });
});

app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, price, category, description } = req.body;
    const { id } = req.params;
    
    let sql, params;
    if (req.file) {
        const image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        sql = "UPDATE products SET title=?, price=?, category=?, description=?, image_url=? WHERE id=?";
        params = [title, price, category, description, image_url, id];
    } else {
        sql = "UPDATE products SET title=?, price=?, category=?, description=? WHERE id=?";
        params = [title, price, category, description, id];
    }
    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Atualizado" });
    });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deletado" });
    });
});

// ==========================================
// ROTAS DE PEDIDOS E CHECKOUT
// ==========================================
app.get('/api/orders', authenticateToken, (req, res) => {
    db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) return res.json([]);

        const promises = orders.map(order => new Promise((resolve, reject) => {
            db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id], (err, items) => {
                if (err) reject(err);
                else { order.items = items; resolve(order); }
            });
        }));

        Promise.all(promises).then(data => res.json(data)).catch(e => res.status(500).json({ error: e }));
    });
});

// --- ROTA DE CHECKOUT (CORRIGIDA - URL ABSOLUTA) ---
// --- ROTA DE CHECKOUT (VERSÃO FINAL DEBUGADA) ---
app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
    const { cartItems } = req.body;
    const user = req.user; 

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Carrinho vazio" });
    }

    try {
        console.log("--> 1. Iniciando processamento do pedido...");

        // 1. Salvar no Banco
        const total = cartItems.reduce((acc, item) => acc + parseFloat(item.price), 0);
        
        // Insere pedido
        const sqlOrder = "INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, 'pending', NOW())";
        const orderId = await new Promise((resolve, reject) => {
            db.query(sqlOrder, [user.id, total], (err, result) => {
                if (err) reject(err); else resolve(result.insertId);
            });
        });

        // Insere itens
        cartItems.forEach(item => {
            db.query("INSERT INTO order_items (order_id, product_id, title, price) VALUES (?, ?, ?, ?)", 
            [orderId, item.id, item.title, item.price]);
        });

        // 2. Definição da URL 
        // O localhost dá problema mesmo, quando fizer o deploy colocar o HTTPS e funciona, teoricamente.
        let currentUrl = process.env.SITE_URL;
        if (!currentUrl || currentUrl.trim() === '') {
            currentUrl = 'http://localhost:3000';
        }

        console.log("--> 2. URL Base definida como:", currentUrl);

        // 3. Criar Preferência MP
        const preference = new Preference(client);
        
        // Montamos o objeto body separadamente para poder dar console.log nele
        const preferenceBody = {
            items: cartItems.map(item => ({
                id: item.id.toString(),
                title: item.title,
                quantity: 1,
                unit_price: Number(item.price),
                currency_id: 'BRL',
                picture_url: item.image_url
            })),
            payer: {
                name: user.name,
                email: 'test_user_123456@test.com' 
            },
            // OBRIGATÓRIO: back_urls (PLURAL) com urls completas
            back_urls: {
                success: `${currentUrl}/sucesso.html`,
                failure: `${currentUrl}/index.html`,
                pending: `${currentUrl}/meus-pedidos.html`
            },
            auto_return: "approved",
            external_reference: orderId.toString(),
            statement_descriptor: "LOJA PROFS"
        };

        // LOG DE DEBUG: Veja isso no terminal se der erro
        console.log("--> 3. Enviando este corpo para o MP:", JSON.stringify(preferenceBody.back_urls, null, 2));

        const result = await preference.create({ body: preferenceBody });
        
        console.log("--> 4. Link Gerado:", result.init_point);
        res.json({ url: result.init_point });

    } catch (error) {
        console.error("ERRO MP CRÍTICO:", error);
        // Tenta pegar a mensagem de erro detalhada do Mercado Pago se existir
        const errorMsg = error.message || JSON.stringify(error);
        res.status(500).json({ error: "Erro no Mercado Pago: " + errorMsg });
    }
});

app.listen(3000, () => {
    console.log('SERVIDOR RODANDO CORRETAMENTE NA PORTA 3000');
});