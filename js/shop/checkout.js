// =============================================================
// CEP, CUPOM E FINALIZAÇÃO DO PEDIDO
// =============================================================
var Eden = window.Eden || {};

Eden.checkout = (function () {
    const supabase = Eden.config.supabase;
    const { getCart, clearCart, adjustItemStock, updateItemPrice } = Eden.state;

    let cidadeAtual = '';

    function formatarCEP(input) {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
        input.value = v;
    }

    async function buscaCEP(cep) {
        const v = cep.replace(/\D/g, '');
        if (v.length !== 8) return;
        try {
            const r = await fetch(`https://viacep.com.br/ws/${v}/json/`);
            const d = await r.json();
            if (d.erro) { Eden.ui.showToast('CEP não encontrado', 'error'); return; }

            cidadeAtual = `${d.localidade} - ${d.uf}`;
            document.getElementById('rua').value = `${d.logradouro}, ${d.bairro}`;

            const secaoFrete = document.getElementById('secao-frete');
            secaoFrete.style.display = 'flex';

            const valorFrete = (v.startsWith('563') || v.startsWith('489')) ? 10.00 : 35.00;
            Eden.pricing.setFrete(valorFrete);
            document.getElementById('label-frete').innerText = valorFrete === 10 ? 'Entrega Local (Petrolina/Juazeiro)' : 'Envio Nacional';
            document.getElementById('valor-frete').innerText = `R$ ${valorFrete.toFixed(2)}`;

            Eden.pricing.renderTotais();
            document.getElementById('numero').focus();
        } catch (e) {
            Eden.ui.showToast('Erro ao buscar CEP', 'error');
        }
    }

    async function aplicarCupom() {
        const input = document.getElementById('input-cupom');
        const resultado = await Eden.coupons.aplicarCupom(input.value);

        if (resultado.ok) {
            document.getElementById('cupom-container').style.display = 'none';
            document.getElementById('cupom-feedback').style.display = 'flex';
            document.getElementById('texto-cupom-aplicado').innerText = `CUPOM ${resultado.cupom.codigo} APLICADO`;
            Eden.cartUi.updateCartUI();
            Eden.ui.showToast(`Cupom ${resultado.cupom.codigo} aplicado!`);
        } else {
            Eden.ui.showToast(resultado.mensagem, 'error');
            input.value = '';
        }
    }

    function removerCupom() {
        Eden.coupons.removerCupom();
        document.getElementById('cupom-container').style.display = 'flex';
        document.getElementById('cupom-feedback').style.display = 'none';
        document.getElementById('input-cupom').value = '';
        Eden.cartUi.updateCartUI();
    }

    function checkout() {
        if (getCart().length === 0) return Eden.ui.showToast('Sua sacola está vazia!', 'error');
        Eden.ui.showView('checkout-view');
    }

    function resetarBotaoFinalizar(btn) {
        if (!btn) return;
        btn.innerHTML = 'FINALIZAR COMPRA';
        btn.disabled = false;
        Eden.pricing.renderTotais();
    }

    async function finalizarCompra(event) {
        if (event) event.preventDefault();
        const cart = getCart();
        if (cart.length === 0) return Eden.ui.showToast('Sua sacola está vazia!', 'error');

        const btn = document.getElementById('btn-finalizar');
        const nome = document.getElementById('nome').value;
        const cep = document.getElementById('cep').value;
        const rua = document.getElementById('rua').value;
        const numero = document.getElementById('numero').value;
        const pagInput = document.querySelector('input[name="pagamento"]:checked');

        if (!nome || !numero || !cep || !pagInput) return Eden.ui.showToast('Preencha todos os dados', 'error');
        const pagamento = pagInput.value;

        if (btn) { btn.innerHTML = '<span class="animate-spin" style="margin-right:6px;">⟳</span> PROCESSANDO...'; btn.disabled = true; }

        try {
            // Revalida estoque e preço direto do banco (nunca confia no que está no localStorage/cliente).
            for (let i = 0; i < cart.length; i++) {
                const item = cart[i];
                const { data: p } = await supabase.from('produtos').select('estoque, preco').eq('id', item.id).single();
                if (!p || p.estoque < item.qty) {
                    Eden.ui.showToast(`"${item.name}" não tem estoque suficiente. Ajustamos sua sacola.`, 'error');
                    adjustItemStock(i, p ? p.estoque : 0);
                    Eden.cartUi.updateCartUI();
                    resetarBotaoFinalizar(btn);
                    return;
                }
                updateItemPrice(i, p.preco);
            }

            // Baixa de estoque: uma chamada por item de linha, já com a
            // quantidade (a função RPC decrementar_estoque aceita
            // "quantidade" — ver supabase/schema.sql). Antes disso era
            // uma chamada por unidade, o que multiplicava round-trips
            // desnecessariamente em carrinhos com quantidades maiores.
            for (const item of cart) {
                const { error: errDecrement } = await supabase.rpc('decrementar_estoque', { produto_id: item.id, quantidade: item.qty });
                if (errDecrement) {
                    Eden.ui.showToast('Um dos produtos esgotou durante o processo. Recarregue a sacola.', 'error');
                    resetarBotaoFinalizar(btn);
                    return;
                }
            }

            const { subtotal, desconto, descontoPix, total: totalFinal } = Eden.pricing.calcularTotais(pagamento);
            const cupom = Eden.coupons.getCupomAtivo();

            await supabase.from('pedidos').insert([{
                nome, cep, rua, numero, cidade: cidadeAtual, total: totalFinal, pagamento, itens_json: cart, status: 'aguardando_whatsapp'
            }]);

            let msg = `*NOVO PEDIDO - ÉDEN*\n\n*CLIENTE:* ${nome}\n*CIDADE:* ${cidadeAtual}\n*ENDEREÇO:* ${rua}, nº ${numero}\n\n*ITENS:*\n`;
            cart.forEach(i => { msg += `- ${i.qty}x ${i.name} (${i.color}/${i.size}) — R$ ${(i.price * i.qty).toFixed(2)}\n`; });
            if (desconto > 0) msg += `\n*CUPOM:* ${cupom ? cupom.codigo : ''} (-R$ ${desconto.toFixed(2)})`;
            if (descontoPix > 0) msg += `\n*DESCONTO PIX:* -R$ ${descontoPix.toFixed(2)}`;
            msg += `\n*FRETE:* R$ ${Eden.pricing.getFrete().toFixed(2)}`;
            msg += `\n\n*TOTAL: R$ ${totalFinal.toFixed(2)}*\n*PAGAMENTO:* ${pagamento}`;

            window.location.href = `https://wa.me/5587988501105?text=${encodeURIComponent(msg)}`;

            clearCart();
            Eden.cartUi.updateCartUI();
            document.getElementById('order-form').reset();
            removerCupom();
            Eden.ui.showView('shop-view');
            Eden.products.carregarProdutos();

        } catch (err) {
            Eden.ui.showToast('Erro ao processar pedido', 'error');
            resetarBotaoFinalizar(btn);
        }
    }

    return { formatarCEP, buscaCEP, aplicarCupom, removerCupom, checkout, finalizarCompra };
})();
