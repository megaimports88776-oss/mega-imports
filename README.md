# MEGAIMPORTS — loja virtual premium

Base inicial em Next.js + TypeScript + Supabase, com tema visual próprio e um endpoint inicial para receber webhooks da Asaas.

## Estado real desta entrega

**Implementado nesta base**
- Página inicial responsiva com identidade MEGAIMPORTS.
- Estrutura Next.js/TypeScript e variáveis de ambiente de exemplo.
- Migração SQL inicial para catálogo, perfis, endereços, pedidos, itens, favoritos, cupons, banners, configurações, auditoria e eventos Asaas.
- RLS ativado e políticas iniciais para limitar dados de clientes.
- Cliente servidor Supabase com cookies.
- Cliente HTTP da Asaas com seleção explícita entre Sandbox e produção.
- Endpoint de webhook com validação do header `asaas-access-token` e persistência idempotente pelo ID do evento.

**Ainda não implementado e não deve ser considerado pronto para produção**
- Cadastro/login, recuperação de senha e telas da área do cliente.
- CRUD administrativo e fluxo seguro de atribuição de função admin.
- Catálogo conectado ao banco, upload de imagens e gestão de estoque transacional.
- Checkout, cálculo de frete, criação de pedido e cobrança Asaas.
- Processamento de eventos de pagamento e transições de estado de pedido.
- Integração de CEP/frete, e-mail transacional, testes automatizados e deploy.

A página inicial contém produtos e preços ilustrativos para validar o design. Os botões de compra estão desabilitados de propósito; não há compra nem pagamento simulado.

## Requisitos

- Node.js LTS compatível com Next.js 15
- npm
- Projeto Supabase
- Conta Asaas Sandbox para integração durante o desenvolvimento

## Instalação no Windows (Prompt de Comando)

```bat
cd megaimports
copy .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

Preencha `.env.local` com os dados do projeto Supabase. Não compartilhe nem versiona esse arquivo.

## Supabase

1. Crie um projeto em https://database.new
2. No painel do projeto, obtenha Project URL e Publishable key.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Execute `supabase/migrations/0001_initial_schema.sql` no SQL Editor.
5. Configure Auth > URL Configuration com a URL local e, posteriormente, o domínio de produção.
6. Antes de publicar, revisar RLS e executar testes de autorização para cada tabela.

A `SUPABASE_SERVICE_ROLE_KEY` ignora RLS. Só pode ser usada no servidor, nunca em variáveis `NEXT_PUBLIC_` ou no navegador.

## Asaas

- Use primeiro o Sandbox: `ASAAS_ENV=sandbox`.
- `ASAAS_API_KEY` é uma chave de API privada do ambiente correspondente.
- `ASAAS_WEBHOOK_TOKEN` é um token de autenticação independente, definido ao configurar o webhook no Asaas (não reutilize a API Key).
- Endpoint preparado: `POST /api/asaas/webhook`.
- Configure a URL pública HTTPS do endpoint no painel Sandbox, API v3, enviando os eventos de pagamento necessários.
- O endpoint valida `asaas-access-token` e persiste eventos por ID único. O processamento comercial dos eventos ainda precisa ser implementado e testado antes de habilitar cobranças reais.

Documentação oficial:
- Visão geral: https://docs.asaas.com/docs/visao-geral
- Webhooks: https://docs.asaas.com/docs/sobre-os-webhooks
- Criar webhook pela API: https://docs.asaas.com/reference/create-new-webhook
- Supabase + Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

## Segurança / publicação

- Não comite `.env.local`.
- Não use credenciais reais no repositório.
- Não habilite produção até implementar e testar o processamento idempotente dos pagamentos, validação de valor/moeda/cobrança/pedido, transações de estoque e autorização administrativa.
- O endpoint webhook atual armazena eventos, mas **não marca pedidos como pagos**. Isso é intencional.
- Execute `npm run build` e os testes automatizados (ainda a criar) antes do deploy. Não declarar testes aprovados sem execução.
