# CLAUDE.md

Guia para trabalhar neste repositório. Leia antes de criar ou alterar código.

## Visão geral

**ManusMotos** é um app web em monorepo (npm workspaces):

| Pasta             | O que é                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `apps/web`        | Front-end **Angular 19.2** (NgModules, zone.js, PrimeNG 19, Tailwind 4)    |
| `packages/shared` | `@manus/shared`: tipos do banco gerados pelo Supabase e modelos de domínio |
| `supabase/`       | Backend: `config.toml`, `migrations/`, `seed.sql`, `functions/` (Deno)     |

- Node **22** (`nvm use`; o Angular 19 não suporta Node 24+). npm 10.
- A stack e as convenções do front seguem o projeto `icismep_front_adm` (Angular 19.2). **Não atualize a versão do Angular** nem migre para
  APIs mais novas (standalone, `inject()`, `@if`/`@for`, zoneless, signal inputs) sem pedido explícito.

## 📱 Alvo principal: mobile, iPhone 8

O app vai ser publicado e usado **principalmente em celular**, com o **iPhone 8** como referência. Todo layout é **mobile-first** e precisa
funcionar bem nesse aparelho antes de qualquer outro.

**Características do iPhone 8**

- Viewport CSS: **375 × 667 px** (DPR 2). Sem notch, com barras do Safari ocupando parte da altura visível (~550 px úteis).
- Navegador: **Safari iOS 16** (a última versão disponível para o aparelho é a 16.7). O `.browserslistrc` mira `iOS >= 16.4`.
- Hardware antigo (A11, 2 GB RAM): CPU e memória limitadas.

**Regras de layout**

- Projete para **375 px de largura** primeiro. Use classes Tailwind sem prefixo para mobile e adicione `sm:`/`md:`/`lg:` só para melhorar em
  telas maiores. **Nunca** gere scroll horizontal na página.
- Uma coluna por padrão. Listagens em **cards** empilhados, não em tabelas largas. `p-table` só para telas maiores (`hidden md:block`), com
  a versão em cards para o mobile.
- **Alvos de toque ≥ 44 × 44 px** (`min-h-11`, `min-w-11`). Botões principais com largura total (`w-full`) em formulários.
- **Inputs com fonte ≥ 16 px.** Com menos, o Safari iOS dá zoom ao focar. O `styles.scss` já força isso; não sobrescreva.
- Use `inputmode`, `type` e `autocomplete` corretos (`email`, `tel`, `numeric`…) para abrir o teclado certo.
- Altura de tela: use as utilities `tela-cheia` (100dvh com fallback `100vh`). Não use `h-screen`/`100vh` puro em layout de página. Lembre
  que o teclado virtual reduz a área visível.
- Safe areas: `area-segura-topo` e `area-segura-base` (header/nav fixos). O `index.html` já usa `viewport-fit=cover`.
- Navegação principal pela **barra inferior** do `BaseComponent` (fácil de alcançar com o polegar). Ações destrutivas ou secundárias em
  menus/diálogos, não na barra.
- Diálogos/overlays do PrimeNG: prefira `p-drawer position="bottom"` ou `p-dialog` com `[style]="{ width: '100vw' }"` / `[breakpoints]` no
  mobile. Nada de largura fixa em px maior que 343 px (375 − 2×16).
- Margem lateral padrão de página: `px-4` (16 px).
- Hover não existe no toque: nunca esconda informação ou ação atrás de `:hover`/tooltip.

**Performance (aparelho fraco)**

- Tudo carregado sob demanda com `loadChildren`. Importe no módulo de cada página **só** os módulos PrimeNG que ela usa.
- Não adicione bibliotecas pesadas (charts, PDF, Excel, mapas) no bundle inicial. Se precisar, carregue com `import()` dinâmico dentro da
  feature.
