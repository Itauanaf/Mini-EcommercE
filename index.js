// =============================================
// 1. CONFIGURAÇÃO SUPABASE
// =============================================
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

// =============================================
// 2. VARIÁVEIS GLOBAIS
// =============================================
let cart = [];
let produtoSelecionado = null;
let tamanhoSelecionado = null;
let corSelecionada = null;
let valorFreteAtual = 0;
let cidadeAtual = '';
let descontoAtivo = 0;
let nomeCupomAtivo = '';

const CUPONS_VALIDOS = {
    'EDEN10': 0.10,
    'PRIMEIRACOMPRA': 0.15,
    'OFF20': 20.00
};

const tradutorCores = {
    'Preto': '#000000', 'Branco': '#FFFFFF', 'Off-White': '#F8F8F2',
    'Marrom': '#5D4037', 'Marinho': '#001F3F', 'Areia': '#C2B280', 'Aria': '#D2D2D2'
};

// =============================================
// 3. PERSISTÊNCIA (localStorage)
// =============================================
function salvarCarrinho() {
    try { localStorage.setItem('eden_cart', JSON.stringify(cart)); } catch (e) {}
}
function carregarCarrinho() {
    try { const s = localStorage.getItem('eden_cart'); if (s) cart = JSON.parse(s); } catch (e) { cart = []; }
}

