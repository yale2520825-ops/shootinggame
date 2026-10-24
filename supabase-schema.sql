create extension if not exists pgcrypto with schema extensions;

create table if not exists public.leaderboard (
    id bigint generated always as identity primary key,
    name text not null,
    score integer not null check (score >= 0),
    round integer not null check (round >= 1),
    created_at timestamptz not null default now()
);

alter table public.leaderboard
    drop constraint if exists leaderboard_name_check;

alter table public.leaderboard
    drop constraint if exists leaderboard_name_length;

alter table public.leaderboard
    add constraint leaderboard_name_length
    check (char_length(btrim(name)) between 1 and 35);

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
        char_length(btrim(name)) between 1 and 35
        and score >= 0
        and round >= 1
    );

drop function if exists public.reset_shared_leaderboard(text);
drop function if exists public.reset_shared_leaderboard();
drop table if exists public.leaderboard_admin_password;

create function public.reset_shared_leaderboard(p_confirm boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not p_confirm then
        return false;
    end if;

    delete from public.leaderboard where true;
    return true;
end;
$$;

revoke all on function public.reset_shared_leaderboard(boolean) from public, authenticated;
grant execute on function public.reset_shared_leaderboard(boolean) to anon;
