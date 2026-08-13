// =============================================================
// RENDERIZAÇÃO DO CARRINHO (badge, lista de itens)
// =============================================================
var Eden = window.Eden || {};

Eden.cartUi = (function () {
    const { getCart, changeQty, removeItem } = Eden.state;
    const { escapeHtml } = Eden.utils;

    function updateCartUI() {
        renderBadge();
        renderList();
        Eden.pricing.renderTotais();
    }

    function renderBadge() {
        const badge = document.getElementById('cart-count');
        if (!badge) return;
        const totalQtd = getCart().reduce((s, i) => s + i.qty, 0);
        if (totalQtd === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
            badge.innerText = totalQtd;
            badge.style.transform = 'scale(1.3)';
            setTimeout(() => badge.style.transform = 'scale(1)', 200);
        }
    }

    function renderList() {
        const list = document.getElementById('cart-items-list');
        if (!list) return;
        const cart = getCart();

        if (cart.length === 0) {
            list.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 0;text-align:center;opacity:0.4;">
                    <i class="bi bi-bag-x" style="font-size:3rem;margin-bottom:1rem;"></i>
                    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3em;">Sua sacola está vazia</p>
                    <button type="button" data-action="ir-loja" style="margin-top:1.5rem;font-size:9px;text-decoration:underline;text-transform:uppercase;letter-spacing:0.2em;background:none;border:none;cursor:pointer;">Explorar Loja</button>
                </div>`;
            return;
        }

        list.innerHTML = cart.map((item, i) => `
            <div class="cart-item-enter" style="display:flex;align-items:center;gap:1rem;padding:1rem 0;border-bottom:1px solid #f8fafc;">
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <h4 style="font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:-0.01em;">${escapeHtml(item.name)}</h4>
                        <button type="button" data-action="remover" data-index="${i}" style="color:#cbd5e1;background:none;border:none;cursor:pointer;font-size:12px;padding:0 0 0 8px;">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <p style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:0.2em;margin-top:4px;">${escapeHtml(item.color)} — TAM ${escapeHtml(item.size)}</p>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                        <p style="font-weight:700;font-size:14px;">R$ ${(item.price * item.qty).toFixed(2)}</p>
                        <div style="display:flex;align-items:center;gap:10px;background:#f8fafc;border-radius:999px;padding:4px 10px;">
                            <button type="button" data-action="diminuir" data-index="${i}" style="background:none;border:none;cursor:pointer;font-size:14px;color:#334155;width:16px;">−</button>
                            <span style="font-size:12px;font-weight:700;min-width:14px;text-align:center;">${item.qty}</span>
                            <button type="button" data-action="aumentar" data-index="${i}" style="background:none;border:none;cursor:pointer;font-size:14px;color:#334155;width:16px;">+</button>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }

    // Listener único delegado — cobre os itens mesmo após re-renderizar a lista.
    document.getElementById('cart-items-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const index = Number(btn.dataset.index);
        switch (btn.dataset.action) {
            case 'aumentar': changeQty(index, 1); updateCartUI(); break;
            case 'diminuir': changeQty(index, -1); updateCartUI(); break;
            case 'remover': removeItem(index); updateCartUI(); break;
            case 'ir-loja': Eden.ui.showView('shop-view'); break;
        }
    });

    return { updateCartUI };
})();
