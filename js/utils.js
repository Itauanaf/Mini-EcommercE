// =============================================================
// UTILITÁRIOS COMPARTILHADOS (loja + painel admin)
// =============================================================
var Eden = window.Eden || {};

Eden.utils = (function () {

    /**
     * Escapa texto antes de inserir via innerHTML, evitando que um nome de
     * produto/cliente com HTML/script vire XSS armazenado. Use sempre que
     * um valor vindo do banco for interpolado em um template de string.
     */
    function escapeHtml(valor) {
        if (valor === null || valor === undefined) return '';
        return String(valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Formata um número como moeda BRL simples: 19.9 -> "R$ 19,90". */
    function formatarBRL(valor) {
        const numero = Number(valor) || 0;
        return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /** Converte "P, M ,G,GG" em ["P","M","G","GG"], removendo espaços e vazios. */
    function listaSeparadaPorVirgula(texto) {
        return String(texto || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    return { escapeHtml, formatarBRL, listaSeparadaPorVirgula };
})();
