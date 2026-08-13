// =============================================================
// MODAL DE SELEÇÃO DE COR/TAMANHO
// =============================================================
var Eden = window.Eden || {};

Eden.productModal = (function () {
    const { addItem } = Eden.state;
    const { escapeHtml, listaSeparadaPorVirgula } = Eden.utils;

    const CORES_HEX = {
        'Preto': '#000000', 'Branco': '#FFFFFF', 'Off-White': '#F8F8F2',
        'Marrom': '#5D4037', 'Marinho': '#001F3F', 'Areia': '#C2B280', 'Aria': '#D2D2D2'
    };

    // Faixa Unicode dos acentos combinantes (usada para gerar o sufixo de
    // arquivo de imagem por cor, ex: "Café" -> "cafe"). Construído via
    // new RegExp a partir de escapes \u para não depender de caracteres
    // combinantes literais no código-fonte.
    const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

    let produtoAtual = null;
    let tamanhoSelecionado = null;
    let corSelecionada = null;

    function abrirModalDetalhes(produto) {
        produtoAtual = produto;
        tamanhoSelecionado = null;
        corSelecionada = null;

        const tamanhos = listaSeparadaPorVirgula(produto.tamanhos).length ? listaSeparadaPorVirgula(produto.tamanhos) : ['P', 'M', 'G', 'GG'];
        const cores = listaSeparadaPorVirgula(produto.cores).length ? listaSeparadaPorVirgula(produto.cores) : ['Única'];

        const overlay = document.createElement('div');
        overlay.id = 'modal-tamanho';
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay';
        overlay.innerHTML = `
            <div class="modal-sheet bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex gap-4">
                        <img id="imagem-modal" src="${produto.imagem_url}" class="w-16 h-20 object-cover rounded-xl shadow-sm transition-all duration-500" alt="${escapeHtml(produto.nome)}">
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${escapeHtml(produto.nome)}</h2>
                            <p class="text-slate-500 font-medium text-sm">R$ ${Number(produto.preco).toFixed(2)}</p>
                        </div>
                    </div>
                    <button type="button" data-action="fechar" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">1. Escolha a Cor</p>
                <div class="flex flex-wrap justify-center gap-4 mb-6">
                    ${cores.map(cor => {
                        const hex = CORES_HEX[cor] || '#cbd5e1';
                        return `<div class="flex flex-col items-center gap-1">
                            <button type="button" data-cor="${escapeHtml(cor)}" aria-label="Cor ${escapeHtml(cor)}"
                                    style="background-color:${hex};${cor === 'Branco' ? 'border:1px solid #eee' : ''}"
                                    class="btn-cor w-10 h-10 rounded-full border-2 border-transparent shadow-sm transition-all active:scale-90"></button>
                            <span class="text-[10px] text-slate-400">${escapeHtml(cor)}</span>
                        </div>`;
                    }).join('')}
                </div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 text-center">2. Escolha o Tamanho</p>
                <div class="grid grid-cols-4 gap-3 mb-8">
                    ${tamanhos.map(t => `<button type="button" data-tamanho="${escapeHtml(t)}" class="btn-tamanho h-12 text-sm font-bold border border-slate-100 bg-slate-50 rounded-2xl transition-all">${escapeHtml(t)}</button>`).join('')}
                </div>
                <button type="button" id="btn-confirmar-add" disabled class="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl transition-all cursor-not-allowed">ADICIONAR À SACOLA</button>
            </div>`;

        overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
        overlay.querySelector('[data-action="fechar"]').addEventListener('click', fecharModal);
        overlay.querySelectorAll('.btn-cor').forEach(btn => btn.addEventListener('click', () => selecionarCor(btn, btn.dataset.cor)));
        overlay.querySelectorAll('.btn-tamanho').forEach(btn => btn.addEventListener('click', () => selecionarTamanho(btn, btn.dataset.tamanho)));
        overlay.querySelector('#btn-confirmar-add').addEventListener('click', confirmarAdicao);

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    function selecionarCor(el, cor) {
        corSelecionada = cor;
        document.querySelectorAll('.btn-cor').forEach(b => b.classList.remove('ring-2', 'ring-black', 'ring-offset-2'));
        el.classList.add('ring-2', 'ring-black', 'ring-offset-2');

        const img = document.getElementById('imagem-modal');
        if (img && produtoAtual) {
            const original = produtoAtual.imagem_url.trim().split('?')[0];
            const primeiraCor = listaSeparadaPorVirgula(produtoAtual.cores)[0]?.toLowerCase() || '';
            if (cor.toLowerCase().trim() === primeiraCor) {
                img.src = original;
            } else {
                const idx = original.lastIndexOf('.');
                const base = original.substring(0, idx);
                const ext = original.substring(idx);
                const sufixo = cor.toLowerCase().trim().normalize('NFD').replace(DIACRITICOS, '').replace(/\s+/g, '-');
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
        if (!produtoAtual || !tamanhoSelecionado || !corSelecionada) return;
        addItem(produtoAtual, tamanhoSelecionado, corSelecionada);
        Eden.cartUi.updateCartUI();
        fecharModal();
        Eden.ui.showToast('Adicionado à sacola');
    }

    function fecharModal() {
        const m = document.getElementById('modal-tamanho');
        if (!m) return;
        m.style.opacity = '0';
        setTimeout(() => m.remove(), 300);
        document.body.style.overflow = '';
    }

    return { abrirModalDetalhes };
})();