- Imagens: `loading="lazy"`, dimensões explícitas, tamanhos adequados para tela 2x (não envie fotos de 4000 px).
- Paginação/scroll infinito em listagens; nunca busque tabelas inteiras do Supabase (`.range()`).
- Budget de produção: aviso em 800 kB no bundle inicial. Se estourar, investigue antes de subir o limite.

**Compatibilidade Safari 16**

- Evite APIs/CSS sem suporte no Safari 16.4: `:has()` com seletores complexos, View Transitions, `Array.prototype.toSorted` e similares de
  ES2023, `Promise.withResolvers`, CSS nesting fora do Sass, `@starting-style`, `popover`.
- Teste no viewport 375×667 (DevTools → iPhone SE/8). Para testar num iPhone real na rede local: `npm start` já escuta em `0.0.0.0`; acesse
  `http://<IP-da-máquina>:4200` e troque `127.0.0.1` pelo IP em `environment.development.ts`.

## Comandos

```bash
nvm use && npm install
npm run db:start          # Supabase local (Docker)
npm start                 # http://localhost:4200
npm run build             # produção  |  npm run build-homolog -w @manus/web
npm run build:vercel      # build do deploy (Vercel): valida que environment.ts aponta para o Supabase de produção
npm test                  # Karma (watch)  |  npm run test:ci -w @manus/web (headless)
npm run e2e               # Playwright: ponta a ponta no iPhone 8 (WebKit) contra o Supabase local
npm run db:test           # pgTAP: regras do banco (supabase/tests/database)
npm run test:tudo         # typecheck + Karma + pgTAP + E2E (critério de aceite)
npm run typecheck         # app + testes E2E
npm run format            # Prettier (também roda no pre-commit via husky + lint-staged)
npm run db:migration <nome> && npm run db:reset && npm run db:types
```

Para gerar artefatos Angular, rode o CLI dentro de `apps/web` (`npx ng g c ...`). Os schematics já usam `standalone: false` e `scss`.

## Arquitetura do front (`apps/web/src/app`)

```
app/
├── app.module.ts             # Módulo raiz: locale pt-BR, BRL, PrimeNG (TemaManusMotos), MessageService
├── app-routing.module.ts     # Rotas raiz → loadChildren por módulo
├── TemaManusMotos.ts         # Preset PrimeNG (definePreset(Aura, …))
├── components/               # Componentes reutilizáveis globais + ComponentsModule (declara e exporta)
├── services/                 # Serviços globais (SupabaseService, TemaService…)
├── utils/
│   ├── _constantes/  _enums/  _formularios/ (validadores)  _metodos/ (funções puras)
│   ├── _models/              # Interfaces/tipos globais (EstadoTela…)
│   └── _pipes/               # Pipes globais (brl, cpf, telefone…)
└── modules/
    ├── common/               # Telas comuns: base (layout com nav inferior), home…
    └── <dominio>/            # Um módulo por domínio de negócio, ex.: motos, clientes, servicos
        ├── <dominio>.module.ts / <dominio>-routing.module.ts / <dominio>.component.*   # shell, se houver
        ├── paginas/<pagina>/ # <pagina>.module.ts + <pagina>-routing.module.ts + componentes da página
        │   ├── listagem/  detalhe/  formulario/
        ├── _servicos/        # <dominio>-<recurso>.service.ts
        ├── _modelos/         # <nome>.model.ts (interfaces)
        ├── _enums/           # Labels: Record<string, string> e enums
        ├── _componentes/     # Componentes do domínio + <dominio>-componentes.module.ts
        └── _metodos/         # Funções puras do domínio
```

### Convenções (seguir sempre)

**Idioma**: código de domínio **em português**: nomes de classes, métodos, variáveis, rotas e pastas (`carregarMotos()`, `buscarPaginado()`,
`aoMudarFiltro()`, `abrirDetalhe()`, `/motos/:id`). Termos técnicos do Angular/bibliotecas ficam em inglês (`ngOnInit`, `canActivate`).
Textos de UI em pt-BR. Colunas do banco em inglês `snake_case` (como `design_settings.shop_name`), que é o padrão dos tipos gerados.

