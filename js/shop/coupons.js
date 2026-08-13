// =============================================================
// CUPONS DE DESCONTO
// =============================================================
// Antes os cupons ficavam num objeto hardcoded no JS do cliente — para
// mudar um cupom era preciso editar código e reimplantar o site. Agora
// eles vêm da tabela `cupons` no Supabase (ver supabase/schema.sql) e
// podem ser criados/editados pelo painel admin sem tocar em código.
var Eden = window.Eden || {};

Eden.coupons = (function () {
    const supabase = Eden.config.supabase;
    let cupomAtivo = null; // { codigo, tipo: 'percentual'|'fixo', valor }

    function getCupomAtivo() {
        return cupomAtivo;
    }

    async function aplicarCupom(codigoDigitado) {
        const codigo = String(codigoDigitado || '').toUpperCase().trim();
        if (!codigo) return { ok: false, mensagem: 'Digite um cupom.' };

        const { data, error } = await supabase
            .from('cupons')
            .select('codigo, tipo, valor')
            .eq('codigo', codigo)
            .eq('ativo', true)
            .maybeSingle();

        if (error || !data) {
            return { ok: false, mensagem: 'Cupom inválido.' };
        }

        cupomAtivo = data;
        return { ok: true, cupom: data };
    }

    function removerCupom() {
        cupomAtivo = null;
    }

    /** Calcula o valor do desconto (em R$) para um dado subtotal. */
    function calcularDesconto(subtotal) {
        if (!cupomAtivo) return 0;
        if (cupomAtivo.tipo === 'percentual') {
            return subtotal * (Number(cupomAtivo.valor) / 100);
        }
        return Math.min(Number(cupomAtivo.valor), subtotal);
    }

    return { getCupomAtivo, aplicarCupom, removerCupom, calcularDesconto };
})();