// =============================================
// 4. TOAST
// =============================================
function showToast(mensagem, tipo = 'success') {
    const old = document.getElementById('eden-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'eden-toast';
    t.style.cssText = `position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(16px);z-index:9999;display:flex;align-items:center;gap:10px;padding:1rem 1.5rem;border-radius:1rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 8px 32px rgba(0,0,0,0.18);${tipo === 'success' ? 'background:#000;color:#fff;' : 'background:#ef4444;color:#fff;'}`;
    t.innerHTML = tipo === 'success' ? `<i class="bi bi-check-circle-fill"></i> ${mensagem}` : `<i class="bi bi-x-circle-fill"></i> ${mensagem}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(16px)'; setTimeout(() => t.remove(), 400); }, 2500);
}

// =============================================
// 5. BARRA DE ANÚNCIOS
// =============================================
const anuncios = [
    'FRETE FIXO PARA PETROLINA & JUAZEIRO',
    'PARCELE EM ATÉ 3X SEM JUROS',
    'PEÇAS EXCLUSIVAS & LIMITADAS',
    "CUPOM 'EDEN10' NA PRIMEIRA COMPRA"
];
let anuncioAtual = 0;
function rotacionarAnuncios() {
    const el = document.getElementById('texto-anuncio');
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(5px)';
    setTimeout(() => {
        anuncioAtual = (anuncioAtual + 1) % anuncios.length;
        el.innerText = anuncios[anuncioAtual];
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    }, 700);
}
setInterval(rotacionarAnuncios, 5000);

// =============================================
// 6. PRODUTOS
// =============================================
async function carregarProdutos() {
    const { data: produtos, error } = await supabaseClient
        .from('produtos').select('*').order('created_at', { ascending: false });

    const grid = document.getElementById('grid-produtos');
    if (error || !produtos || produtos.length === 0) {
        grid.innerHTML = "<p class='col-span-full text-center py-10 text-slate-400 italic'>Nenhum produto disponível no momento.</p>";
        return;
    }

    grid.innerHTML = produtos.map(p => {
        const esgotado = Number(p.estoque) <= 0;
        const json = JSON.stringify(p).replace(/'/g, "\\'");
        return `
        <div ${esgotado ? '' : `onclick='abrirModalDetalhes(${json})'`}
             class="flex flex-col h-full group ${esgotado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:scale-95'} bg-white rounded-[2.5rem] p-2 transition-all duration-300">
            <div class="relative overflow-hidden aspect-[3/4] rounded-[2.2rem] bg-slate-100 mb-4 skeleton-box">
                ${esgotado ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-[2px]"><span class="bg-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl text-slate-400">Esgotado</span></div>` : ''}
                <img src="${p.imagem_url}"
                     onload="this.parentElement.classList.remove('skeleton-box')"
                     onerror="this.parentElement.classList.remove('skeleton-box')"
                     class="object-cover w-full h-full transition-transform duration-700 ${esgotado ? '' : 'group-hover:scale-105'}">
            </div>
            <div class="px-3 pb-3">
                <h3 class="text-[14px] font-light text-slate-700 tracking-tight leading-tight mb-1">${p.nome}</h3>
                <p class="text-[16px] font-semibold text-slate-900">${esgotado ? '<span class="text-slate-300 italic font-normal text-sm">Indisponível</span>' : `R$ ${p.preco.toFixed(2)}`}</p>
            </div>
        </div>`;
    }).join('');
}

// =============================================
// 7. MODAL DE DETALHES
// =============================================
function abrirModalDetalhes(produto) {
    produtoSelecionado = produto;
    tamanhoSelecionado = null;
    corSelecionada = null;

    const tamanhos = produto.tamanhos ? produto.tamanhos.split(',') : ['P', 'M', 'G', 'GG'];
    const cores = produto.cores ? produto.cores.split(',') : ['Única'];

    document.body.insertAdjacentHTML('beforeend', `
        <div id="modal-tamanho" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay" onclick="fecharModalFora(event)">
            <div class="modal-sheet bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex gap-4">
                        <img id="imagem-modal" src="${produto.imagem_url}" onerror="this.src='${produto.imagem_url}'" class="w-16 h-20 object-cover rounded-xl shadow-sm transition-all duration-500">
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${produto.nome}</h2>
                            <p class="text-slate-500 font-medium text-sm">R$ ${produto.preco.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onclick="fecharModal()" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">1. Escolha a Cor</p>
                <div class="flex flex-wrap justify-center gap-4 mb-6">
                    ${cores.map(cor => {
                        const nome = cor.trim();
                        const hex = tradutorCores[nome] || '#cbd5e1';
                        return `<div class="flex flex-col items-center gap-1">
                            <button onclick="selecionarCor(this,'${nome}')" style="background-color:${hex};${nome==='Branco'?'border:1px solid #eee':''}" class="btn-cor w-10 h-10 rounded-full border-2 border-transparent shadow-sm transition-all active:scale-90"></button>
                            <span class="text-[10px] text-slate-400">${nome}</span>
                        </div>`;
                    }).join('')}
                </div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">2. Escolha o Tamanho</p>
                <div class="grid grid-cols-4 gap-3 mb-8">
                    ${tamanhos.map(t => `<button onclick="selecionarTamanho(this,'${t.trim()}')" class="btn-tamanho h-12 text-sm font-bold border border-slate-100 bg-slate-50 rounded-2xl transition-all">${t.trim()}</button>`).join('')}
                </div>
                <button id="btn-confirmar-add" disabled onclick="confirmarAdicao()" class="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl transition-all cursor-not-allowed">ADICIONAR À SACOLA</button>
            </div>
        </div>`);
    document.body.style.overflow = 'hidden';
}

function fecharModalFora(e) { if (e.target.id === 'modal-tamanho') fecharModal(); }

function selecionarCor(el, cor) {
    corSelecionada = cor;
    document.querySelectorAll('.btn-cor').forEach(b => b.classList.remove('ring-2', 'ring-black', 'ring-offset-2'));
    el.classList.add('ring-2', 'ring-black', 'ring-offset-2');
    const img = document.getElementById('imagem-modal');
    if (img && produtoSelecionado) {
        const original = produtoSelecionado.imagem_url.trim().split('?')[0];
        const primeiraCor = produtoSelecionado.cores.split(',')[0].trim().toLowerCase();
        if (cor.toLowerCase().trim() === primeiraCor) {
            img.src = original;
        } else {
            const idx = original.lastIndexOf('.');
            const base = original.substring(0, idx);
            const ext = original.substring(idx);
            const sufixo = cor.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
            img.onerror = () => { img.src = original; img.onerror = null; };
            img.src = `${base}-${sufixo}${ext}`;
        }
    }
    validarSelecao();
}

function selecionarTamanho(el, tam) {
    tamanhoSelecionado = tam;
    document.querySelectorAll('.btn-tamanho').forEach(b => { b.classList.remove('bg-black', 'text-white', 'border-black'); b.classList.add('bg-slate-50', 'text-slate-900'); });
    el.classList.remove('bg-slate-50', 'text-slate-900');
    el.classList.add('bg-black', 'text-white', 'border-black');
    validarSelecao();
}

function validarSelecao() {
    const btn = document.getElementById('btn-confirmar-add');
    if (tamanhoSelecionado && corSelecionada) {
        btn.disabled = false;
        btn.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        btn.classList.add('bg-black', 'text-white', 'shadow-lg', 'active:scale-95');
    }
}

function confirmarAdicao() {
    if (!produtoSelecionado || !tamanhoSelecionado || !corSelecionada) return;
    cart.push({ id: produtoSelecionado.id, name: produtoSelecionado.nome, price: produtoSelecionado.preco, size: tamanhoSelecionado, color: corSelecionada });
    salvarCarrinho();
    updateCartUI();
    fecharModal();
    showToast('Adicionado à sacola');
}

function fecharModal() {
    const m = document.getElementById('modal-tamanho');
    if (!m) return;
    m.style.opacity = '0';
    setTimeout(() => m.remove(), 300);
    document.body.style.overflow = '';
}

// =============================================
// 8. CARRINHO UI
// =============================================
function updateCartUI() {
    const list = document.getElementById('cart-items-list');
    const badge = document.getElementById('cart-count');
    const total = document.getElementById('cart-total-value');

    // Badge
    if (badge) {
        if (cart.length === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
            badge.innerText = cart.length;
            badge.style.transform = 'scale(1.3)';
            setTimeout(() => badge.style.transform = 'scale(1)', 200);
        }
    }

    // Lista
    if (list) {
        if (cart.length === 0) {
            list.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 0;text-align:center;opacity:0.4;">
                    <i class="bi bi-bag-x" style="font-size:3rem;margin-bottom:1rem;"></i>
                    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3em;">Sua sacola está vazia</p>
                    <button onclick="showView('shop-view')" style="margin-top:1.5rem;font-size:9px;text-decoration:underline;text-transform:uppercase;letter-spacing:0.2em;background:none;border:none;cursor:pointer;">Explorar Loja</button>
                </div>`;
        } else {
            list.innerHTML = cart.map((item, i) => `
                <div class="cart-item-enter" style="display:flex;align-items:center;gap:1rem;padding:1rem 0;border-bottom:1px solid #f8fafc;">
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <h4 style="font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:-0.01em;">${item.name}</h4>
                            <button onclick="removeFromCart(${i})" style="color:#cbd5e1;background:none;border:none;cursor:pointer;font-size:12px;padding:0 0 0 8px;" onmouseover="this.style.color='#000'" onmouseout="this.style.color='#cbd5e1'">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <p style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:0.2em;margin-top:4px;">${item.color} — TAM ${item.size}</p>
                        <p style="font-weight:700;font-size:14px;margin-top:8px;">R$ ${item.price.toFixed(2)}</p>
                    </div>
                </div>`).join('');
        }
    }

    // Total
    const subtotal = cart.reduce((s, i) => s + i.price, 0);
    const desconto = descontoAtivo < 1 ? subtotal * descontoAtivo : descontoAtivo;
    const comDesconto = Math.max(0, subtotal - desconto);
    if (total) total.innerText = `R$ ${comDesconto.toFixed(2)}`;

    atualizarPrecoFinal();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    salvarCarrinho();
    updateCartUI();
}

function atualizarPrecoFinal() {
    const subtotal = cart.reduce((s, i) => s + i.price, 0);
    const desconto = descontoAtivo < 1 ? subtotal * descontoAtivo : descontoAtivo;
    const comDesconto = Math.max(0, subtotal - desconto);
    const pagInput = document.querySelector('input[name="pagamento"]:checked');
    const descontoPIX = pagInput && pagInput.value === 'PIX' ? comDesconto * 0.10 : 0;
    const total = Math.max(0, comDesconto - descontoPIX) + valorFreteAtual;

    const btn = document.getElementById('btn-finalizar');
    if (btn) btn.innerText = `FINALIZAR COMPRA • R$ ${total.toFixed(2)}`;

    const resumo = document.getElementById('resumo-valores');
    if (resumo) {
        let html = `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span></div>`;
        if (desconto > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#16a34a;"><span>Cupom (${nomeCupomAtivo})</span><span>- R$ ${desconto.toFixed(2)}</span></div>`;
        if (descontoPIX > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#16a34a;"><span>Desconto PIX (10%)</span><span>- R$ ${descontoPIX.toFixed(2)}</span></div>`;
        if (valorFreteAtual > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;"><span>Frete</span><span>R$ ${valorFreteAtual.toFixed(2)}</span></div>`;
        resumo.innerHTML = html;
    }
}

document.addEventListener('change', e => { if (e.target.name === 'pagamento') atualizarPrecoFinal(); });

// =============================================
// 9. CEP E CUPOM
// =============================================
function formatarCEP(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    input.value = v;
}

async function buscaCEP(cep) {
    const v = cep.replace(/\D/g, '');
    if (v.length !== 8) return;
    try {
        const r = await fetch(`https://viacep.com.br/ws/${v}/json/`);
        const d = await r.json();
        if (d.erro) { showToast('CEP não encontrado', 'error'); return; }
        cidadeAtual = `${d.localidade} - ${d.uf}`;
        document.getElementById('rua').value = `${d.logradouro}, ${d.bairro}`;
        const frete = document.getElementById('secao-frete');
        frete.style.display = 'flex';
        valorFreteAtual = (v.startsWith('563') || v.startsWith('489')) ? 10.00 : 35.00;
        document.getElementById('label-frete').innerText = valorFreteAtual === 10 ? 'Entrega Local (Petrolina/Juazeiro)' : 'Envio Nacional';
        document.getElementById('valor-frete').innerText = `R$ ${valorFreteAtual.toFixed(2)}`;
        atualizarPrecoFinal();
        document.getElementById('numero').focus();
    } catch (e) { showToast('Erro ao buscar CEP', 'error'); }
}

function aplicarCupom() {
    const input = document.getElementById('input-cupom');
    const codigo = input.value.toUpperCase().trim();
    if (CUPONS_VALIDOS[codigo]) {
        nomeCupomAtivo = codigo;
        descontoAtivo = CUPONS_VALIDOS[codigo];
        document.getElementById('cupom-container').style.display = 'none';
        document.getElementById('cupom-feedback').style.display = 'flex';
        document.getElementById('texto-cupom-aplicado').innerText = `CUPOM ${codigo} APLICADO`;
        updateCartUI();
        showToast(`Cupom ${codigo} aplicado!`);
    } else {
        showToast('Cupom inválido', 'error');
        input.value = '';
    }
}

function removerCupom() {
    descontoAtivo = 0; nomeCupomAtivo = '';
    document.getElementById('cupom-container').style.display = 'flex';
    document.getElementById('cupom-feedback').style.display = 'none';
    document.getElementById('input-cupom').value = '';
    updateCartUI();
}

// =============================================
// 10. FINALIZAR COMPRA
// =============================================
async function finalizarCompra(event) {
    if (event) event.preventDefault();
    if (cart.length === 0) return showToast('Sua sacola está vazia!', 'error');

    const btn = document.getElementById('btn-finalizar');
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const pagInput = document.querySelector('input[name="pagamento"]:checked');

    if (!nome || !numero || !cep || !pagInput) return showToast('Preencha todos os dados', 'error');
    const pagamento = pagInput.value;

    if (btn) { btn.innerHTML = '<span class="animate-spin" style="margin-right:6px;">⟳</span> PROCESSANDO...'; btn.disabled = true; }

    try {
        // Valida estoque
        for (const item of cart) {
            const { data: p } = await supabaseClient.from('produtos').select('estoque').eq('id', item.id).single();
            if (!p || p.estoque <= 0) {
                showToast(`"${item.name}" esgotou! Removido da sacola.`, 'error');
                cart = cart.filter(i => i.id !== item.id);
                salvarCarrinho(); updateCartUI();
                if (btn) { btn.innerText = 'FINALIZAR NO WHATSAPP'; btn.disabled = false; }
                return;
            }
        }

        // Baixa de estoque atômica
        for (const item of cart) {
            await supabaseClient.rpc('decrementar_estoque', { produto_id: item.id });
        }

        const subtotal = cart.reduce((s, i) => s + i.price, 0);
        const desconto = descontoAtivo < 1 ? subtotal * descontoAtivo : descontoAtivo;
        const comDesconto = Math.max(0, subtotal - desconto);
        const descontoPIX = pagamento === 'PIX' ? comDesconto * 0.10 : 0;
        const totalFinal = Math.max(0, comDesconto - descontoPIX) + valorFreteAtual;

        await supabaseClient.from('pedidos').insert([{ nome, cep, rua, numero, total: totalFinal, pagamento, itens_json: cart }]);

        let msg = `*NOVO PEDIDO - ÉDEN*\n\n*CLIENTE:* ${nome}\n*CIDADE:* ${cidadeAtual}\n*ENDEREÇO:* ${rua}, nº ${numero}\n\n*ITENS:*\n`;
        cart.forEach(i => { msg += `- ${i.name} (${i.color}/${i.size}) — R$ ${i.price.toFixed(2)}\n`; });
        if (desconto > 0) msg += `\n*CUPOM:* ${nomeCupomAtivo} (-R$ ${desconto.toFixed(2)})`;
        if (descontoPIX > 0) msg += `\n*DESCONTO PIX:* -R$ ${descontoPIX.toFixed(2)}`;
        msg += `\n*FRETE:* R$ ${valorFreteAtual.toFixed(2)}`;
        msg += `\n\n*TOTAL: R$ ${totalFinal.toFixed(2)}*\n*PAGAMENTO:* ${pagamento}`;

        window.location.href = `https://wa.me/5587988501105?text=${encodeURIComponent(msg)}`;

        cart = []; salvarCarrinho(); updateCartUI();
        document.getElementById('order-form').reset();
        removerCupom();
        showView('shop-view');
        carregarProdutos();

    } catch (err) {
        showToast('Erro ao processar pedido', 'error');
        if (btn) { btn.innerText = 'FINALIZAR NO WHATSAPP'; btn.disabled = false; }
    }
}

// =============================================
// 11. NAVEGAÇÃO
// =============================================
function showView(viewId) {
    const cart = document.getElementById('cart-view');
    const overlay = document.getElementById('cart-overlay');
    const shop = document.getElementById('shop-view');
    const checkout = document.getElementById('checkout-view');

    if (viewId === 'cart-view') {
        cart.classList.add('cart-open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        return;
    }

    // Fecha carrinho sempre que sair dele
    cart.classList.remove('cart-open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';

    if (viewId === 'shop-view') {
        shop.style.display = '';
        checkout.style.display = 'none';
        // Não rola para o topo se já está na loja
        return;
    }

    if (viewId === 'checkout-view') {
        shop.style.display = 'none';
        checkout.style.display = 'block';
        window.scrollTo(0, 0);
        return;
    }
}

function checkout() {
    if (cart.length === 0) return showToast('Sua sacola está vazia!', 'error');
    showView('checkout-view');
}

// =============================================
// 12. SCROLL DO HEADER
// =============================================
window.onscroll = function () {
    const header = document.getElementById('main-header');
    const logo = document.querySelector('.brand-logo');
    if (!header || !logo) return;
    if (window.scrollY > 50) {
        header.style.paddingTop = '10px'; header.style.paddingBottom = '10px';
        logo.style.fontSize = '1.3rem';
    } else {
        header.style.paddingTop = '20px'; header.style.paddingBottom = '20px';
        logo.style.fontSize = '1.8rem';
    }
};

// =============================================
// INIT
// =============================================
carregarCarrinho();
carregarProdutos();
updateCartUI();