**NgModules (não standalone)**

- Todo componente, diretiva e pipe tem `standalone: false` e é **declarado em um NgModule**.
- Cada página = `<pagina>.module.ts` + `<pagina>-routing.module.ts` (`RouterModule.forChild`), carregada via `loadChildren` no routing do
  domínio. O routing raiz só aponta para módulos.
- Componentes compartilhados de um domínio ficam em `_componentes/` com seu próprio `*-componentes.module.ts` que os exporta; os globais
  ficam em `components/` (`ComponentsModule`).
- Cada módulo importa explicitamente os módulos PrimeNG que usa (`ButtonModule`, `CardModule`, …).

**Componentes**

- Arquivos: `nome.component.ts|html|scss` (scss só se necessário; prefira Tailwind). Seletor com prefixo `app-`.
- Injeção de dependência **pelo construtor** (`constructor(private xService: XService) {}`), não `inject()`.
- Estado da tela em **signals** (`public contratos = signal<Contrato[]>([])`, `.set()`), membros com modificador explícito
  (`public`/`private`, `readonly` quando couber).
- `@Input()`/`@Output()` com decorators (`@Input({ required: true })`, `EventEmitter`).
- Templates com `*ngIf`/`*ngFor`/`[ngSwitch]` (padrão do projeto de referência).
- Estado de carregamento padronizado com `EstadoTela` (`'carregando' | 'carregado' | 'vazio' | 'erro'`) e o componente
  `<app-estado [modo]="estado()" (recarregar)="...">`.
- Formulários **reativos** com `FormBuilder` criados no construtor; validadores customizados em `utils/_formularios`.
- Busca com digitação: debounce de 500 ms (`setTimeout`/`clearTimeout` ou `debounceTime`).
- Feedback ao usuário com `MessageService` (toast `top-center`, já no `AppComponent`).

**Serviços e Supabase**

- `@Injectable({ providedIn: 'root' })`, nome `<recurso>.service.ts` / `<Recurso>Service`, métodos em português: `buscarPaginado`,
  `buscarPorId`, `criar`, `atualizar`, `excluir`.
- **Acesso ao banco só via serviços**, nunca direto no componente. Use o cliente tipado de `SupabaseService.client`.
- Os serviços retornam **`Observable<T>`**. Envolva as chamadas do Supabase com `deSupabase()` (`utils/_metodos/supabase.ts`), que lança o
  `error`. Os componentes consomem com `.subscribe({ next, error })`, como no projeto de referência.
- Mensagens de erro com `mensagemErro(erro, 'texto padrão')`.
- Tipos de linha vêm de `@manus/shared` (`Tables<'x'>` ou aliases em `packages/shared/src/models.ts`); não redeclare interfaces que espelham
  tabelas. Modelos que não são tabela (DTOs, view models) vão em `_modelos/*.model.ts`.
- Paginação: `.range(pagina * quantidade, (pagina + 1) * quantidade - 1)` com `{ count: 'exact' }`.

**Autenticação**: o app **não tem login, usuários nem papéis** por enquanto. O front usa só a chave pública (papel `anon`), sem guards. Se a
autenticação voltar, guards serão classes `@Injectable({ providedIn: 'root' }) implements CanActivate`.

**Estilo**: Tailwind 4 (via `@tailwindcss/postcss`) para layout, mais componentes PrimeNG 19. Cores globais como variáveis CSS em `:root` no
`styles.scss` (`var(--cor-primaria)`, `var(--cor-borda)`); a paleta do PrimeNG fica em `TemaManusMotos.ts`. Ícones: `primeicons`
(`pi pi-*`).

**Formatação**: Prettier com **tabs (largura 3)**, `printWidth` 140, aspas simples, trailing commas e `prettier-plugin-tailwindcss` (ordena
classes). Pre-commit roda lint-staged. Não reformate arquivos fora do escopo da mudança.

