# ManusMotos

Monorepo do app web **ManusMotos**: Angular 19.2 + PrimeNG 19 + Tailwind 4 + Supabase, com npm workspaces.

> App **mobile-first**, com o **iPhone 8 (375×667, Safari iOS 16)** como aparelho de referência. Convenções de arquitetura e layout: veja
> [`CLAUDE.md`](CLAUDE.md).

## Estrutura

```
.
├── apps/
│   └── web/                      # Front-end Angular 19.2 (NgModules, PrimeNG 19, Tailwind 4)
│       └── src/
│           ├── app/
│           │   ├── components/       # Componentes globais (ComponentsModule)
│           │   ├── services/         # SupabaseService, TemaService
│           │   ├── utils/            # _metodos, _models, _pipes, _enums…
│           │   ├── modules/          # common/ (base, home), configuracoes/ e um módulo por domínio
│           │   ├── app.module.ts
│           │   └── app-routing.module.ts
│           └── environments/         # development (local), homolog, produção
├── packages/
│   └── shared/                   # @manus/shared — tipos do banco + modelos de domínio
│       └── src/
│           ├── database.types.ts     # GERADO por `npm run db:types`
│           └── models.ts             # Aliases (DesignSettings…)
├── supabase/
│   ├── config.toml               # Config do Supabase local
│   ├── migrations/               # Migrations SQL versionadas
│   ├── seed.sql                  # Dados de dev (rodado no db:reset)
│   └── functions/                # Edge Functions (Deno)
│       ├── _shared/
│       └── hello/
├── tsconfig.base.json            # Config TS compartilhada + path alias @manus/shared
└── package.json                  # Workspaces + scripts
```

## Pré-requisitos

- Node **22** (`nvm use`, veja `.nvmrc`)
- Docker (para o Supabase local)

## Primeiros passos

```bash
nvm use
npm install
npm run db:start        # sobe Postgres, Auth, Storage, Studio… (1ª vez baixa as imagens)
npm start               # http://localhost:4200
```

- Studio local: http://127.0.0.1:54323
- O app ainda não tem login: tudo roda com a chave pública (papel `anon`).

## Scripts

| Script                         | O que faz                                            |
| ------------------------------ | ---------------------------------------------------- |
| `npm start`                    | Dev server do Angular                                |
| `npm run build`                | Build de produção (`apps/web/dist`)                  |
| `npm test`                     | Testes (Karma + Jasmine)                             |
| `npm run typecheck`            | Checagem de tipos em todos os workspaces             |
| `npm run format`               | Prettier no repo inteiro                             |
| `npm run db:start` / `db:stop` | Sobe/derruba o Supabase local                        |
| `npm run db:status`            | Mostra URLs e chaves locais                          |
| `npm run db:reset`             | Recria o banco local: migrations + seed              |
| `npm run db:migration <nome>`  | Cria uma migration vazia                             |
| `npm run db:diff <nome>`       | Gera migration a partir de mudanças feitas no Studio |
| `npm run db:types`             | Regenera `packages/shared/src/database.types.ts`     |
| `npm run db:push`              | Aplica as migrations no projeto remoto               |
| `npm run functions:serve`      | Roda as Edge Functions localmente                    |
| `npm run functions:deploy`     | Publica as Edge Functions                            |

## Fluxo de mudança no banco

1. `npm run db:migration add_motos` e escreva o SQL (sempre com **RLS** + policies).
2. `npm run db:reset` para aplicar localmente.
3. `npm run db:types` para atualizar os tipos.
4. Adicione aliases em `packages/shared/src/models.ts` e use no front com `import type { … } from '@manus/shared'`.

## Projeto remoto (Supabase Cloud)

```bash
cp .env.example .env            # preencha; .env é ignorado pelo git
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npm run db:push
npm run db:types:remote
```

Depois preencha `apps/web/src/environments/environment.ts` com a URL e a publishable/anon key do projeto. **Nunca** use a
`service_role`/secret key no front-end.

## Deploy (Vercel)

O deploy usa o `vercel.json` da raiz e **sempre aponta para o Supabase de produção** (`jirabjimylbuizgxxhcj`), inclusive nos preview
deployments. O comando de build da Vercel é `npm run build:vercel`, que roda `scripts/verificar-ambiente-producao.mjs` antes do `ng build`:
o deploy falha se `environment.ts` não for o de produção (URL base `https://jirabjimylbuizgxxhcj.supabase.co`, sem `/rest/v1`, e chave
`sb_publishable_…`).

1. **Banco de produção**: aplique as migrations (o `seed.sql` não vai para produção; a linha `design_settings id = 1` vem da migration):

   ```bash
   npx supabase login
   npx supabase link --project-ref jirabjimylbuizgxxhcj
   npm run db:push
   ```

2. **Vercel** → _Add New… → Project_ → importe o repositório do GitHub.
   - **Root Directory**: a raiz do repo (não `apps/web`: o build precisa dos workspaces e do `@manus/shared`).
   - Framework, install, build e output vêm do `vercel.json`; não sobrescreva no painel. Nenhuma variável de ambiente é necessária (a
     publishable key é pública por design; a segurança vem do RLS).
   - Node 22 é lido de `engines` no `package.json`.
3. Cada push na `main` gera um deploy de produção; outras branches geram previews (também com o banco de produção).

Pelo CLI: `npm i -g vercel && vercel` (preview) ou `vercel --prod`.

| Arquivo                                    | Papel                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `vercel.json`                              | Build, pasta de saída (`apps/web/dist/web/browser`), fallback SPA, cache, headers |
| `scripts/verificar-ambiente-producao.mjs`  | Barra o deploy se o environment não apontar para o Supabase de produção           |
| `apps/web/src/environments/environment.ts` | URL e publishable key de produção                                                 |

Para checar localmente: `npm run build:vercel`.
