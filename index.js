// 1. CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

// 2. VARIÁVEIS GLOBAIS
let cart = [];
let produtoSelecionado = null; 
let tamanhoSelecionado = null;
let corSelecionada = null;
let valorFreteAtual = 0;

const tradutorCores = {
    "Preto": "#000000",
    "Branco": "#FFFFFF",
    "Off-White": "#F8F8F2", 
    "Marrom": "#5D4037",
    "Marinho": "#001F3F",
    "Areia": "#C2B280",
    "Aria": "#D2D2D2"
};

// --- LÓGICA DA BARRA DE ANÚNCIOS ---
const anuncios = [
    "FRETE FIXO PARA PETROLINA & JUAZEIRO",
    "PARCELE EM ATÉ 3X SEM JUROS",
    "PEÇAS EXCLUSIVAS & LIMITADAS",
    "CUPOM 'EDEN10' NA PRIMEIRA COMPRA"
];

let anuncioAtual = 0;
function rotacionarAnuncios() {
    const elementoTexto = document.getElementById('texto-anuncio');
    if (!elementoTexto) return;
    elementoTexto.style.opacity = '0';
    elementoTexto.style.transform = 'translateY(5px)';
    setTimeout(() => {
        anuncioAtual = (anuncioAtual + 1) % anuncios.length;
        elementoTexto.innerText = anuncios[anuncioAtual];
        elementoTexto.style.opacity = '1';
        elementoTexto.style.transform = 'translateY(0px)';
    }, 700);
}
setInterval(rotacionarAnuncios, 5000);

// --- CARREGAMENTO DE PRODUTOS ---
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
    corSelecionada = null;
    
    const listaTamanhos = produto.tamanhos ? produto.tamanhos.split(',') : ['P', 'M', 'G', 'GG'];
    const listaCores = produto.Cores ? produto.Cores.split(',') : (produto.cores ? produto.cores.split(',') : ['Única']);
    
    const modalHTML = `
        <div id="modal-tamanho" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div class="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex gap-4">
                        <img id="imagem-modal" src="${produto.imagem_url}" class="w-16 h-20 object-cover rounded-xl shadow-sm transition-all duration-500">
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${produto.nome}</h2>
                            <p class="text-slate-500 font-medium text-sm">R$ ${produto.preco.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onclick="fecharModal()" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>

                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">1. Escolha a Cor</p>
                <div class="flex flex-wrap justify-center gap-4 mb-6">
                    ${listaCores.map(cor => {
                        const nomeCor = cor.trim();
                        const hex = tradutorCores[nomeCor] || "#cbd5e1"; 
                        return `
                            <div class="flex flex-col items-center gap-1">
                                <button onclick="selecionarCor(this, '${nomeCor}')" 
                                    style="background-color: ${hex}; ${nomeCor === 'Branco' ? 'border: 1px solid #eee' : ''}"
                                    class="btn-cor w-10 h-10 rounded-full border-2 border-transparent shadow-sm transition-all active:scale-90">
                                </button>
                                <span class="text-[10px] text-slate-400">${nomeCor}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">2. Escolha o Tamanho</p>
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

// --- SELEÇÃO DE COR COM TROCA DE IMAGEM (AJUSTADO) ---
function selecionarCor(elemento, cor) {
    corSelecionada = cor;
    
    document.querySelectorAll('.btn-cor').forEach(btn => {
        btn.classList.remove('border-black', 'ring-2', 'ring-offset-2', 'ring-slate-400');
    });
    elemento.classList.add('border-black', 'ring-2', 'ring-offset-2', 'ring-slate-400');

    const imgModal = document.getElementById('imagem-modal');
    
    if (imgModal && produtoSelecionado) {
        // Normalização para evitar bugs com acentos ou espaços
        const nomeFormatado = produtoSelecionado.nome.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '-');
        const corFormatada = cor.toLowerCase().trim().replace(/\s+/g, '-');
        
        const urlFinal = `${SB_URL}/storage/v1/object/public/produtos/${nomeFormatado}-${corFormatada}.png`;
        
        imgModal.style.opacity = '0.3';
        const tempImg = new Image();
        tempImg.src = urlFinal;
        
        tempImg.onload = () => {
            imgModal.src = urlFinal;
            imgModal.style.opacity = '1';
        };
        
        tempImg.onerror = () => {
            imgModal.src = produtoSelecionado.imagem_url;
            imgModal.style.opacity = '1';
        };
    }
    validarSelecao();
}

function selecionarTamanho(elemento, tamanho) {
    tamanhoSelecionado = tamanho;
    document.querySelectorAll('.btn-tamanho').forEach(btn => {
        btn.classList.remove('bg-black', 'text-white', 'border-black');
        btn.classList.add('bg-slate-50', 'text-slate-900');
    });
    elemento.classList.remove('bg-slate-50', 'text-slate-900');
    elemento.classList.add('bg-black', 'text-white', 'border-black');
    validarSelecao();
}

