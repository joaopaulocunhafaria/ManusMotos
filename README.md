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
