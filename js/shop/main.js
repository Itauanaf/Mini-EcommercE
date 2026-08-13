// =============================================================
// PONTO DE ENTRADA DA LOJA
// =============================================================
// Liga os elementos estáticos do index.html aos módulos correspondentes
// (namespace Eden.*) e inicializa o app. Conteúdo gerado dinamicamente
// (cards de produto, itens do carrinho, modal de cor/tamanho) usa
// delegação de eventos dentro do próprio módulo que o renderiza — ver
// products.js, cart-ui.js e product-modal.js.
(function () {
    function bindEventos() {
        document.getElementById('brand-logo')?.addEventListener('click', () => Eden.ui.showView('shop-view'));
        document.getElementById('btn-toggle-busca')?.addEventListener('click', Eden.ui.toggleBusca);
        document.getElementById('btn-open-cart')?.addEventListener('click', () => Eden.ui.showView('cart-view'));
        document.getElementById('btn-close-cart')?.addEventListener('click', () => Eden.ui.showView('shop-view'));
        document.getElementById('cart-overlay')?.addEventListener('click', () => Eden.ui.showView('shop-view'));
        document.getElementById('btn-fechar-pedido')?.addEventListener('click', Eden.checkout.checkout);
        document.getElementById('btn-voltar-loja')?.addEventListener('click', () => Eden.ui.showView('shop-view'));

        document.getElementById('input-busca')?.addEventListener('input', (e) => Eden.products.buscarProdutos(e.target.value));

        document.getElementById('btn-explorar')?.addEventListener('click', () => {
            document.getElementById('grid-produtos').scrollIntoView({ behavior: 'smooth' });
        });

        const cepInput = document.getElementById('cep');
        cepInput?.addEventListener('input', () => Eden.checkout.formatarCEP(cepInput));
        cepInput?.addEventListener('blur', () => Eden.checkout.buscaCEP(cepInput.value));

        document.getElementById('btn-aplicar-cupom')?.addEventListener('click', Eden.checkout.aplicarCupom);
        document.getElementById('btn-remover-cupom')?.addEventListener('click', Eden.checkout.removerCupom);
        document.getElementById('order-form')?.addEventListener('submit', Eden.checkout.finalizarCompra);

        document.addEventListener('change', (e) => { if (e.target.name === 'pagamento') Eden.pricing.renderTotais(); });
    }

    Eden.state.loadCart();
    bindEventos();
    Eden.products.carregarProdutos();
    Eden.cartUi.updateCartUI();
    Eden.ui.iniciarAnuncios();
    Eden.ui.iniciarScrollHeader();
})();