**Testes unitários**: Karma + Jasmine (`*.spec.ts` ao lado do arquivo). Declare o componente em `declarations` no `TestBed`. Veja também a
seção **Testes de ponta a ponta**, que é critério de aceite.

**Ambientes**: `environment.ts` (produção), `environment.homolog.ts`, `environment.development.ts` (Supabase local), trocados por
`fileReplacements` no `angular.json`.

**Deploy**: Vercel, configurado em `vercel.json` (raiz do repo, build `npm run build:vercel`, saída `apps/web/dist/web/browser`, fallback
SPA). Todo deploy, inclusive preview, usa o Supabase de **produção**; `scripts/verificar-ambiente-producao.mjs` barra o build se o
`environment.ts` mudar. A `supabaseUrl` é a URL **base** do projeto (sem `/rest/v1`). Passo a passo no `README.md`.

## ✅ Testes de ponta a ponta: critério de aceite

**Toda funcionalidade só está pronta quando tem testes que validam, de ponta a ponta, tudo o que foi desenvolvido.** Sem esses testes (ou
com algum falhando), a tarefa **não** está concluída. Isso vale para funcionalidade nova, mudança de comportamento e correção de bug.

Cada funcionalidade precisa de testes para:

1. **Rota padrão e navegação**: a URL da tela abre o que deve; redirecionamentos (`/`, rotas antigas, rota inexistente); link na barra
   inferior; botão voltar; parâmetros de URL (válidos, inválidos, ausentes); ID inexistente mostra o estado de erro.
2. **Caminho feliz completo**: o fluxo principal pela tela, do início ao fim, conferindo **o que foi gravado no banco** (não só a mensagem
   de sucesso) e o que aparece depois (listagem, detalhe).
3. **Casos de borda, um teste por caso**: pense em cada um antes de codar e escreva um teste para cada. No mínimo:
   - campos obrigatórios vazios e **só com espaços**; tamanhos máximos; formatos inválidos (CPF/CNPJ, telefone, placa, datas);
   - valores-limite (zero, negativo, igual ao limite, um acima do limite: ex. entrada = total é válida, entrada > total não);
   - duplicidade (registros únicos) e mensagens claras para o usuário;
   - exclusão de registro em uso (FK), confirmação de ações destrutivas e cancelamento da confirmação;
   - transações: falha no meio **não** pode deixar dado gravado pela metade;
   - busca: sem resultado, termos parciais, com máscara, maiúsculas/minúsculas, caracteres especiais (`%`, `_`), debounce;
   - paginação ("carregar mais") e listas vazias;
   - estados de carregando/vazio/erro;
   - comportamento mobile: sem scroll horizontal em 375 px, alvos de toque ≥ 44 px, inputs ≥ 16 px;
   - APIs do aparelho (compartilhar, imprimir, abrir WhatsApp): sucesso, cancelamento pelo usuário e falta de suporte.
4. **Regras do banco** (pgTAP): constraints, RLS/grants do papel `anon`, funções/RPCs (sucesso e cada erro esperado, com o código e a
   mensagem), cascatas e `on delete`.

**Onde ficam**

| Camada                               | Ferramenta                            | Pasta                                           | Comando                         |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------- | ------------------------------- |
| Ponta a ponta (tela + API + banco)   | Playwright, projeto `iphone-8-webkit` | `apps/web/e2e/<dominio>.spec.ts`                | `npm run e2e`                   |
| Regras do banco                      | pgTAP (`supabase test db`)            | `supabase/tests/database/NN_<dominio>.test.sql` | `npm run db:test`               |
| Funções puras e componentes isolados | Karma + Jasmine                       | `*.spec.ts` ao lado do arquivo                  | `npm run test:ci -w @manus/web` |

**Como escrever os E2E** (`apps/web/e2e/`)

