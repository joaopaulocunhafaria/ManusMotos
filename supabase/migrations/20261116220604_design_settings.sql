-- =============================================================
-- Identidade visual da instância (1 deploy = 1 mecânica)
-- Tabela singleton: sempre existe exatamente uma linha (id = 1).
-- =============================================================

create table public.design_settings (
  id                smallint primary key default 1 check (id = 1),
  shop_name         text not null default 'ManusMotos' check (char_length(btrim(shop_name)) between 1 and 60),
  subtitle          text check (char_length(subtitle) <= 120),
  phone             text check (char_length(phone) <= 20),
  whatsapp          text check (char_length(whatsapp) <= 20),
  primary_color     text not null default '#f97316',
  secondary_color   text not null default '#1f2937',
  background_color  text not null default '#f7f7fc',
  surface_color     text not null default '#ffffff',
  text_color        text not null default '#1f2937',
  border_color      text not null default '#e5e7eb',
  font_family       text not null default 'system'
                      check (font_family in ('system', 'inter', 'roboto', 'poppins', 'montserrat')),
  border_radius     text not null default 'medium'
                      check (border_radius in ('none', 'small', 'medium', 'large')),
  updated_at        timestamptz not null default now(),
  constraint design_settings_cores_hex check (
        primary_color    ~ '^#[0-9a-fA-F]{6}$'
    and secondary_color  ~ '^#[0-9a-fA-F]{6}$'
    and background_color ~ '^#[0-9a-fA-F]{6}$'
    and surface_color    ~ '^#[0-9a-fA-F]{6}$'
    and text_color       ~ '^#[0-9a-fA-F]{6}$'
    and border_color     ~ '^#[0-9a-fA-F]{6}$'
  )
);

comment on table public.design_settings is 'Identidade visual da mecânica (título, contato, cores, fonte). Linha única id = 1.';
comment on column public.design_settings.surface_color is 'Cor de header, barra de navegação e cards.';

-- Linha padrão (vale para todo ambiente, inclusive produção)
insert into public.design_settings (id) values (1);

-- -------------------------------------------------------------
-- Permissões: o app ainda não tem login, então o papel `anon` (chave pública)
-- lê e edita. Sem insert/delete: a linha única é criada aqui.
-- Quando houver autenticação, restrinja o update a `authenticated`/admin.
-- -------------------------------------------------------------
-- Remove os privilégios padrão do Supabase (all para anon/authenticated) antes de conceder o mínimo.
revoke all on public.design_settings from anon, authenticated;
grant select on public.design_settings to anon, authenticated;
grant update (
  shop_name, subtitle, phone, whatsapp,
  primary_color, secondary_color, background_color, surface_color, text_color, border_color,
  font_family, border_radius
) on public.design_settings to anon, authenticated;

alter table public.design_settings enable row level security;

create policy "design_settings: todos leem"
  on public.design_settings for select
  to anon, authenticated
  using (true);

create policy "design_settings: todos atualizam"
  on public.design_settings for update
  to anon, authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------
-- updated_at automático
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger design_settings_set_updated_at
  before update on public.design_settings
  for each row execute function public.set_updated_at();
