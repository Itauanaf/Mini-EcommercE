// =============================================================
// PAINEL DE PRODUTOS: CRUD do catálogo
// =============================================================
// Antes desta versão, o catálogo só podia ser editado direto no painel
// do Supabase. Aqui o admin cria, edita, desativa e exclui produtos
// sem sair do site.
var Eden = window.Eden || {};

Eden.adminProducts = (function () {
    const supabase = Eden.config.supabase;
    const { escapeHtml, listaSeparadaPorVirgula } = Eden.utils;

    let produtosGlobal = [];

    async function carregarProdutosAdmin() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar produtos:', error);
            return;
        }

        produtosGlobal = data || [];
        renderizarTabelaProdutos();
    }

    function renderizarTabelaProdutos() {
        const tabela = document.getElementById('tabela-produtos');
        if (!tabela) return;

        if (produtosGlobal.length === 0) {
            tabela.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-slate-400 italic">Nenhum produto cadastrado.</td></tr>`;
            return;
        }

        tabela.innerHTML = produtosGlobal.map(p => `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                <td class="p-6">
                    <img src="${escapeHtml(p.imagem_url)}" alt="${escapeHtml(p.nome)}" class="w-12 h-14 object-cover rounded-lg bg-slate-100">
                </td>
                <td class="p-6">
                    <div class="font-bold text-slate-900">${escapeHtml(p.nome)}</div>
                    <div class="text-[10px] text-slate-400 uppercase tracking-tighter">${escapeHtml(p.tamanhos)} · ${escapeHtml(p.cores)}</div>
                </td>
                <td class="p-6 font-black text-slate-900">R$ ${Number(p.preco).toFixed(2)}</td>
                <td class="p-6 ${Number(p.estoque) <= 0 ? 'text-red-500 font-bold' : ''}">${p.estoque}</td>
                <td class="p-6">
                    <button type="button" data-action="alternar-ativo" data-id="${p.id}"
                            class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.ativo !== false ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}">
                        ${p.ativo !== false ? 'Ativo' : 'Oculto'}
                    </button>
                </td>
                <td class="p-6 text-right whitespace-nowrap">
                    <button type="button" data-action="editar" data-id="${p.id}" class="text-slate-300 hover:text-black transition-all p-2">
                        <i class="bi bi-pencil-square text-lg"></i>
                    </button>
                    <button type="button" data-action="excluir" data-id="${p.id}" class="text-slate-300 hover:text-red-500 transition-all p-2">
                        <i class="bi bi-trash3 text-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('tabela-produtos')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const produto = produtosGlobal.find(p => String(p.id) === btn.dataset.id);

        if (btn.dataset.action === 'editar' && produto) abrirFormProduto(produto);
        if (btn.dataset.action === 'excluir') excluirProduto(btn.dataset.id);
        if (btn.dataset.action === 'alternar-ativo' && produto) alternarAtivo(produto);
    });

    document.getElementById('btn-novo-produto')?.addEventListener('click', () => abrirFormProduto(null));

    // -----------------------------------------------------------
    // FORMULÁRIO (criar / editar) — mesmo modal para os dois casos
    // -----------------------------------------------------------
    function abrirFormProduto(produto) {
        const editando = Boolean(produto);

        const overlay = document.createElement('div');
        overlay.id = 'modal-produto';
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4';
        overlay.innerHTML = `
            <div class="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold tracking-tight">${editando ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button type="button" data-action="fechar" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>
                <form id="form-produto" class="space-y-4">
                    <input type="text" name="nome" placeholder="Nome do produto" required
                           value="${editando ? escapeHtml(produto.nome) : ''}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-1 ring-black">
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" name="preco" placeholder="Preço (R$)" step="0.01" min="0" required
                               value="${editando ? produto.preco : ''}"
                               class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                        <input type="number" name="estoque" placeholder="Estoque" min="0" required
                               value="${editando ? produto.estoque : ''}"
                               class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                    </div>
                    <input type="url" name="imagem_url" placeholder="URL da imagem" required
                           value="${editando ? escapeHtml(produto.imagem_url) : ''}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                    <input type="text" name="tamanhos" placeholder="Tamanhos (ex: P,M,G,GG)"
                           value="${editando ? escapeHtml(produto.tamanhos) : 'P,M,G,GG'}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                    <input type="text" name="cores" placeholder="Cores (ex: Preto,Branco)"
                           value="${editando ? escapeHtml(produto.cores) : 'Preto,Branco'}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer">
                        <input type="checkbox" name="ativo" ${!editando || produto.ativo !== false ? 'checked' : ''} class="w-4 h-4">
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-500">Visível na loja</span>
                    </label>
                    <button type="submit" class="w-full py-4 bg-black text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all">
                        ${editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
                    </button>
                </form>
            </div>`;

        overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharFormProduto(); });
        overlay.querySelector('[data-action="fechar"]').addEventListener('click', fecharFormProduto);
        overlay.querySelector('#form-produto').addEventListener('submit', (e) => salvarProduto(e, editando ? produto.id : null));

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    function fecharFormProduto() {
        document.getElementById('modal-produto')?.remove();
        document.body.style.overflow = '';
    }

    async function salvarProduto(event, id) {
        event.preventDefault();
        const form = event.target;
        const botao = form.querySelector('button[type="submit"]');
        const dados = new FormData(form);

        const payload = {
            nome: dados.get('nome').trim(),
            preco: Number(dados.get('preco')),
            estoque: Number(dados.get('estoque')),
            imagem_url: dados.get('imagem_url').trim(),
            tamanhos: dados.get('tamanhos').trim() || 'P,M,G,GG',
            cores: dados.get('cores').trim() || 'Única',
            ativo: dados.get('ativo') === 'on'
        };

        if (!listaSeparadaPorVirgula(payload.tamanhos).length || !listaSeparadaPorVirgula(payload.cores).length) {
            alert('Informe ao menos um tamanho e uma cor.');
            return;
        }

        botao.disabled = true;
        botao.innerText = 'Salvando...';

        const { error } = id
            ? await supabase.from('produtos').update(payload).eq('id', id)
            : await supabase.from('produtos').insert([payload]);

        if (error) {
            alert('Erro ao salvar produto: ' + error.message + (error.message.includes('ativo') ? '\n\nDica: rode supabase/schema.sql no SQL Editor do Supabase para criar a coluna "ativo".' : ''));
            botao.disabled = false;
            botao.innerText = id ? 'Salvar Alterações' : 'Cadastrar Produto';
            return;
        }

        fecharFormProduto();
        carregarProdutosAdmin();
    }

    async function alternarAtivo(produto) {
        const { error } = await supabase.from('produtos').update({ ativo: produto.ativo === false }).eq('id', produto.id);
        if (error) {
            alert('Erro ao atualizar visibilidade: ' + error.message);
            return;
        }
        carregarProdutosAdmin();
    }

    async function excluirProduto(id) {
        if (!confirm('⚠️ Apagar este produto permanentemente? Pedidos antigos que já o referenciam não são afetados.')) return;
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir produto: ' + error.message);
        } else {
            carregarProdutosAdmin();
        }
    }

    return { carregarProdutosAdmin };
})();
