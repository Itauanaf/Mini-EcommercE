// =============================================================
// PONTO DE ENTRADA DO PAINEL ADMIN
// =============================================================
(function () {
    const ABAS = ['pedidos', 'produtos', 'cupons'];
    const carregado = { pedidos: false, produtos: false, cupons: false };

    function mostrarPainel() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        ativarAba('pedidos');
    }

    function ativarAba(aba) {
        ABAS.forEach(nome => {
            document.getElementById(`view-${nome}`)?.classList.toggle('hidden', nome !== aba);
            document.getElementById(`tab-${nome}`)?.classList.toggle('tab-ativa', nome === aba);
        });

        if (!carregado[aba]) {
            carregado[aba] = true;
            if (aba === 'pedidos') Eden.orders.carregarPedidos();
            if (aba === 'produtos') Eden.adminProducts.carregarProdutosAdmin();
            if (aba === 'cupons') Eden.adminCoupons.carregarCuponsAdmin();
        }
    }

    function recarregarAbaAtual() {
        const ativa = ABAS.find(nome => document.getElementById(`tab-${nome}`)?.classList.contains('tab-ativa')) || 'pedidos';
        if (ativa === 'pedidos') Eden.orders.carregarPedidos();
        if (ativa === 'produtos') Eden.adminProducts.carregarProdutosAdmin();
        if (ativa === 'cupons') Eden.adminCoupons.carregarCuponsAdmin();
    }

    async function tentarLogin() {
        const emailInput = document.getElementById('admin-email');
        const passwordInput = document.getElementById('admin-password');
        const btnLogin = document.getElementById('btn-login');

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) {
            alert('Por favor, preencha e-mail e senha.');
            return;
        }

        btnLogin.innerText = 'AUTENTICANDO...';
        btnLogin.disabled = true;

        const { error } = await Eden.auth.login(email, password);

        if (error) {
            alert('Acesso Negado: ' + error.message);
            passwordInput.value = '';
            btnLogin.innerText = 'ACESSAR DASHBOARD';
            btnLogin.disabled = false;
        } else {
            mostrarPainel();
        }
    }

    function bindEventos() {
        document.getElementById('btn-login')?.addEventListener('click', tentarLogin);
        [document.getElementById('admin-email'), document.getElementById('admin-password')].forEach(input => {
            input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') tentarLogin(); });
        });

        document.getElementById('btn-atualizar')?.addEventListener('click', recarregarAbaAtual);
        document.getElementById('btn-exportar')?.addEventListener('click', Eden.orders.exportarRelatorio);
        document.getElementById('btn-logout')?.addEventListener('click', async () => { await Eden.auth.logout(); window.location.reload(); });

        ABAS.forEach(nome => document.getElementById(`tab-${nome}`)?.addEventListener('click', () => ativarAba(nome)));
    }

    async function iniciar() {
        bindEventos();
        const sessao = await Eden.auth.getSessao();
        if (sessao) mostrarPainel();
    }

    iniciar();
})();
