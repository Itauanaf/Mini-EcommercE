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
let cidadeAtual = ""; 

// VARIÁVEIS DE CUPOM
let descontoAtivo = 0; 
let nomeCupomAtivo = "";

const CUPONS_VALIDOS = {
    "EDEN10": 0.10,        
    "PRIMEIRACOMPRA": 0.15, 
    "OFF20": 20.00         
};

const tradutorCores = {
    "Preto": "#000000", "Branco": "#FFFFFF", "Off-White": "#F8F8F2", 
    "Marrom": "#5D4037", "Marinho": "#001F3F", "Areia": "#C2B280", "Aria": "#D2D2D2"
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

// --- 3. CARREGAMENTO DE PRODUTOS ---
async function carregarProdutos() {
    const { data: produtos, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

    const grid = document.getElementById('grid-produtos');
    if (error) { console.error("ERRO SUPABASE:", error.message); return; }

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = "<p class='text-center w-full opacity-50 italic py-20'>Nenhum produto disponível no momento.</p>";
        return;
    }

    grid.innerHTML = produtos.map(p => {
        const estoque = Number(p.estoque) || 0;
        const estaEsgotado = estoque <= 0;
        const produtoJSON = JSON.stringify(p).replace(/'/g, "\\'");
        
        return `
            <div ${estaEsgotado ? '' : `onclick='abrirModalDetalhes(${produtoJSON})'`} 
                 class="flex flex-col h-full group ${estaEsgotado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:scale-95'} bg-white rounded-[2.5rem] p-2 transition-all duration-300">
                <div class="relative overflow-hidden aspect-[3/4] rounded-[2.2rem] bg-slate-50 mb-4">
                    ${estaEsgotado ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-[2px]"><span class="bg-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl text-slate-400">Esgotado</span></div>` : ''}
                    <img src="${p.imagem_url}" class="object-cover w-full h-full transition-transform duration-700 ${estaEsgotado ? '' : 'group-hover:scale-105'}">
                </div>
                <div class="px-3 pb-3">
                    <h3 class="text-[14px] font-light text-slate-700 tracking-tight leading-tight mb-1">${p.nome}</h3>
                    <p class="text-[16px] font-semibold text-slate-900">${estaEsgotado ? '<span class="text-slate-300 italic font-normal text-sm">Indisponível</span>' : `R$ ${p.preco.toFixed(2)}`}</p>
                </div>
            </div>
        `;
    }).join('');
}

// --- 4. MODAL E SELEÇÃO ---
function abrirModalDetalhes(produto) {
    produtoSelecionado = produto;
    tamanhoSelecionado = null;
    corSelecionada = null;
    
    const listaTamanhos = produto.tamanhos ? produto.tamanhos.split(',') : ['P', 'M', 'G', 'GG'];
    const listaCores = produto.cores ? produto.cores.split(',') : ['Única'];
    
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
                                    class="btn-cor w-10 h-10 rounded-full border-2 border-transparent shadow-sm transition-all active:scale-90"></button>
                                <span class="text-[10px] text-slate-400">${nomeCor}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">2. Escolha o Tamanho</p>
                <div class="grid grid-cols-4 gap-3 mb-8">
                    ${listaTamanhos.map(tam => `<button onclick="selecionarTamanho(this, '${tam.trim()}')" class="btn-tamanho h-12 text-sm font-bold border border-slate-100 bg-slate-50 rounded-2xl transition-all">${tam.trim()}</button>`).join('')}
                </div>
                <button id="btn-confirmar-add" disabled onclick="confirmarAdicao()" class="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl transition-all cursor-not-allowed">ADICIONAR À SACOLA</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function selecionarCor(el, cor) {
    corSelecionada = cor;
    document.querySelectorAll('.btn-cor').forEach(b => b.classList.remove('ring-2', 'ring-black', 'ring-offset-2'));
    el.classList.add('ring-2', 'ring-black', 'ring-offset-2');

    const imgModal = document.getElementById('imagem-modal');
    if (imgModal && produtoSelecionado) {
        let linkOriginal = produtoSelecionado.imagem_url.trim().split('?')[0];
        const primeiraCor = produtoSelecionado.cores.split(',')[0].trim().toLowerCase();
        
        if (cor.toLowerCase().trim() === primeiraCor) {
            imgModal.src = linkOriginal;
        } else {
            const pontoIndice = linkOriginal.lastIndexOf('.');
            const baseLink = linkOriginal.substring(0, pontoIndice);
            const extensao = linkOriginal.substring(pontoIndice);
            const sufixo = cor.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            imgModal.src = `${baseLink}-${sufixo}${extensao}`;
        }
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
        cart.push({ id: produtoSelecionado.id, name: produtoSelecionado.nome, price: produtoSelecionado.preco, size: tamanhoSelecionado, color: corSelecionada });
        updateCartUI();
        fecharModal(); 
    }
}

function fecharModal() { document.getElementById('modal-tamanho')?.remove(); }

// --- 5. GESTÃO DA SACOLA (RESOLVE TELA BRANCA) ---
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
            // MENSAGEM DE CARRINHO VAZIO (EVITA TELA BRANCA)
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <i class="bi bi-bag-x text-5xl mb-4"></i>
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em]">Sua sacola está vazia</p>
                    <button onclick="showView('shop-view')" class="mt-6 text-[9px] underline uppercase tracking-widest">Explorar Loja</button>
                </div>
            `;
        } else {
            list.innerHTML = cart.map((item, i) => `
                <div class="flex items-center gap-4 py-4 border-b border-slate-50 animate-in slide-in-from-right-4 duration-300">
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h4 class="font-semibold text-[13px] text-slate-900 tracking-tight uppercase">${item.name}</h4>
                            <button onclick="removeFromCart(${i})" class="text-slate-300 hover:text-black transition-colors"><i class="bi bi-x-lg text-xs"></i></button>
                        </div>
                        <p class="text-slate-400 text-[9px] uppercase tracking-[0.2em] mt-1">${item.color} — TAM ${item.size}</p>
                        <p class="font-bold text-slate-900 text-sm mt-2">R$ ${item.price.toFixed(2)}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const valorDesconto = (descontoAtivo < 1) ? (subtotal * descontoAtivo) : descontoAtivo;
    const subtotalComDesconto = Math.max(0, subtotal - valorDesconto);
    
    if (totalDisplay) totalDisplay.innerText = `R$ ${subtotalComDesconto.toFixed(2)}`;
    atualizarPrecoFinal();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function atualizarPrecoFinal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const valorDesconto = (descontoAtivo < 1) ? (subtotal * descontoAtivo) : descontoAtivo;
    const totalGeral = Math.max(0, subtotal - valorDesconto) + valorFreteAtual;
    const btn = document.getElementById('btn-finalizar');
    if (btn) btn.innerHTML = `FINALIZAR COMPRA • R$ ${totalGeral.toFixed(2)}`;
}

// --- 6. BUSCA CEP E CUPOM ---
async function buscaCEP(cep) {
    const valor = cep.replace(/\D/g, '');
    if (valor.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
            const data = await response.json();
            if (!data.erro) {
                cidadeAtual = `${data.localidade} - ${data.uf}`;
                document.getElementById('rua').value = `${data.logradouro}, ${data.bairro}`;
                document.getElementById('secao-frete').classList.remove('hidden');
                valorFreteAtual = (valor.startsWith('563') || valor.startsWith('489')) ? 10.00 : 35.00;
                document.getElementById('label-frete').innerText = valorFreteAtual === 10 ? "Entrega Local (Petrolina/Juazeiro)" : "Envio Nacional";
                document.getElementById('valor-frete').innerText = `R$ ${valorFreteAtual.toFixed(2)}`;
                atualizarPrecoFinal();
                document.getElementById('numero').focus();
            }
        } catch (e) { console.error("Erro CEP"); }
    }
}

function aplicarCupom() {
    const input = document.getElementById('input-cupom');
    const codigo = input.value.toUpperCase().trim();
    if (CUPONS_VALIDOS[codigo]) {
        nomeCupomAtivo = codigo;
        descontoAtivo = CUPONS_VALIDOS[codigo];
        document.getElementById('cupom-container').classList.add('hidden');
        document.getElementById('cupom-feedback').classList.remove('hidden');
        document.getElementById('texto-cupom-aplicado').innerText = `CUPOM ${codigo} APLICADO`;
        updateCartUI();
    } else {
        alert("Cupom inválido.");
        input.value = "";
    }
}

function removerCupom() {
    descontoAtivo = 0; nomeCupomAtivo = "";
    document.getElementById('cupom-container').classList.remove('hidden');
    document.getElementById('cupom-feedback').classList.add('hidden');
    document.getElementById('input-cupom').value = "";
    updateCartUI();
}

// --- 7. FINALIZAÇÃO E ESTOQUE ---
async function finalizarCompra(event) {
    if (event) event.preventDefault();
    if (cart.length === 0) return alert("Seu carrinho está vazio!");

    const btn = document.getElementById('btn-finalizar');
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const pagamentoInput = document.querySelector('input[name="pagamento"]:checked');

    if (!nome || !numero || !cep || !pagamentoInput) return alert("Preencha todos os dados de entrega e pagamento.");
    const pagamento = pagamentoInput.value;

    if (btn) { btn.innerText = "PROCESSANDO..."; btn.disabled = true; }

    try {
        // BAIXA DE ESTOQUE
        for (const item of cart) {
            const { data: pData } = await supabaseClient.from('produtos').select('estoque').eq('id', item.id).single();
            const novoEstoque = Math.max(0, (pData?.estoque || 0) - 1);
            await supabaseClient.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
        }

        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const valorDesconto = (descontoAtivo < 1) ? (subtotal * descontoAtivo) : descontoAtivo;
        const totalFinal = Math.max(0, subtotal - valorDesconto) + valorFreteAtual;

        const { error } = await supabaseClient.from('pedidos').insert([{ nome, cep, rua, numero, total: totalFinal, pagamento, itens_json: cart }]);
        if (error) throw error;

        let texto = `*NOVO PEDIDO - ÉDEN*\n\n*CLIENTE:* ${nome}\n*CIDADE:* ${cidadeAtual}\n*ENDEREÇO:* ${rua}, nº ${numero}\n\n*ITENS:*\n`;
        cart.forEach(i => { texto += `- ${i.name} (${i.color}/${i.size})\n`; });
        if (descontoAtivo > 0) texto += `\n*CUPOM:* ${nomeCupomAtivo} (-R$ ${valorDesconto.toFixed(2)})`;
        texto += `\n*TOTAL: R$ ${totalFinal.toFixed(2)}*\n*PAGAMENTO:* ${pagamento}`;
        
        window.location.href = `https://wa.me/5587988501105?text=${encodeURIComponent(texto)}`;
        
        cart = []; updateCartUI();
        document.getElementById('order-form').reset();
        removerCupom();
        showView('shop-view');
        carregarProdutos();

    } catch (err) {
        alert("Erro ao processar: " + err.message);
        if (btn) { btn.innerText = "FINALIZAR COMPRA"; btn.disabled = false; }
    }
}

// --- 8. NAVEGAÇÃO E SCROLL ---
function showView(viewId) {
    // 1. Se o objetivo for APENAS abrir o carrinho lateral
    if (viewId === 'cart-view') {
        document.getElementById('cart-view').classList.remove('hidden');
        // REMOVEMOS o scrollTo(0,0) daqui para manter a posição da vitrine
        return; 
    }

    // 2. Se o objetivo for VOLTAR para a loja vindo do carrinho
    if (viewId === 'shop-view') {
        document.getElementById('cart-view').classList.add('hidden');
        // Se a loja já estiver visível no fundo, não precisamos dar scroll nem esconder nada
        if (!document.getElementById('shop-view').classList.contains('hidden')) {
            return;
        }
    }

    // 3. Comportamento para trocas Reais de tela (ex: ir para o Checkout)
    document.querySelectorAll('.view-section').forEach(v => {
        // Não escondemos o shop-view se estivermos apenas sobrepondo o carrinho
        v.classList.add('hidden');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        // Só sobe para o topo se estiver mudando de seção principal (ex: Checkout)
        window.scrollTo(0, 0);
    }
}

function checkout() {
    if (cart.length === 0) return alert("Sua sacola está vazia!");
    showView('checkout-view');
}

carregarProdutos();
updateCartUI(); // Inicializa o estado vazio

window.onscroll = function() {
    const header = document.getElementById('main-header');
    const logo = document.querySelector('.brand-logo');
    if (!header || !logo) return;
    
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        header.style.paddingTop = "10px"; header.style.paddingBottom = "10px";
        logo.style.fontSize = "1.3rem";
    } else {
        header.style.paddingTop = "20px"; header.style.paddingBottom = "20px";
        logo.style.fontSize = "1.8rem";
    }
};