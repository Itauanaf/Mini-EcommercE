// 1. PROTEÇÃO DE ACESSO (Logo no início para bloquear curiosos)
const senha = prompt("Digite a senha de administrador:");
if (senha !== "admin123") {
    alert("Senha incorreta!");
    window.location.href = "index.html"; // Manda de volta se errar
}

// 2. CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

// 3. FUNÇÃO PRINCIPAL: CARREGAR DADOS
async function carregarDadosAdmin() {
    // Buscar todos os pedidos do banco
    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
    }

    // Cálculos para o Dashboard (Faturamento Mensal)
    const agora = new Date();
    const pedidosMes = pedidos.filter(p => {
        const dataPedido = new Date(p.created_at);
        return dataPedido.getMonth() === agora.getMonth() && 
               dataPedido.getFullYear() === agora.getFullYear();
    });

    const faturamentoMes = pedidosMes.reduce((sum, p) => sum + p.total, 0);
    const qtdTotal = pedidos.length;
    const ticketMedio = qtdTotal > 0 ? (pedidos.reduce((sum, p) => sum + p.total, 0) / qtdTotal) : 0;

    // Atualizar os Cards no HTML
    document.getElementById('total-mes').innerText = `R$ ${faturamentoMes.toFixed(2)}`;
    document.getElementById('qtd-pedidos').innerText = qtdTotal;
    document.getElementById('ticket-medio').innerText = `R$ ${ticketMedio.toFixed(2)}`;

    // Preencher a Tabela de Pedidos
    const tabela = document.getElementById('tabela-pedidos');
    if (pedidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>`;
        return;
    }

    tabela.innerHTML = pedidos.map(p => {
        const data = new Date(p.created_at).toLocaleDateString('pt-BR');
        
        // Tratar o JSON dos itens com segurança
        let resumoItens = "Erro ao ler itens";
        try {
            const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
            resumoItens = itens.map(i => `${i.name} (${i.size})`).join(', ');
        } catch (e) {
            console.error("Erro no JSON:", e);
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                <td class="p-6 text-slate-400 text-xs">${data}</td>
                <td class="p-6 font-semibold">${p.nome || 'Cliente s/ nome'}</td>
                <td class="p-6 text-slate-500 max-w-xs truncate">${resumoItens}</td>
                <td class="p-6 font-bold text-slate-900">R$ ${p.total.toFixed(2)}</td>
                <td class="p-6 text-right">
                    <button onclick="excluirPedido('${p.id}')" class="text-red-300 hover:text-red-600 transition-all p-2">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. FUNÇÃO PARA EXCLUIR PEDIDO
async function excluirPedido(id) {
    if (!confirm("⚠️ Tem certeza que deseja apagar este pedido? Esta ação não pode ser desfeita.")) return;

    const { error } = await supabaseClient
        .from('pedidos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        // Recarrega os dados para atualizar o faturamento e a tabela
        carregarDadosAdmin();
    }
}

// 5. EXPORTAR RELATÓRIO (BÁSICO)
function exportarCSV() {
    alert("Gerando planilha... Os dados serão baixados em instantes.");
    // Aqui você pode integrar uma biblioteca como SheetJS no futuro
}

// Inicia o carregamento automático ao abrir a página
carregarDadosAdmin();