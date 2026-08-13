// =============================================================
// PAINEL DE CUPONS: CRUD dos cupons de desconto
// =============================================================
var Eden = window.Eden || {};

Eden.adminCoupons = (function () {
    const supabase = Eden.config.supabase;
    const { escapeHtml } = Eden.utils;

    let cuponsGlobal = [];

    async function carregarCuponsAdmin() {
        const { data, error } = await supabase
            .from('cupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar cupons:', error);
            return;
        }

        cuponsGlobal = data || [];
        renderizarTabelaCupons();
    }

    function formatarValor(cupom) {
        return cupom.tipo === 'percentual' ? `${Number(cupom.valor)}%` : `R$ ${Number(cupom.valor).toFixed(2)}`;
    }

    function renderizarTabelaCupons() {
        const tabela = document.getElementById('tabela-cupons');
        if (!tabela) return;

        if (cuponsGlobal.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-400 italic">Nenhum cupom cadastrado.</td></tr>`;
            return;
        }

        tabela.innerHTML = cuponsGlobal.map(c => `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                <td class="p-6 font-black text-slate-900 tracking-widest">${escapeHtml(c.codigo)}</td>
                <td class="p-6">${formatarValor(c)}</td>
                <td class="p-6">
                    <button type="button" data-action="alternar-ativo" data-id="${c.id}"
                            class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.ativo ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}">
                        ${c.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                </td>
                <td class="p-6 text-right whitespace-nowrap">
                    <button type="button" data-action="editar" data-id="${c.id}" class="text-slate-300 hover:text-black transition-all p-2">
                        <i class="bi bi-pencil-square text-lg"></i>
                    </button>
                    <button type="button" data-action="excluir" data-id="${c.id}" class="text-slate-300 hover:text-red-500 transition-all p-2">
                        <i class="bi bi-trash3 text-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('tabela-cupons')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const cupom = cuponsGlobal.find(c => String(c.id) === btn.dataset.id);

        if (btn.dataset.action === 'editar' && cupom) abrirFormCupom(cupom);
        if (btn.dataset.action === 'excluir') excluirCupom(btn.dataset.id);
        if (btn.dataset.action === 'alternar-ativo' && cupom) alternarAtivo(cupom);
    });

    document.getElementById('btn-novo-cupom')?.addEventListener('click', () => abrirFormCupom(null));

    function abrirFormCupom(cupom) {
        const editando = Boolean(cupom);

        const overlay = document.createElement('div');
        overlay.id = 'modal-cupom';
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4';
        overlay.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold tracking-tight">${editando ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                    <button type="button" data-action="fechar" class="text-slate-300 hover:text-slate-500"><i class="bi bi-x-circle-fill text-2xl"></i></button>
                </div>
                <form id="form-cupom" class="space-y-4">
                    <input type="text" name="codigo" placeholder="Código (ex: EDEN10)" required
                           value="${editando ? escapeHtml(cupom.codigo) : ''}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none uppercase tracking-widest">
                    <select name="tipo" class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                        <option value="percentual" ${editando && cupom.tipo === 'percentual' ? 'selected' : ''}>Percentual (%)</option>
                        <option value="fixo" ${editando && cupom.tipo === 'fixo' ? 'selected' : ''}>Valor fixo (R$)</option>
                    </select>
                    <input type="number" name="valor" placeholder="Valor" step="0.01" min="0" required
                           value="${editando ? cupom.valor : ''}"
                           class="w-full p-4 bg-slate-50 rounded-xl outline-none">
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer">
                        <input type="checkbox" name="ativo" ${!editando || cupom.ativo ? 'checked' : ''} class="w-4 h-4">
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-500">Cupom ativo</span>
                    </label>
                    <button type="submit" class="w-full py-4 bg-black text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all">
                        ${editando ? 'Salvar Alterações' : 'Cadastrar Cupom'}
                    </button>
                </form>
            </div>`;

        overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharFormCupom(); });
        overlay.querySelector('[data-action="fechar"]').addEventListener('click', fecharFormCupom);
        overlay.querySelector('#form-cupom').addEventListener('submit', (e) => salvarCupom(e, editando ? cupom.id : null));

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    function fecharFormCupom() {
        document.getElementById('modal-cupom')?.remove();
        document.body.style.overflow = '';
    }

    async function salvarCupom(event, id) {
        event.preventDefault();
        const form = event.target;
        const botao = form.querySelector('button[type="submit"]');
        const dados = new FormData(form);

        const payload = {
            codigo: dados.get('codigo').trim().toUpperCase(),
            tipo: dados.get('tipo'),
            valor: Number(dados.get('valor')),
            ativo: dados.get('ativo') === 'on'
        };

        botao.disabled = true;
        botao.innerText = 'Salvando...';

        const { error } = id
            ? await supabase.from('cupons').update(payload).eq('id', id)
            : await supabase.from('cupons').insert([payload]);

        if (error) {
            const mensagem = error.code === '23505' ? 'já existe um cupom com esse código.' : error.message;
            alert('Erro ao salvar cupom: ' + mensagem + (error.message.includes('relation') ? '\n\nDica: rode supabase/schema.sql no SQL Editor do Supabase para criar a tabela "cupons".' : ''));
            botao.disabled = false;
            botao.innerText = id ? 'Salvar Alterações' : 'Cadastrar Cupom';
            return;
        }

        fecharFormCupom();
        carregarCuponsAdmin();
    }

    async function alternarAtivo(cupom) {
        const { error } = await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id);
        if (error) {
            alert('Erro ao atualizar cupom: ' + error.message);
            return;
        }
        carregarCuponsAdmin();
    }

    async function excluirCupom(id) {
        if (!confirm('Excluir este cupom permanentemente?')) return;
        const { error } = await supabase.from('cupons').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir cupom: ' + error.message);
        } else {
            carregarCuponsAdmin();
        }
    }

    return { carregarCuponsAdmin };
})();
