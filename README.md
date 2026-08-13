# Éden Store

Loja virtual de blusas oversized com checkout finalizado via WhatsApp. Front-end estático (HTML/CSS/JS, sem build step) com [Supabase](https://supabase.com) como backend (banco de dados + autenticação do painel admin).

## Estrutura do projeto

```
├── index.html            # Loja (catálogo, carrinho, checkout)
├── admin.html            # Painel administrativo (pedidos, produtos, cupons)
├── css/
│   ├── shop.css          # Estilos específicos da loja
│   └── admin.css         # Estilos específicos do painel
├── js/
│   ├── config.js         # Cliente Supabase (URL + anon key), fonte única
│   ├── utils.js          # Helpers compartilhados (escapeHtml, formatarBRL...)
│   ├── shop/
│   │   ├── state.js          # Estado do carrinho + localStorage
│   │   ├── coupons.js        # Validação de cupom (lê a tabela `cupons`)
│   │   ├── pricing.js        # Cálculo de subtotal/desconto/frete/total
│   │   ├── products.js       # Busca e renderização do catálogo
│   │   ├── product-modal.js  # Modal de escolha de cor/tamanho
│   │   ├── cart-ui.js        # Renderização do carrinho lateral
│   │   ├── checkout.js       # CEP, cupom, finalização do pedido
│   │   ├── ui.js              # Toast, navegação entre views, header
│   │   └── main.js            # Ponto de entrada (liga tudo, registra eventos)
│   └── admin/
│       ├── auth.js        # Login/logout (Supabase Auth)
│       ├── orders.js      # Dashboard, status de pedido, export XLSX
│       ├── products.js    # CRUD do catálogo
│       ├── coupons.js     # CRUD de cupons
│       └── main.js        # Ponto de entrada (abas, bootstrap)
├── supabase/
│   └── schema.sql         # Tabelas, políticas de RLS e funções (idempotente)
└── assets/                # Imagens (banner)
```

Não há bundler nem `npm install`: Tailwind/Supabase/ícones vêm de CDN, e cada arquivo em `js/` é um `<script>` clássico (não `type="module"`) que pendura suas funções públicas num namespace global `Eden` (`Eden.state`, `Eden.products`, `Eden.checkout`...) em vez de usar `import`/`export`. Isso foi proposital: módulos ES nativos são bloqueados pelo navegador quando o HTML é aberto direto do disco (`file://`), e este projeto precisa continuar funcionando assim — **basta abrir `index.html`/`admin.html` clicando duas vezes**, sem precisar de servidor.

A ordem das tags `<script>` em `index.html`/`admin.html` importa: cada arquivo espera que o `Eden.*` de que depende já tenha carregado antes dele (ex.: `js/shop/pricing.js` precisa de `Eden.state` e `Eden.coupons`). Se adicionar um módulo novo, insira a tag na posição certa dessa cadeia.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). O script é idempotente (pode rodar de novo sem perder dados) e cria/atualiza:
   - tabela `produtos` (catálogo, com a coluna `ativo` para ocultar sem apagar);
   - tabela `pedidos` (com `status`: `aguardando_whatsapp`, `confirmado`, `enviado`, `entregue`, `cancelado`);
   - tabela `cupons` (cupons de desconto — antes viviam hardcoded no JS do cliente);
   - a função `decrementar_estoque(produto_id, quantidade)` — passou a aceitar quantidade em vez de só decrementar 1 por chamada;
   - políticas de Row Level Security (leitura pública de produtos/cupons ativos, escrita restrita a usuários autenticados, inserção pública de pedidos).
3. Em **Authentication**, crie o usuário administrador (e-mail/senha) que fará login em `admin.html`.
4. Copie a **Project URL** e a **anon public key** (Settings → API) para [`js/config.js`](js/config.js) — é a única cópia dessas credenciais no projeto.

> ⚠️ **Migração necessária ao atualizar um projeto existente**: sem rodar `schema.sql`, o checkout vai falhar (a função `decrementar_estoque` mudou de assinatura) e a aplicação de cupom também (agora lê da tabela `cupons`, que ainda não existe). A listagem de produtos na loja é tolerante — se a coluna `ativo` ainda não existir, ela trata todo produto como visível — mas o CRUD de produtos/cupons no admin depende do schema novo.

A **anon key** é pública por desenho do Supabase — a segurança real vem das políticas de RLS acima, não do sigilo da chave. Nunca coloque a `service_role key` no código do cliente.

## Painel administrativo (`admin.html`)

Três abas:

- **Pedidos** — métricas do mês, histórico completo, atualização de status por pedido e exportação de relatório profissional (`.xlsx` com resumo executivo + lista detalhada).
- **Produtos** — CRUD completo do catálogo: criar, editar, ocultar/mostrar na loja (sem apagar) e excluir.
- **Cupons** — CRUD dos cupons usados no checkout; mudanças valem na hora, sem precisar reimplantar o site.

## Modelo de dados (resumo)

| Tabela     | Campos principais                                                                 |
|------------|-------------------------------------------------------------------------------------|
| `produtos` | `nome`, `preco`, `estoque`, `imagem_url`, `tamanhos` (CSV), `cores` (CSV), `ativo`  |
| `pedidos`  | `nome`, `cep`, `rua`, `numero`, `cidade`, `total`, `pagamento`, `itens_json`, `status` |
| `cupons`   | `codigo`, `tipo` (`percentual`\|`fixo`), `valor`, `ativo`                           |

O pagamento em si é combinado manualmente pelo lojista via WhatsApp — o site não processa cartão/PIX diretamente; o `total` gravado é o que foi calculado no momento do pedido, mas o preço/estoque de cada item é sempre revalidado contra o banco no checkout antes de fechar o pedido (nunca confia no carrinho salvo no navegador).

## Notas de segurança aplicadas nesta reorganização

- Todo texto vindo do banco (nome de produto, nome de cliente, cor, etc.) passa por `escapeHtml` antes de entrar via `innerHTML`, tanto na loja quanto no admin — evita que um valor malicioso vire HTML/script executado (ex: um `itens_json` de pedido criado fora da UI).
- A baixa de estoque no checkout agora é uma chamada RPC por item de linha (com a quantidade), em vez de uma chamada por unidade.
- Credenciais do Supabase centralizadas em um único arquivo (`js/config.js`) em vez de duplicadas entre loja e admin.
