// =============================================================
// UI GERAL: toast, barra de anúncios, navegação entre views, header
// =============================================================
var Eden = window.Eden || {};

Eden.ui = (function () {

    function showToast(mensagem, tipo = 'success') {
        const old = document.getElementById('eden-toast');
        if (old) old.remove();
        const t = document.createElement('div');
        t.id = 'eden-toast';
        t.style.cssText = `position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(16px);z-index:9999;display:flex;align-items:center;gap:10px;padding:1rem 1.5rem;border-radius:1rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 8px 32px rgba(0,0,0,0.18);${tipo === 'success' ? 'background:#000;color:#fff;' : 'background:#ef4444;color:#fff;'}`;
        t.innerHTML = tipo === 'success' ? `<i class="bi bi-check-circle-fill"></i> ${mensagem}` : `<i class="bi bi-x-circle-fill"></i> ${mensagem}`;
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(16px)'; setTimeout(() => t.remove(), 400); }, 2500);
    }

    const ANUNCIOS = [
        'FRETE FIXO PARA PETROLINA & JUAZEIRO',
        'PARCELE EM ATÉ 3X SEM JUROS',
        'PEÇAS EXCLUSIVAS & LIMITADAS',
        "CUPOM 'EDEN10' NA PRIMEIRA COMPRA"
    ];
    let anuncioAtual = 0;

    function iniciarAnuncios() {
        setInterval(() => {
            const el = document.getElementById('texto-anuncio');
            if (!el) return;
            el.style.opacity = '0';
            el.style.transform = 'translateY(5px)';
            setTimeout(() => {
                anuncioAtual = (anuncioAtual + 1) % ANUNCIOS.length;
                el.innerText = ANUNCIOS[anuncioAtual];
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 700);
        }, 5000);
    }

    function toggleBusca() {
        const box = document.getElementById('busca-container');
        const input = document.getElementById('input-busca');
        const aberto = box.style.maxHeight !== '0px' && box.style.maxHeight !== '';
        if (aberto) {
            box.style.maxHeight = '0';
            input.value = '';
            input.dispatchEvent(new Event('input'));
        } else {
            box.style.maxHeight = '70px';
            setTimeout(() => input.focus(), 300);
        }
    }

    function showView(viewId) {
        const cartView = document.getElementById('cart-view');
        const overlay = document.getElementById('cart-overlay');
        const shop = document.getElementById('shop-view');
        const checkoutView = document.getElementById('checkout-view');

        if (viewId === 'cart-view') {
            cartView.classList.add('cart-open');
            overlay.classList.add('visible');
            document.body.style.overflow = 'hidden';
            return;
        }

        // Fecha o carrinho sempre que navegar para outra view.
        cartView.classList.remove('cart-open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';

        if (viewId === 'shop-view') {
            shop.style.display = '';
            checkoutView.style.display = 'none';
            return;
        }

        if (viewId === 'checkout-view') {
            shop.style.display = 'none';
            checkoutView.style.display = 'block';
            window.scrollTo(0, 0);
        }
    }

    function iniciarScrollHeader() {
        window.addEventListener('scroll', () => {
            const header = document.getElementById('main-header');
            const logo = document.querySelector('.brand-logo');
            if (!header || !logo) return;
            if (window.scrollY > 50) {
                header.style.paddingTop = '10px';
                header.style.paddingBottom = '10px';
                logo.style.fontSize = '1.3rem';
            } else {
                header.style.paddingTop = '20px';
                header.style.paddingBottom = '20px';
                logo.style.fontSize = '1.8rem';
            }
        });
    }

    return { showToast, iniciarAnuncios, toggleBusca, showView, iniciarScrollHeader };
})();
