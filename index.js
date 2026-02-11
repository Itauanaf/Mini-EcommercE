const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let cart = [];
let produtoSelecionado = null; 
let tamanhoSelecionado = null;

// --- CARREGAR PRODUTOS ---
async function carregarProdutos() {
    const { data: produtos, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

    const grid = document.getElementById('grid-produtos');
    if (error || !grid) return;

    grid.innerHTML = produtos.map(p => `
        <div onclick="abrirModalDetalhes(${JSON.stringify(p).replace(/"/g, '&quot;')})" 
             class="flex flex-col h-full group cursor-pointer bg-white rounded-[2.5rem] p-2 transition-all duration-300 active:scale-95">
            <div class="relative overflow-hidden aspect-[3/4] rounded-[2.2rem] bg-slate-50 mb-4">
                <img src="${p.imagem_url}" class="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105">
            </div>
            <div class="px-3 pb-3">
                <h3 class="text-[14px] font-light text-slate-700 tracking-tight leading-tight mb-1">${p.nome}</h3>
                <p class="text-[16px] font-semibold text-slate-900">R$ ${p.preco.toFixed(2)}</p>
            </div>
        </div>
    `).join('');
}

// --- MODAL DE DETALHES ---
function abrirModalDetalhes(produto) {
    produtoSelecionado = produto;
    tamanhoSelecionado = null;
    const listaTamanhos = produto.tamanhos ? produto.tamanhos.split(',') : ['P', 'M', 'G', 'GG'];
    
    const modalHTML = `
        <div id="modal-tamanho" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div class="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
                
                <div class="flex justify-between items-start mb-6">
                    <div class="flex gap-4">
                        <img src="${produto.imagem_url}" class="w-16 h-20 object-cover rounded-xl shadow-sm">
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${produto.nome}</h2>
                            <p class="text-slate-500 font-medium text-sm">R$ ${produto.preco.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onclick="fecharModal()" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>
                
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4 text-center">Escolha o Tamanho</p>
                <div class="grid grid-cols-4 gap-3 mb-8">
                    ${listaTamanhos.map(tam => `
                        <button onclick="selecionarTamanho(this, '${tam.trim()}')" 
                            class="btn-tamanho h-12 text-sm font-bold border border-slate-100 bg-slate-50 rounded-2xl transition-all">
                            ${tam.trim()}
                        </button>
                    `).join('')}
                </div>
                
                <button id="btn-confirmar-add" disabled
                    onclick="confirmarAdicao()" 
                    class="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl transition-all cursor-not-allowed">
                    ADICIONAR À SACOLA
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- LÓGICA DE SELEÇÃO ---
function selecionarTamanho(elemento, tamanho) {
    tamanhoSelecionado = tamanho;
    document.querySelectorAll('.btn-tamanho').forEach(btn => {
        btn.classList.remove('bg-black', 'text-white', 'border-black');
        btn.classList.add('bg-slate-50', 'text-slate-900');
    });
    elemento.classList.remove('bg-slate-50', 'text-slate-900');
    elemento.classList.add('bg-black', 'text-white', 'border-black');

    const btnAdd = document.getElementById('btn-confirmar-add');
    btnAdd.disabled = false;
    btnAdd.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
    btnAdd.classList.add('bg-black', 'text-white', 'shadow-lg', 'active:scale-95');
}

function confirmarAdicao() {
    if (produtoSelecionado && tamanhoSelecionado) {
        addToCart(produtoSelecionado.nome, produtoSelecionado.preco, tamanhoSelecionado);
        fecharModal(); 
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-tamanho');
    if (modal) modal.remove();
}

// --- FUNÇÕES DO CARRINHO ---
function addToCart(name, price, size) {
    cart.push({ name, price, size });
    updateCartUI();
    if (navigator.vibrate) navigator.vibrate(40);
}

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
            list.innerHTML = `<p class="text-center opacity-30 mt-10 text-sm">Sua sacola está vazia</p>`;
        } else {
            list.innerHTML = cart.map((item, i) => `
                <div class="flex items-center gap-4 border-b border-slate-50 pb-4">
                    <div class="flex-1">
                        <h4 class="font-medium text-[13px] text-slate-800">${item.name} <span class="text-slate-400 font-normal">(${item.size})</span></h4>
                        <p class="font-bold text-slate-900 text-sm">R$ ${item.price.toFixed(2)}</p>
                    </div>
                    <button onclick="removeFromCart(${i})" class="text-red-300 hover:text-red-500 transition-colors p-2">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (totalDisplay) totalDisplay.innerText = `R$ ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// --- FINALIZAR COMPRA (VERSÃO LIMPA PARA NOVO BANCO) ---
async function finalizarCompra() {
    const btn = document.getElementById('btn-finalizar');
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;

    if (!nome || !numero || !cep) return alert("Preencha todos os dados de entrega.");
    if (btn) { btn.innerText = "PROCESSANDO..."; btn.disabled = true; }

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    // Salvando no Supabase com as colunas separadas
    const { error } = await supabaseClient.from('pedidos').insert([{
        nome, 
        cep, 
        rua, 
        numero, 
        total, 
        itens_json: cart // Agora enviamos o array direto (JSONB)
    }]);

    if (error) {
        alert("Erro ao salvar pedido: " + error.message);
        if (btn) { btn.innerText = "FINALIZAR COMPRA"; btn.disabled = false; }
    } else {
        // Preparar mensagem para WhatsApp
        let mensagem = `*NOVO PEDIDO - BLUSA.MINI*%0A%0A*Cliente:* ${nome}%0A*Endereço:* ${rua}, nº ${numero}%0A*CEP:* ${cep}%0A%0A*ITENS:*%0A`;
        cart.forEach(item => { mensagem += `- ${item.name} (${item.size}): R$ ${item.price.toFixed(2)}%0A`; });
        mensagem += `%0A*TOTAL: R$ ${total.toFixed(2)}*`;
        
        window.open(`https://wa.me/87988501105?text=${mensagem}`, '_blank');
        
        // Limpeza e retorno
        cart = []; 
        updateCartUI(); 
        document.getElementById('order-form').reset();
        showView('shop-view');
        if (btn) { btn.innerText = "FINALIZAR COMPRA"; btn.disabled = false; }
    }
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

carregarProdutos();