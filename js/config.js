// =============================================================
// CONFIGURAÇÃO CENTRAL DO SUPABASE
// =============================================================
// Fonte única da URL/chave do projeto — index.js e admin.js antes
// duplicavam essas constantes, o que criava risco de ficarem
// dessincronizadas ao trocar de projeto Supabase.
//
// A "anon key" é uma chave pública por desenho do Supabase (o
// acesso real é controlado pelas políticas de RLS no banco, ver
// supabase/schema.sql). Nunca coloque aqui a "service_role key" —
// essa sim é secreta e nunca deve rodar no navegador.
//
// Carregado como <script> clássico (não type="module") de propósito:
// o projeto não usa bundler e precisa continuar funcionando quando o
// HTML é aberto direto do disco (file://), onde o navegador bloqueia
// módulos ES por segurança. Por isso cada arquivo em js/ pendura suas
// funções públicas no namespace global `Eden` em vez de usar
// import/export — ver a ordem das tags <script> em index.html/admin.html.
var Eden = window.Eden || {};

Eden.config = (function () {
    const SB_URL = 'https://sfgbwdeochbvqabtjdbf.supabase.co';
    const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZ2J3ZGVvY2hidnFhYnRqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA5NTQsImV4cCI6MjA4NTMxNjk1NH0.wDBUHJUnHJCS1LNzNPVs9PUEp0EYKUYFOZiKDArpfJU';

    return {
        supabase: window.supabase.createClient(SB_URL, SB_ANON_KEY)
    };
})();
