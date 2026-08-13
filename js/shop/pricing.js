// =============================================================
// CÁLCULO E RENDERIZAÇÃO DE TOTAIS (carrinho + checkout)
// =============================================================
var Eden = window.Eden || {};

Eden.pricing = (function () {
    const { getCart } = Eden.state;
    const { calcularDesconto, getCupomAtivo } = Eden.coupons;

    let freteAtual = 0;

    function setFrete(valor) {
        freteAtual = valor;
    }

    function getFrete() {
        return freteAtual;
    }

    function calcularSubtotal() {
        return getCart().reduce((soma, item) => soma + item.price * item.qty, 0);
    }

    /** formaPagamento: 'PIX' aplica 10% de desconto adicional sobre o valor já com cupom. */
    function calcularTotais(formaPagamento) {
        const subtotal = calcularSubtotal();
        const desconto = calcularDesconto(subtotal);
        const comDesconto = Math.max(0, subtotal - desconto);
        const descontoPix = formaPagamento === 'PIX' ? comDesconto * 0.10 : 0;
        const total = Math.max(0, comDesconto - descontoPix) + freteAtual;
        return { subtotal, desconto, comDesconto, descontoPix, frete: freteAtual, total };
    }

    /** Atualiza todo texto derivado do total: badge do carrinho, resumo do
     *  checkout e o texto do botão "Finalizar Compra". */
    function renderTotais() {
        const formaPagamento = document.querySelector('input[name="pagamento"]:checked')?.value;
        const { subtotal, desconto, descontoPix, total } = calcularTotais(formaPagamento);
        const cupom = getCupomAtivo();

        const totalCarrinho = document.getElementById('cart-total-value');
        if (totalCarrinho) totalCarrinho.innerText = `R$ ${Math.max(0, subtotal - desconto).toFixed(2)}`;

        const btn = document.getElementById('btn-finalizar');
        if (btn && !btn.disabled) btn.innerText = `FINALIZAR COMPRA • R$ ${total.toFixed(2)}`;

        const resumo = document.getElementById('resumo-valores');
        if (resumo) {
            let html = `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span></div>`;
            if (desconto > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#16a34a;"><span>Cupom (${cupom ? cupom.codigo : ''})</span><span>- R$ ${desconto.toFixed(2)}</span></div>`;
            if (descontoPix > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#16a34a;"><span>Desconto PIX (10%)</span><span>- R$ ${descontoPix.toFixed(2)}</span></div>`;
            if (freteAtual > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;"><span>Frete</span><span>R$ ${freteAtual.toFixed(2)}</span></div>`;
            resumo.innerHTML = html;
        }
    }

    return { setFrete, getFrete, calcularSubtotal, calcularTotais, renderTotais };
})();