function validarSelecao() {
    const btnAdd = document.getElementById('btn-confirmar-add');
    if (tamanhoSelecionado && corSelecionada) {
        btnAdd.disabled = false;
        btnAdd.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        btnAdd.classList.add('bg-black', 'text-white', 'shadow-lg', 'active:scale-95');
    }
}

function confirmarAdicao() {
    if (produtoSelecionado && tamanhoSelecionado && corSelecionada) {
        addToCart(produtoSelecionado.nome, produtoSelecionado.preco, tamanhoSelecionado, corSelecionada);
        fecharModal(); 
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-tamanho');
    if (modal) modal.remove();
}

// --- GESTÃO DA SACOLA ---
function addToCart(name, price, size, color) {
    cart.push({ name, price, size, color });
    updateCartUI();
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
            list.innerHTML = `<p class="text-center opacity-30 mt-10 text-sm italic">Sua sacola está vazia</p>`;
        } else {
            list.innerHTML = cart.map((item, i) => `
                <div class="flex items-center gap-4 border-b border-slate-50 pb-4">
                    <div class="flex-1">
                        <h4 class="font-medium text-[13px] text-slate-800">${item.name}</h4>
                        <p class="text-slate-400 text-[11px] uppercase tracking-wider">${item.color} / ${item.size}</p>
                        <p class="font-bold text-slate-900 text-sm">R$ ${item.price.toFixed(2)}</p>
                    </div>
                    <button onclick="removeFromCart(${i})" class="text-slate-300 hover:text-red-500 transition-colors p-2">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    if (totalDisplay) totalDisplay.innerText = `R$ ${subtotal.toFixed(2)}`;
    atualizarPrecoFinal();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// --- CÁLCULO DE FRETE E BOTÃO FINALIZAR ---
function atualizarPrecoFinal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const totalGeral = subtotal + valorFreteAtual;
    const btn = document.getElementById('btn-finalizar');
    if (btn) {
        btn.innerHTML = `FINALIZAR COMPRA • R$ ${totalGeral.toFixed(2)}`;
    }
}

async function buscaCEP(cep) {
    const valor = cep.replace(/\D/g, '');
    const secaoFrete = document.getElementById('secao-frete');
    const labelFrete = document.getElementById('label-frete');
    const valorFreteTxt = document.getElementById('valor-frete');
    const detalheEntrega = document.getElementById('detalhe-entrega');

    if (valor.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                document.getElementById('rua').value = `${data.logradouro}, ${data.bairro}`;
                secaoFrete.classList.remove('hidden');

                if (valor.startsWith('563') || valor.startsWith('489')) {
                    valorFreteAtual = 10.00; 
                    labelFrete.innerText = "Entrega Local (Motoboy)";
                    detalheEntrega.innerText = "Petrolina/Juazeiro: Entrega em até 24h úteis.";
                } else {
                    valorFreteAtual = 35.00;
                    labelFrete.innerText = "Envio Nacional";
                    detalheEntrega.innerText = "Via Correios. Prazo de 5 a 10 dias úteis.";
                }

                valorFreteTxt.innerText = `R$ ${valorFreteAtual.toFixed(2)}`;
                atualizarPrecoFinal();
                document.getElementById('numero').focus();
            }
        } catch (e) { console.error("Erro CEP"); }
    }
}

// --- FINALIZAÇÃO ---
async function finalizarCompra(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btn-finalizar');
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;

    if (!nome || !numero || !cep) return alert("Preencha todos os dados de entrega.");
    if (btn) { btn.innerText = "PROCESSANDO..."; btn.disabled = true; }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const totalFinal = subtotal + valorFreteAtual;

    const { error } = await supabaseClient.from('pedidos').insert([{
        nome, cep, rua, numero, total: totalFinal, pagamento, itens_json: cart 
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
        if (btn) { btn.innerText = "FINALIZAR COMPRA"; btn.disabled = false; }
    } else {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000000', '#ffffff'] });
        }

        let texto = `*NOVO PEDIDO - ÉDEN.WEAR*\n\n`;
        texto += `*Cliente:* ${nome}\n`;
        texto += `*Endereço:* ${rua}, nº ${numero}\n`;
        texto += `*Pagamento:* ${pagamento}\n\n`;
        texto += `*ITENS:*\n`;
        cart.forEach(item => { texto += `- ${item.name} (${item.color} | ${item.size})\n`; });
        texto += `\n*Subtotal:* R$ ${subtotal.toFixed(2)}`;
        texto += `\n*Frete:* R$ ${valorFreteAtual.toFixed(2)}`;
        texto += `\n*TOTAL: R$ ${totalFinal.toFixed(2)}*`;
        
        setTimeout(() => {
            window.location.href = `https://wa.me/5587988501105?text=${encodeURIComponent(texto)}`;
            cart = []; updateCartUI(); 
            document.getElementById('order-form').reset();
            showView('shop-view');
            if (btn) { btn.innerText = "FINALIZAR COMPRA"; btn.disabled = false; }
        }, 1500);
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