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
npm test                  # Karma (watch)  |  npm run test:ci -w @manus/web (headless)
npm run typecheck
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

**Testes**: Karma + Jasmine (`*.spec.ts` ao lado do arquivo). Declare o componente em `declarations` no `TestBed`.

**Ambientes**: `environment.ts` (produção), `environment.homolog.ts`, `environment.development.ts` (Supabase local), trocados por
`fileReplacements` no `angular.json`.

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

1. `npm run typecheck`, `npm run build` e `npm run test:ci -w @manus/web` passando.
2. Tela conferida em **375 × 667**: sem scroll horizontal, alvos de toque ≥ 44 px, inputs ≥ 16 px.
3. Nova tabela? Migration com RLS + `npm run db:types`.
4. `npm run format`.
