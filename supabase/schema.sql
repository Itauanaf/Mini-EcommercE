-- =============================================================
-- ÉDEN STORE — ESQUEMA DO BANCO (Supabase / PostgreSQL)
-- =============================================================
-- Este arquivo é IDEMPOTENTE: pode ser executado várias vezes sem
-- destruir dados existentes (usa IF NOT EXISTS / CREATE OR REPLACE).
--
-- COMO APLICAR:
--   1. Abra o painel do Supabase do projeto -> SQL Editor.
--   2. Cole o conteúdo deste arquivo inteiro e clique em "Run".
--
-- ⚠️ MIGRAÇÃO NECESSÁRIA a partir desta versão do front-end:
--   - A função decrementar_estoque() passou a aceitar uma
--     quantidade (antes só decrementava 1 unidade por chamada).
--   - Nova tabela `cupons` substitui a lista de cupons que antes
--     ficava hardcoded no JavaScript do cliente.
--   - Nova coluna `produtos.ativo` permite ocultar um produto da
--     loja sem apagá-lo (usado pelo painel administrativo).
-- Sem rodar este script, o checkout do site vai falhar.
-- =============================================================

-- -------------------------------------------------------------
-- EXTENSÕES
-- -------------------------------------------------------------
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- TABELA: produtos
-- -------------------------------------------------------------
create table if not exists public.produtos (
    id          uuid primary key default gen_random_uuid(),
    nome        text not null,
    preco       numeric(10,2) not null check (preco >= 0),
    estoque     integer not null default 0 check (estoque >= 0),
    imagem_url  text not null,
    tamanhos    text not null default 'P,M,G,GG',
    cores       text not null default 'Única',
    ativo       boolean not null default true,
    created_at  timestamptz not null default now()
);

-- Colunas novas em bancos já existentes (não quebra instalações antigas)
alter table public.produtos add column if not exists ativo boolean not null default true;

comment on table public.produtos is 'Catálogo de produtos da loja.';
comment on column public.produtos.tamanhos is 'Lista separada por vírgula, ex: "P,M,G,GG".';
comment on column public.produtos.cores is 'Lista separada por vírgula, ex: "Preto,Branco".';
comment on column public.produtos.ativo is 'Quando false, o produto fica oculto na loja sem ser excluído.';

-- -------------------------------------------------------------
-- TABELA: pedidos
-- -------------------------------------------------------------
create table if not exists public.pedidos (
    id          uuid primary key default gen_random_uuid(),
    nome        text not null,
    cep         text,
    rua         text,
    numero      text,
    cidade      text,
    total       numeric(10,2) not null default 0,
    pagamento   text,
    itens_json  jsonb not null default '[]'::jsonb,
    status      text not null default 'aguardando_whatsapp',
    created_at  timestamptz not null default now(),
    constraint pedidos_status_check check (
        status in ('aguardando_whatsapp', 'confirmado', 'enviado', 'entregue', 'cancelado')
    )
);

comment on table public.pedidos is 'Pedidos realizados pela loja; o pagamento é combinado manualmente via WhatsApp.';

-- -------------------------------------------------------------
-- TABELA: cupons
-- -------------------------------------------------------------
create table if not exists public.cupons (
    id          uuid primary key default gen_random_uuid(),
    codigo      text not null unique,
    tipo        text not null check (tipo in ('percentual', 'fixo')),
    valor       numeric(10,2) not null check (valor >= 0),
    ativo       boolean not null default true,
    created_at  timestamptz not null default now()
);

comment on table public.cupons is 'Cupons de desconto. tipo=percentual usa valor como % (ex: 10 = 10%); tipo=fixo usa valor em R$.';

-- Dados equivalentes aos cupons que antes viviam hardcoded no front-end
insert into public.cupons (codigo, tipo, valor)
values
    ('EDEN10', 'percentual', 10),
    ('PRIMEIRACOMPRA', 'percentual', 15),
    ('OFF20', 'fixo', 20)
on conflict (codigo) do nothing;

-- -------------------------------------------------------------
-- FUNÇÃO: decrementar_estoque
-- Agora aceita quantidade (default 1, compatível com chamadas antigas)
-- e nunca deixa o estoque ficar negativo.
-- -------------------------------------------------------------
create or replace function public.decrementar_estoque(produto_id uuid, quantidade integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.produtos
       set estoque = estoque - quantidade
     where id = produto_id
       and estoque >= quantidade;

    if not found then
        raise exception 'Estoque insuficiente para o produto %', produto_id;
    end if;
end;
$$;

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Público (anon) pode: ler produtos ativos, ler cupons ativos,
-- criar pedidos. Qualquer escrita em produtos/cupons e leitura/edição
-- de pedidos exige um usuário autenticado (conta de admin criada no
-- Supabase Auth, usada pelo admin.html).
-- -------------------------------------------------------------
alter table public.produtos enable row level security;
alter table public.pedidos  enable row level security;
alter table public.cupons   enable row level security;

drop policy if exists "produtos_select_publico" on public.produtos;
create policy "produtos_select_publico" on public.produtos
    for select using (true);
    -- (leitura liberada geral; a loja já filtra ativo=true na consulta.
    --  Se quiser esconder de fato produtos inativos de qualquer client
    --  anônimo, troque "using (true)" por "using (ativo = true or auth.role() = 'authenticated')".)

drop policy if exists "produtos_admin_all" on public.produtos;
create policy "produtos_admin_all" on public.produtos
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "pedidos_insert_publico" on public.pedidos;
create policy "pedidos_insert_publico" on public.pedidos
    for insert with check (true);

drop policy if exists "pedidos_admin_select" on public.pedidos;
create policy "pedidos_admin_select" on public.pedidos
    for select using (auth.role() = 'authenticated');

drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update" on public.pedidos
    for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "pedidos_admin_delete" on public.pedidos;
create policy "pedidos_admin_delete" on public.pedidos
    for delete using (auth.role() = 'authenticated');

drop policy if exists "cupons_select_publico" on public.cupons;
create policy "cupons_select_publico" on public.cupons
    for select using (ativo = true or auth.role() = 'authenticated');

drop policy if exists "cupons_admin_write" on public.cupons;
create policy "cupons_admin_write" on public.cupons
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- ÍNDICES úteis para os dashboards do admin
-- -------------------------------------------------------------
create index if not exists idx_pedidos_created_at on public.pedidos (created_at desc);
create index if not exists idx_produtos_created_at on public.produtos (created_at desc);
