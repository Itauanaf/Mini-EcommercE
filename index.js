const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let cart = [];

// --- BUSCAR PRODUTOS DO BANCO ---
async function carregarProdutos() {
    const { data: produtos, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

    const grid = document.getElementById('grid-produtos');
    if (error) {
        grid.innerHTML = `<p class="col-span-2 text-red-500">Erro ao carregar catálogo.</p>`;
        return;
    }

    if (produtos.length === 0) {
        grid.innerHTML = `<p class="col-span-2 text-slate-400">Nenhum produto cadastrado.</p>`;
        return;
    }

    grid.innerHTML = produtos.map(p => `
        <div class="group">
            <div class="relative overflow-hidden aspect-[3/4] bg-slate-100 rounded-2xl mb-4">
                <img src="${p.imagem_url}" class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110">
                <button onclick="addToCart('${p.nome}', ${p.preco})" class="absolute bottom-3 right-3 bg-white w-10 h-10 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform">
                    <i class="bi bi-plus text-2xl"></i>
                </button>
            </div>
            <h3 class="text-sm font-medium">${p.nome}</h3>
            <p class="text-slate-500 text-sm">R$ ${p.preco.toFixed(2)}</p>
        </div>
    `).join('');
}

carregarProdutos();

// --- FUNÇÕES DO CARRINHO ---
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
    if (navigator.vibrate) navigator.vibrate(40);
}

// FUNÇÃO ATUALIZADA: Incluído botão de remover
function updateCartUI() {
    const list = document.getElementById('cart-items-list');
    const badge = document.getElementById('cart-count');
    const totalDisplay = document.getElementById('cart-total-value');
    
    if (badge) {
        badge.innerText = cart.length;
        badge.classList.toggle('hidden', cart.length === 0);
    }

    if (list) {
        if (cart.length === 0) {
            list.innerHTML = `<p class="text-center opacity-30 mt-10">Sua sacola está vazia</p>`;
        } else {
            // Adicionado o parâmetro index (i) e o botão de lixo
            list.innerHTML = cart.map((item, i) => `
                <div class="flex items-center gap-4 border-b border-slate-50 pb-4">
                    <div class="flex-1">
                        <h4 class="font-medium text-sm">${item.name}</h4>
                        <p class="font-bold">R$ ${item.price.toFixed(2)}</p>
                    </div>
                    <button onclick="removeFromCart(${i})" class="text-red-400 p-2">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (totalDisplay) totalDisplay.innerText = `R$ ${total.toFixed(2)}`;
}

// NOVA FUNÇÃO: Remover item específico
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// --- UTILITÁRIOS ---
async function buscaCEP(cep) {
    const valor = cep.replace(/\D/g, '');
    if (valor.length === 8) {
        const response = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        const data = await response.json();
        if (!data.erro) {
            document.getElementById('rua').value = `${data.logradouro}, ${data.bairro}`;
            document.getElementById('numero').focus();
        }
    }
}

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function checkout() {
    if (cart.length === 0) return alert("Sua sacola está vazia!");
    showView('checkout-view');
}

// --- FINALIZAR ---
async function finalizarCompra() {
    const btn = document.getElementById('btn-finalizar');
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;

    if (!nome || !numero || !cep) return alert("Preencha todos os dados de entrega.");

    if (btn) {
        btn.innerText = "PROCESSANDO...";
        btn.disabled = true;
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    const pedido = {
        nome: nome,
        cep: cep,
        rua: rua,
        numero: numero,
        total: total,
        itens_json: JSON.stringify(cart)
    };

    const { error } = await supabaseClient.from('pedidos').insert([pedido]);

    if (error) {
        alert("Erro: " + error.message);
        if (btn) {
            btn.innerText = "FINALIZAR COMPRA";
            btn.disabled = false;
        }
    } else {
        let mensagem = `*NOVO PEDIDO - BLUSA.MINI*%0A%0A`;
        mensagem += `*Cliente:* ${nome}%0A`;
        mensagem += `*Endereço:* ${rua}, nº ${numero}%0A`;
        mensagem += `*CEP:* ${cep}%0A%0A`;
        mensagem += `*ITENS:*%0A`;
        
        cart.forEach(item => {
            mensagem += `- ${item.name}: R$ ${item.price.toFixed(2)}%0A`;
        });
        
        mensagem += `%0A*TOTAL: R$ ${total.toFixed(2)}*`;

        alert("🎉 Pedido confirmado!");
        window.open(`https://wa.me/87988501105?text=${mensagem}`, '_blank');
        
        cart = [];
        updateCartUI();
        document.getElementById('order-form').reset();
        showView('shop-view');
        
        if (btn) {
            btn.innerText = "FINALIZAR COMPRA";
            btn.disabled = false;
        }
    }
}