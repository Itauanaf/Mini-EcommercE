// =============================================================
// AUTENTICAÇÃO DO PAINEL (Supabase Auth)
// =============================================================
var Eden = window.Eden || {};

Eden.auth = (function () {
    const supabase = Eden.config.supabase;

    async function login(email, password) {
        return supabase.auth.signInWithPassword({ email, password });
    }

    async function logout() {
        await supabase.auth.signOut();
    }

    /** Resolve com a sessão atual (ou null) — usado para pular a tela de
     *  login quando o usuário já está autenticado (ex: F5 na página). */
    async function getSessao() {
        const { data } = await supabase.auth.getSession();
        return data.session;
    }

    return { login, logout, getSessao };
})();
