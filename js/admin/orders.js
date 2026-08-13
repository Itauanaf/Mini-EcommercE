// =============================================================
// PAINEL DE PEDIDOS: métricas, tabela, status e exportação
// =============================================================
var Eden = window.Eden || {};

Eden.orders = (function () {
    const supabase = Eden.config.supabase;
    const { escapeHtml } = Eden.utils;

    const STATUS_LABELS = {
        aguardando_whatsapp: 'Aguardando WhatsApp',
        confirmado: 'Confirmado',
        enviado: 'Enviado',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
    };

    let pedidosGlobal = [];

    async function carregarPedidos() {
        const { data: pedidos, error } = await supabase
            .from('pedidos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pedidos:', error);
            return;
        }

        pedidosGlobal = pedidos;
        renderizarMetricas(pedidos);
        renderizarTabela(pedidos);
    }

    function renderizarMetricas(pedidos) {
        const agora = new Date();
        const faturamentoTotal = pedidos.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const qtdTotal = pedidos.length;
        const ticketMedio = qtdTotal > 0 ? faturamentoTotal / qtdTotal : 0;

        const faturamentoMes = pedidos
            .filter(p => {
                const d = new Date(p.created_at);
                return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
            })
            .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

        document.getElementById('total-mes').innerText = `R$ ${faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('qtd-pedidos').innerText = qtdTotal;
        document.getElementById('ticket-medio').innerText = `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    function renderizarTabela(pedidos) {
        const tabela = document.getElementById('tabela-pedidos');
        if (!pedidos || pedidos.length === 0) {
            tabela.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-slate-400 italic">Nenhum pedido encontrado.</td></tr>`;
            return;
        }

        tabela.innerHTML = pedidos.map(p => {
            const data = new Date(p.created_at).toLocaleDateString('pt-BR');

            let resumoItens = '';
            try {
                const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
                resumoItens = Array.isArray(itens)
                    ? itens.map(i => `<span class="bg-slate-100 px-2 py-1 rounded text-[10px] mr-1 mb-1 inline-block">${escapeHtml(i.name)} (${escapeHtml(i.size)})</span>`).join('')
                    : 'Formato inválido';
            } catch (e) {
                resumoItens = '<span class="text-red-400">Erro na leitura</span>';
            }

            const statusAtual = p.status || 'aguardando_whatsapp';
            const opcoesStatus = Object.entries(STATUS_LABELS)
                .map(([valor, rotulo]) => `<option value="${valor}" ${valor === statusAtual ? 'selected' : ''}>${rotulo}</option>`)
                .join('');

            return `
                <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td class="p-6 text-slate-400 text-xs">${data}</td>
                    <td class="p-6">
                        <div class="font-bold text-slate-900">${escapeHtml(p.nome) || 'Cliente Anônimo'}</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-tighter">${escapeHtml(p.pagamento) || 'PIX/CARTÃO'}</div>
                    </td>
                    <td class="p-6">${resumoItens}</td>
                    <td class="p-6 font-black text-slate-900">R$ ${Number(p.total).toFixed(2)}</td>
                    <td class="p-6">
                        <select data-action="status" data-id="${p.id}" class="status-select status-${statusAtual}">
                            ${opcoesStatus}
                        </select>
                    </td>
                    <td class="p-6 text-right">
                        <button type="button" data-action="excluir" data-id="${p.id}" class="text-slate-300 hover:text-red-500 transition-all p-2">
                            <i class="bi bi-trash3 text-lg"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function atualizarStatus(id, status) {
        const { error } = await supabase.from('pedidos').update({ status }).eq('id', id);
        if (error) {
            alert('Erro ao atualizar status: ' + error.message);
            carregarPedidos();
        } else {
            const pedido = pedidosGlobal.find(p => p.id === id);
            if (pedido) pedido.status = status;
        }
    }

    async function excluirPedido(id) {
        if (!confirm('⚠️ Atenção: Deseja apagar permanentemente este pedido do banco de dados?')) return;
        const { error } = await supabase.from('pedidos').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            carregarPedidos();
        }
    }

    document.getElementById('tabela-pedidos')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="excluir"]');
        if (btn) excluirPedido(btn.dataset.id);
    });

    document.getElementById('tabela-pedidos')?.addEventListener('change', (e) => {
        const select = e.target.closest('[data-action="status"]');
        if (select) atualizarStatus(select.dataset.id, select.value);
    });

    // -----------------------------------------------------------
    // EXPORTAÇÃO XLSX (relatório com resumo executivo + lista detalhada)
    // -----------------------------------------------------------
    function exportarRelatorio() {
        if (pedidosGlobal.length === 0) {
            alert('Não há pedidos para gerar o relatório.');
            return;
        }

        const mapaProdutos = {};
        let faturamentoTotal = 0;

        pedidosGlobal.forEach(p => {
            faturamentoTotal += Number(p.total) || 0;
            const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
            if (Array.isArray(itens)) {
                itens.forEach(item => {
                    const chave = `${item.name} (${item.color || 'Padrão'})`;
                    mapaProdutos[chave] = (mapaProdutos[chave] || 0) + 1;
                });
            }
        });

        const ranking = Object.entries(mapaProdutos).sort((a, b) => b[1] - a[1]);
        const topProduto = ranking[0] ? ranking[0][0] : 'N/A';
        const topQtd = ranking[0] ? ranking[0][1] : 0;

        const dadosResumo = [
            { 'MÉTRICA': 'RELATÓRIO DE VENDAS', 'VALOR': 'ÉDEN - OFICIAL' },
            { 'MÉTRICA': 'Data de Extração', 'VALOR': new Date().toLocaleString('pt-BR') },
            { 'MÉTRICA': '', 'VALOR': '' },
            { 'MÉTRICA': 'FATURAMENTO BRUTO', 'VALOR': `R$ ${faturamentoTotal.toFixed(2)}` },
            { 'MÉTRICA': 'TOTAL DE PEDIDOS', 'VALOR': pedidosGlobal.length },
            { 'MÉTRICA': 'TICKET MÉDIO', 'VALOR': `R$ ${(faturamentoTotal / pedidosGlobal.length).toFixed(2)}` },
            { 'MÉTRICA': '', 'VALOR': '' },
            { 'MÉTRICA': 'PRODUTO MAIS VENDIDO', 'VALOR': topProduto },
            { 'MÉTRICA': 'UNIDADES DO CAMPEÃO', 'VALOR': topQtd }
        ];

        const dadosDetalhados = pedidosGlobal.map(p => ({
            DATA: new Date(p.created_at).toLocaleDateString('pt-BR'),
            CLIENTE: p.nome || 'Não informado',
            STATUS: STATUS_LABELS[p.status] || p.status || 'Aguardando WhatsApp',
            PAGAMENTO: p.pagamento || 'PIX',
            TOTAL: Number(p.total),
            ITENS: Array.isArray(p.itens_json) ? p.itens_json.map(i => `${i.name} [${i.size}]`).join(' | ') : 'Erro',
            CIDADE: p.cidade || '-'
        }));

        const wb = XLSX.utils.book_new();
        const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
        const wsDetalhes = XLSX.utils.json_to_sheet(dadosDetalhados);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'RESUMO EXECUTIVO');
        XLSX.utils.book_append_sheet(wb, wsDetalhes, 'LISTA DE PEDIDOS');

        const dataRef = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Relatorio_EdenWear_Performance_${dataRef}.xlsx`);
    }

    return { carregarPedidos, exportarRelatorio };
})();
