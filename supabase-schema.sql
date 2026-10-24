create extension if not exists pgcrypto with schema extensions;

create table if not exists public.leaderboard (
    id bigint generated always as identity primary key,
    name text not null check (char_length(btrim(name)) between 1 and 16),
    score integer not null check (score >= 0),
    round integer not null check (round >= 1),
    created_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

grant select, insert on public.leaderboard to anon;

drop policy if exists "Anyone can view leaderboard" on public.leaderboard;
create policy "Anyone can view leaderboard"
    on public.leaderboard
    for select
    to anon
    using (true);

drop policy if exists "Anyone can submit leaderboard scores" on public.leaderboard;
create policy "Anyone can submit leaderboard scores"
    on public.leaderboard
    for insert
    to anon
    with check (
        char_length(btrim(name)) between 1 and 16
        and score >= 0
        and round >= 1
    );

create table if not exists public.leaderboard_admin_password (
    id boolean primary key default true check (id),
    password_hash text not null
);

alter table public.leaderboard_admin_password enable row level security;
revoke all on public.leaderboard_admin_password from public, anon, authenticated;

create or replace function public.reset_shared_leaderboard(p_admin_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    stored_hash text;
begin
    if p_admin_password is null or char_length(p_admin_password) < 12 then
        return false;
    end if;

    select password_hash
    into stored_hash
    from public.leaderboard_admin_password
    where id = true;

    if stored_hash is null or extensions.crypt(p_admin_password, stored_hash) <> stored_hash then
        return false;
    end if;

    delete from public.leaderboard;
    return true;
end;
$$;

revoke all on function public.reset_shared_leaderboard(text) from public, authenticated;
grant execute on function public.reset_shared_leaderboard(text) to anon;
