// =============================================================
// ESTADO DO CARRINHO + PERSISTÊNCIA (localStorage)
// =============================================================
// Toda mutação do carrinho passa pelas funções expostas em Eden.state,
// em vez de outro módulo mexer direto no array — centraliza onde o
// localStorage é sincronizado.
var Eden = window.Eden || {};

Eden.state = (function () {
    const STORAGE_KEY = 'eden_cart';
    let cart = [];

    function persistir() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            // Ex.: modo privado sem acesso a localStorage — segue sem persistir.
        }
    }

    function loadCart() {
        try {
            const salvo = localStorage.getItem(STORAGE_KEY);
            cart = salvo ? JSON.parse(salvo) : [];
        } catch (e) {
            cart = [];
        }
        return cart;
    }

    function getCart() {
        return cart;
    }

    function addItem(produto, tamanho, cor) {
        const existente = cart.find(i => i.id === produto.id && i.size === tamanho && i.color === cor);
        if (existente) {
            existente.qty += 1;
        } else {
            cart.push({ id: produto.id, name: produto.nome, price: produto.preco, size: tamanho, color: cor, qty: 1 });
        }
        persistir();
    }

    function changeQty(index, delta) {
        if (!cart[index]) return;
        cart[index].qty += delta;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        persistir();
    }

    function removeItem(index) {
        if (!cart[index]) return;
        cart.splice(index, 1);
        persistir();
    }

    /** Usado na revalidação de estoque no checkout: ajusta a quantidade ao que
     *  realmente está disponível no banco, removendo o item se acabou. */
    function adjustItemStock(index, quantidadeDisponivel) {
        if (!cart[index]) return;
        if (quantidadeDisponivel <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].qty = quantidadeDisponivel;
        }
        persistir();
    }

    /** Usado no checkout para sempre gravar o preço real vindo do banco. */
    function updateItemPrice(index, preco) {
        if (!cart[index]) return;
        cart[index].price = preco;
        persistir();
    }

    function clearCart() {
        cart.length = 0;
        persistir();
    }

    return { loadCart, getCart, addItem, changeQty, removeItem, adjustItemStock, updateItemPrice, clearCart };
})();
