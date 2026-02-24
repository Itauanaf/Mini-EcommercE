// 1. CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let pedidosGlobal = []; // Variável para a exportação funcionar

// 2. SISTEMA DE LOGIN (Substituindo o Prompt)
function verificarSenha() {
    const input = document.getElementById('admin-password');
    const senhaDigitada = input.value;

    if (senhaDigitada === "admin123") {
        // Esconde o login e mostra o painel
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        
        // Carrega os dados somente após o login com sucesso
        carregarDadosAdmin();
    } else {
        alert("Senha incorreta!");
        input.value = "";
        input.focus();
    }
}

// Atalho: Apertar ENTER para entrar
document.getElementById('admin-password')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        verificarSenha();
    }
});

// 3. FUNÇÃO PRINCIPAL: CARREGAR DADOS
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

    // Cálculos para o Dashboard
    const agora = new Date();
    const pedidosMes = pedidos.filter(p => {
        const dataPedido = new Date(p.created_at);
        return dataPedido.getMonth() === agora.getMonth() && 
               dataPedido.getFullYear() === agora.getFullYear();
    });

    const faturamentoMes = pedidosMes.reduce((sum, p) => sum + p.total, 0);
    const qtdTotal = pedidos.length;
    const faturamentoTotal = pedidos.reduce((sum, p) => sum + p.total, 0);
    const ticketMedio = qtdTotal > 0 ? (faturamentoTotal / qtdTotal) : 0;

    // Atualizar os Cards no HTML
    document.getElementById('total-mes').innerText = `R$ ${faturamentoMes.toFixed(2)}`;
    document.getElementById('qtd-pedidos').innerText = qtdTotal;
    document.getElementById('ticket-medio').innerText = `R$ ${ticketMedio.toFixed(2)}`;

    // Preencher a Tabela
    const tabela = document.getElementById('tabela-pedidos');
    if (pedidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>`;
        return;
    }

    tabela.innerHTML = pedidos.map(p => {
        const data = new Date(p.created_at).toLocaleDateString('pt-BR');
        
        let resumoItens = "";
        try {
            const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
            resumoItens = itens.map(i => `${i.name} (${i.color}/${i.size})`).join(', ');
        } catch (e) {
            resumoItens = "Erro ao ler itens";
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                <td class="p-6 text-slate-400 text-xs">${data}</td>
                <td class="p-6 font-semibold">${p.nome || 'Cliente s/ nome'}</td>
                <td class="p-6 text-slate-500 text-xs max-w-xs">${resumoItens}</td>
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
    if (!confirm("⚠️ Tem certeza que deseja apagar este pedido?")) return;

    const { error } = await supabaseClient
        .from('pedidos')
        .delete()
        .eq('id', id);

    if (error) alert("Erro ao excluir: " + error.message);
    else carregarDadosAdmin();
}

// 5. EXPORTAR RELATÓRIO (SheetJS)
function exportarCSV() {
    if (pedidosGlobal.length === 0) {
        alert("Não há pedidos para exportar.");
        return;
    }

    const dadosFormatados = pedidosGlobal.map(p => ({
        "DATA": new Date(p.created_at).toLocaleDateString('pt-BR'),
        "CLIENTE": p.nome,
        "FORMA PAGAMENTO": p.pagamento || "Não informado",
        "ENDEREÇO": `${p.rua}, ${p.numero} - CEP: ${p.cep}`,
        "ITENS": p.itens_json.map(i => `${i.name} (${i.color}/${i.size})`).join(' | '),
        "TOTAL (R$)": p.total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");

    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `EdenWear_Pedidos_${dataAtual}.xlsx`);
}