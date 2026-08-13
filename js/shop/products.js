// =============================================================
// CATÁLOGO: busca, renderização e filtro de produtos
// =============================================================
var Eden = window.Eden || {};

Eden.products = (function () {
    const supabase = Eden.config.supabase;
    const { escapeHtml } = Eden.utils;

    let todosProdutos = [];

    function getTodosProdutos() {
        return todosProdutos;
    }

    function skeletonGrid(qtd = 8) {
        return Array.from({ length: qtd }).map(() => `
            <div class="flex flex-col h-full bg-white rounded-[2.5rem] p-2">
                <div class="aspect-[3/4] rounded-[2.2rem] bg-slate-100 mb-4 skeleton-box"></div>
                <div class="px-3 pb-3">
                    <div class="h-3 w-3/4 rounded-full bg-slate-100 skeleton-box mb-2"></div>
                    <div class="h-4 w-1/3 rounded-full bg-slate-100 skeleton-box"></div>
                </div>
            </div>`).join('');
    }

    async function carregarProdutos() {
        const grid = document.getElementById('grid-produtos');
        grid.innerHTML = skeletonGrid();

        const { data: produtos, error } = await supabase
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar produtos:', error.message);
            grid.innerHTML = "<p class='col-span-full text-center py-10 text-slate-400 italic'>Não foi possível carregar o catálogo agora.</p>";
            return;
        }

        // Trata ausência do campo "ativo" como visível — assim a loja
        // continua funcionando mesmo antes de rodar a migração em
        // supabase/schema.sql que introduziu essa coluna.
        const visiveis = (produtos || []).filter(p => p.ativo !== false);

        if (visiveis.length === 0) {
            grid.innerHTML = "<p class='col-span-full text-center py-10 text-slate-400 italic'>Nenhum produto disponível no momento.</p>";
            return;
        }

        todosProdutos = visiveis;
        renderizarGrid(visiveis);
    }

    function renderizarGrid(produtos) {
        const grid = document.getElementById('grid-produtos');
        if (!produtos || produtos.length === 0) {
            grid.innerHTML = "<p class='col-span-full text-center py-10 text-slate-400 italic'>Nenhum produto encontrado para essa busca.</p>";
            return;
        }

        grid.innerHTML = produtos.map(p => {
            const esgotado = Number(p.estoque) <= 0;
            return `
            <div data-produto-id="${p.id}"
                 class="flex flex-col h-full group ${esgotado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:scale-95'} bg-white rounded-[2.5rem] p-2 transition-all duration-300">
                <div class="relative overflow-hidden aspect-[3/4] rounded-[2.2rem] bg-slate-100 mb-4 skeleton-box">
                    ${esgotado ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-[2px]"><span class="bg-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl text-slate-400">Esgotado</span></div>` : ''}
                    <img src="${p.imagem_url}" loading="lazy" alt="${escapeHtml(p.nome)}"
                         onload="this.parentElement.classList.remove('skeleton-box')"
                         onerror="this.parentElement.classList.remove('skeleton-box')"
                         class="object-cover w-full h-full transition-transform duration-700 ${esgotado ? '' : 'group-hover:scale-105'}">
                </div>
                <div class="px-3 pb-3">
                    <h3 class="text-[14px] font-light text-slate-700 tracking-tight leading-tight mb-1">${escapeHtml(p.nome)}</h3>
                    <p class="text-[16px] font-semibold text-slate-900">${esgotado ? '<span class="text-slate-300 italic font-normal text-sm">Indisponível</span>' : `R$ ${Number(p.preco).toFixed(2)}`}</p>
                </div>
            </div>`;
        }).join('');
    }

    let debounceBusca;
    function buscarProdutos(termo) {
        clearTimeout(debounceBusca);
        debounceBusca = setTimeout(() => {
            const t = termo.trim().toLowerCase();
            renderizarGrid(t ? todosProdutos.filter(p => p.nome.toLowerCase().includes(t)) : todosProdutos);
        }, 200);
    }

    // Um único listener delegado cobre todos os cards, mesmo recriados a
    // cada renderização — evita expor uma função global por card e evita
    // serializar o produto inteiro dentro de um atributo onclick (frágil
    // com aspas/acentos e visível como HTML bruto).
    document.getElementById('grid-produtos')?.addEventListener('click', (e) => {
        const card = e.target.closest('[data-produto-id]');
        if (!card) return;
        const produto = todosProdutos.find(p => String(p.id) === card.dataset.produtoId);
        if (produto && Number(produto.estoque) > 0) Eden.productModal.abrirModalDetalhes(produto);
    });

    return { getTodosProdutos, carregarProdutos, renderizarGrid, buscarProdutos };
})();
