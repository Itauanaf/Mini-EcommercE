// 1. CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let pedidosGlobal = []; 

// 2. SISTEMA DE LOGIN (Autenticação Supabase)
async function verificarSenha() {
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const btnLogin = document.querySelector('#login-screen button');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Por favor, preencha e-mail e senha.");
        return;
    }

    // Feedback visual de carregamento
    btnLogin.innerText = "AUTENTICANDO...";
    btnLogin.disabled = true;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Acesso Negado: " + error.message);
        passwordInput.value = "";
        btnLogin.innerText = "ENTRAR NO PAINEL";
        btnLogin.disabled = false;
    } else {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        carregarDadosAdmin();
    }
}

// Atalho ENTER nos campos de login
document.addEventListener('DOMContentLoaded', () => {
    [document.getElementById('admin-email'), document.getElementById('admin-password')].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
    });
});

// 3. CARREGAR DADOS DO DASHBOARD
async function carregarDadosAdmin() {
    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
    }

    pedidosGlobal = pedidos;

    // --- CÁLCULOS DO DASHBOARD ---
    const agora = new Date();
    const faturamentoTotal = pedidos.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const qtdTotal = pedidos.length;
    const ticketMedio = qtdTotal > 0 ? (faturamentoTotal / qtdTotal) : 0;

    const faturamentoMes = pedidos
        .filter(p => {
            const d = new Date(p.created_at);
            return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
        })
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

    // Atualizar Cards
    document.getElementById('total-mes').innerText = `R$ ${faturamentoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('qtd-pedidos').innerText = qtdTotal;
    document.getElementById('ticket-medio').innerText = `R$ ${ticketMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // --- PREENCHER TABELA ---
    renderizarTabela(pedidos);
}

function renderizarTabela(pedidos) {
    const tabela = document.getElementById('tabela-pedidos');
    if (!pedidos || pedidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400 italic">Nenhum pedido encontrado.</td></tr>`;
        return;
    }

    tabela.innerHTML = pedidos.map(p => {
        const data = new Date(p.created_at).toLocaleDateString('pt-BR');
        
        let resumoItens = "";
        try {
            const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
            resumoItens = Array.isArray(itens) 
                ? itens.map(i => `<span class="bg-slate-100 px-2 py-1 rounded text-[10px] mr-1 mb-1 inline-block">${i.name} (${i.size})</span>`).join('')
                : "Formato inválido";
        } catch (e) {
            resumoItens = "<span class=\"text-red-400\">Erro na leitura</span>";
        }

        return `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                <td class="p-6 text-slate-400 text-xs">${data}</td>
                <td class="p-6">
                    <div class="font-bold text-slate-900">${p.nome || 'Cliente Anônimo'}</div>
                    <div class="text-[10px] text-slate-400 uppercase tracking-tighter">${p.pagamento || 'PIX/CARTÃO'}</div>
                </td>
                <td class="p-6">${resumoItens}</td>
                <td class="p-6 font-black text-slate-900">R$ ${Number(p.total).toFixed(2)}</td>
                <td class="p-6 text-right">
                    <button onclick="excluirPedido('${p.id}')" class="text-slate-300 hover:text-red-500 transition-all p-2">
                        <i class="bi bi-trash3 text-lg"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. EXCLUIR PEDIDO
async function excluirPedido(id) {
    if (!confirm("⚠️ Atenção: Deseja apagar permanentemente este pedido do banco de dados?")) return;

    const { error } = await supabaseClient
        .from('pedidos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        carregarDadosAdmin();
    }
}

// 5. LOGOUT
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

// 6. EXPORTAR RELATÓRIO PROFISSIONAL (Excel Multi-Abas)
function exportarCSV() {
    if (pedidosGlobal.length === 0) {
        alert("Não há pedidos para gerar o relatório.");
        return;
    }

    // --- 1. PROCESSAMENTO DE DADOS (INTELIGÊNCIA) ---
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

    // Encontrar o produto campeão de vendas
    const ranking = Object.entries(mapaProdutos).sort((a, b) => b[1] - a[1]);
    const topProduto = ranking[0] ? ranking[0][0] : "N/A";
    const topQtd = ranking[0] ? ranking[0][1] : 0;

    // --- 2. ABA 1: DASHBOARD DE PERFORMANCE ---
    const dadosResumo = [
        { "MÉTRICA": "RELATÓRIO DE VENDAS", "VALOR": "ÉDEN.WEAR - OFICIAL" },
        { "MÉTRICA": "Data de Extração", "VALOR": new Date().toLocaleString('pt-BR') },
        { "MÉTRICA": "", "VALOR": "" }, // Linha vazia
        { "MÉTRICA": "FATURAMENTO BRUTO", "VALOR": `R$ ${faturamentoTotal.toFixed(2)}` },
        { "MÉTRICA": "TOTAL DE PEDIDOS", "VALOR": pedidosGlobal.length },
        { "MÉTRICA": "TICKET MÉDIO", "VALOR": `R$ ${(faturamentoTotal / pedidosGlobal.length).toFixed(2)}` },
        { "MÉTRICA": "", "VALOR": "" },
        { "MÉTRICA": "PRODUTO MAIS VENDIDO", "VALOR": topProduto },
        { "MÉTRICA": "UNIDADES DO CAMPEÃO", "VALOR": topQtd },
    ];

    // --- 3. ABA 2: LISTAGEM DETALHADA ---
    const dadosDetalhados = pedidosGlobal.map(p => ({
        "DATA": new Date(p.created_at).toLocaleDateString('pt-BR'),
        "CLIENTE": p.nome || "Não informado",
        "PAGAMENTO": p.pagamento || "PIX",
        "TOTAL": Number(p.total),
        "ITENS": Array.isArray(p.itens_json) ? p.itens_json.map(i => `${i.name} [${i.size}]`).join(' | ') : "Erro",
        "CIDADE": p.cidade || "-",
        "BAIRRO": p.bairro || "-"
    }));

    // --- 4. GERAÇÃO DO ARQUIVO EXCEL ---
    const wb = XLSX.utils.book_new();
    
    // Criar as planilhas
    const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
    const wsDetalhes = XLSX.utils.json_to_sheet(dadosDetalhados);

    // Adicionar ao livro (Workbook)
    XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO EXECUTIVO");
    XLSX.utils.book_append_sheet(wb, wsDetalhes, "LISTA DE PEDIDOS");

    // Salvar
    const dataRef = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Relatorio_EdenWear_Performance_${dataRef}.xlsx`);
}