- Importe `test`/`expect` de `./apoio/fixtures` (não de `@playwright/test`): a fixture `banco` cria dados e **apaga tudo ao final** do
  teste, e a fixture automática falha o teste se a página lançar erro JS.
- Cada teste cria **os próprios dados** com nomes/CPFs/placas únicos (`apoio/geradores.ts`: `unico()`, `gerarCpf()`, `gerarPlaca()`,
  `segundaFeiraIsolada()`…). Nunca dependa do `seed.sql` nem da ordem dos testes: eles rodam em paralelo.
- Registro criado **pela tela** também precisa ser registrado para limpeza (`banco.registrar(...)` ou os buscadores `clientePorDocumento`,
  `servicoPorNome`, `agendamentosDoDia`, que já registram).
- Selecione como o usuário enxerga: `getByRole`/`getByLabel`/`getByText` e os `id` dos campos. Botões do PrimeNG incluem o glifo do ícone no
  nome acessível: use regex ancorada (`/^\W*Novo agendamento$/`) quando houver nomes parecidos.
- APIs do sistema (compartilhar, imprimir, `window.open`) são simuladas com `page.addInitScript` (veja `ordem-servico.spec.ts`).
- Antes de rodar: `npm run db:start` (e `npm run db:reset` se o schema mudou). O Playwright sobe o `ng serve` na porta 4310 sozinho.
- Relatório e trace das falhas: `npm run e2e:relatorio -w @manus/web` (pastas `e2e-relatorio/` e `e2e-resultados/`, ignoradas no git).

**Como escrever os testes do banco** (`supabase/tests/database/`):
`begin; create extension if not exists pgtap with schema extensions; select plan(N); … select * from finish(); rollback;`. Rode as asserções
como o app roda (`set local role anon;`). Use `throws_ok` com o código do erro (`23514` check, `23505` único, `23503` FK, `42501` permissão,
`22023`/`P0002` erros das funções). O arquivo `00_seguranca.test.sql` garante, para qualquer tabela/função nova, RLS habilitado, policy
explícita e `search_path` fixo.

## Backend (Supabase)

- Toda mudança de schema vira **migration** em `supabase/migrations` (`npm run db:migration <nome>`); nunca altere o banco remoto à mão.
  Depois: `npm run db:reset` e `npm run db:types`.
- **Toda tabela em `public` com RLS habilitado** e policies explícitas (hoje `to anon, authenticated`, já que não há login), mais
  `revoke all` + `grant` mínimo explícito. Funções `security definer` com `set search_path = ''`.
- `packages/shared/src/database.types.ts` é **gerado**: não edite à mão.
- Edge Functions em `supabase/functions/<nome>/index.ts` (Deno), CORS de `_shared/cors.ts`. Lógica que exige segredo ou `service_role` vai
  para Edge Functions, nunca para o front.
- Segredos só em `.env` (ignorado pelo git) / secrets do Supabase. A publishable/anon key no front é pública por design.

## Git

- Cada feature em uma **branch própria** criada a partir de `main` (`feature/<nome>`, ex.: `feature/agenda`).
- **Nunca** coloque o Claude (ou qualquer IA) como coautor: sem linha `Co-Authored-By: Claude …` nos commits e sem "Generated with Claude
  Code" em PRs. O autor dos commits é só o desenvolvedor.

## Checklist antes de concluir uma tarefa

1. **Testes de ponta a ponta escritos para tudo o que foi desenvolvido** (rota padrão, caminho feliz e um teste por caso de borda, veja a
   seção acima) e **`npm run test:tudo` passando** (typecheck + Karma + pgTAP + E2E). É critério de aceite: sem isso, não está pronto.
2. `npm run build` passando.
3. Tela conferida em **375 × 667**: sem scroll horizontal, alvos de toque ≥ 44 px, inputs ≥ 16 px (os E2E também checam).
4. Nova tabela/função? Migration com RLS + grants mínimos, testes pgTAP e `npm run db:types`.
5. `npm run format`.
