// 1. CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

const BUCKET_NAME = 'produtos'; // Nome do bucket criado no Supabase Storage
let pedidosGlobal = []; 

// 2. SISTEMA DE LOGIN
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

// Inicialização e Atalhos
document.addEventListener('DOMContentLoaded', () => {
    // Atalho Enter
    [document.getElementById('admin-email'), document.getElementById('admin-password')].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
    });

    // Feedback visual do upload de imagem
    document.getElementById('p-imagem')?.addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name;
        if(fileName) document.getElementById('label-imagem').innerHTML = `<i class="bi bi-check-circle-fill text-green-500"></i> ${fileName}`;
    });

    // Evento do formulário de produto
    document.getElementById('form-produto')?.addEventListener('submit', cadastrarNovoProduto);
});

// 3. CARREGAR DADOS GERAIS
async function carregarDadosAdmin() {
    await carregarPedidos();
    await listarProdutosEstoque();
}

async function carregarPedidos() {
    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error("Erro pedidos:", error);

    pedidosGlobal = pedidos;

    // dashboard cálculos
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

    document.getElementById('total-mes').innerText = `R$ ${faturamentoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('qtd-pedidos').innerText = qtdTotal;
    document.getElementById('ticket-medio').innerText = `R$ ${ticketMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    renderizarTabelaPedidos(pedidos);
}

function renderizarTabelaPedidos(pedidos) {
    const tabela = document.getElementById('tabela-pedidos');
    if (!pedidos || pedidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400">Sem pedidos.</td></tr>`;
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
        } catch (e) { resumoItens = "Erro leitura"; }

        return `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                <td class="p-6 text-slate-400 text-xs">${data}</td>
                <td class="p-6"><div class="font-bold">${p.nome || 'Cliente'}</div><div class="text-[10px] text-slate-400">${p.pagamento || 'PIX'}</div></td>
                <td class="p-6">${resumoItens}</td>
                <td class="p-6 font-black">R$ ${Number(p.total).toFixed(2)}</td>
                <td class="p-6 text-right"><button onclick="excluirPedido('${p.id}')" class="text-slate-300 hover:text-red-500 p-2"><i class="bi bi-trash3"></i></button></td>
            </tr>
        `;
    }).join('');
}

// 4. GESTÃO DE PRODUTOS E ESTOQUE
async function cadastrarNovoProduto(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar');
    const nome = document.getElementById('p-nome').value;
    const preco = parseFloat(document.getElementById('p-preco').value);
    const estoque = parseInt(document.getElementById('p-estoque').value);
    const file = document.getElementById('p-imagem').files[0];

    try {
        btn.innerText = "ENVIANDO PRODUTO...";
        btn.disabled = true;

        // Upload imagem
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage.from(BUCKET_NAME).upload(fileName, file);
        if (uploadError) throw uploadError;

        // URL pública
        const { data: publicUrlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        const imagemUrl = publicUrlData.publicUrl;

        // Inserir banco
        const { error: insertError } = await supabaseClient
            .from('produtos')
            .insert([{ nome, preco, imagem_url: imagemUrl, estoque }]);

        if (insertError) throw insertError;

        alert("✅ Produto cadastrado!");
        document.getElementById('form-produto').reset();
        document.getElementById('label-imagem').innerHTML = `<i class="bi bi-image"></i> FOTO`;
        carregarDadosAdmin();

    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.innerText = "CADASTRAR PRODUTO NO CATÁLOGO";
        btn.disabled = false;
    }
}

async function listarProdutosEstoque() {
    const { data: produtos, error } = await supabaseClient.from('produtos').select('*').order('nome');
    if (error) return;

    const tabela = document.getElementById('tabela-estoque');
    tabela.innerHTML = produtos.map(p => `
        <tr class="hover:bg-slate-50/50">
            <td class="p-6 flex items-center gap-3">
                <img src="${p.imagem_url}" class="w-10 h-10 rounded-lg object-cover bg-slate-100">
                <span class="font-semibold text-slate-800">${p.nome}</span>
            </td>
            <td class="p-6">
                <input type="number" step="0.01" value="${p.preco}" 
                    onchange="atualizarProduto('${p.id}', 'preco', this.value)"
                    class="w-24 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 focus:border-black outline-none text-xs">
            </td>
            <td class="p-6">
                <div class="flex items-center gap-2">
                    <input type="number" value="${p.estoque || 0}" 
                        onchange="atualizarProduto('${p.id}', 'estoque', this.value)"
                        class="w-16 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 focus:border-black outline-none text-xs ${p.estoque <= 3 ? 'text-red-500 font-bold' : ''}">
                    ${p.estoque <= 3 ? '<i class="bi bi-exclamation-triangle text-red-400" title="Estoque Baixo"></i>' : ''}
                </div>
            </td>
            <td class="p-6 text-right">
                <button onclick="excluirProdutoCatalogo('${p.id}')" class="text-slate-300 hover:text-red-500"><i class="bi bi-trash3"></i></button>
            </td>
        </tr>
    `).join('');
}

async function atualizarProduto(id, campo, valor) {
    const dados = {};
    dados[campo] = (campo === 'nome') ? valor : Number(valor);
    const { error } = await supabaseClient.from('produtos').update(dados).eq('id', id);
    if (error) alert("Erro ao atualizar: " + error.message);
}

async function excluirProdutoCatalogo(id) {
    if (!confirm("Remover este produto da loja definitivamente?")) return;
    const { error } = await supabaseClient.from('produtos').delete().eq('id', id);
    if (!error) listarProdutosEstoque();
}

async function excluirPedido(id) {
    if (!confirm("⚠️ Apagar permanentemente este pedido?")) return;
    const { error } = await supabaseClient.from('pedidos').delete().eq('id', id);
    if (!error) carregarPedidos();
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

// 5. EXPORTAR RELATÓRIO PROFISSIONAL
function exportarCSV() {
    if (pedidosGlobal.length === 0) return alert("Sem pedidos para exportar.");

    const mapaProdutos = {};
    let faturamentoTotal = 0;

    pedidosGlobal.forEach(p => {
        faturamentoTotal += Number(p.total) || 0;
        const itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json;
        if (Array.isArray(itens)) {
            itens.forEach(item => {
                const chave = `${item.name}`;
                mapaProdutos[chave] = (mapaProdutos[chave] || 0) + 1;
            });
        }
    });

    const ranking = Object.entries(mapaProdutos).sort((a, b) => b[1] - a[1]);
    const topProduto = ranking[0] ? ranking[0][0] : "N/A";

    const dadosResumo = [
        { "MÉTRICA": "LOJA", "VALOR": "ÉDEN.WEAR" },
        { "MÉTRICA": "FATURAMENTO", "VALOR": faturamentoTotal.toFixed(2) },
        { "MÉTRICA": "PEDIDOS", "VALOR": pedidosGlobal.length },
        { "MÉTRICA": "TOP PRODUTO", "VALOR": topProduto }
    ];

    const dadosDetalhados = pedidosGlobal.map(p => ({
        "DATA": new Date(p.created_at).toLocaleDateString('pt-BR'),
        "CLIENTE": p.nome,
        "TOTAL": Number(p.total),
        "PAGAMENTO": p.pagamento || "PIX"
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosResumo), "RESUMO");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosDetalhados), "PEDIDOS");
    XLSX.writeFile(wb, `EdenWear_Relatorio.xlsx`);
}