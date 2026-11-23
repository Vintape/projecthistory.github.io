create table public.atlas_rate_limits (
    subject text not null,
    operation text not null,
    window_start timestamptz not null,
    uses integer not null check (uses > 0),
    primary key (subject, operation, window_start)
);

alter table public.atlas_rate_limits enable row level security;
revoke all on public.atlas_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.atlas_rate_limits to service_role;
create index atlas_rate_limits_window_idx on public.atlas_rate_limits (window_start);

create function public.atlas_consume_limit(p_subject text, p_operation text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
    bucket_start timestamptz;
    max_uses integer;
    used integer;
begin
    case p_operation
        when 'login' then
            bucket_start := pg_catalog.date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 UTC');
            max_uses := 15;
        when 'register' then
            bucket_start := pg_catalog.date_trunc('hour', now());
            max_uses := 8;
        when 'guide_guest' then
            bucket_start := pg_catalog.date_trunc('day', now(), 'Europe/Moscow');
            max_uses := 3;
        when 'guide_cloud' then
            bucket_start := pg_catalog.date_trunc('day', now(), 'Europe/Moscow');
            max_uses := 100;
        else
            raise exception 'Unknown rate limit operation';
    end case;

    insert into public.atlas_rate_limits as limits (subject, operation, window_start, uses)
    values (p_subject, p_operation, bucket_start, 1)
    on conflict (subject, operation, window_start)
    do update set uses = limits.uses + 1 where limits.uses < max_uses
    returning uses into used;

    if used = 1 then
        delete from public.atlas_rate_limits where window_start < now() - interval '2 days';
    end if;

    return case when used is null then -1 else max_uses - used end;
end;
$$;

revoke all on function public.atlas_consume_limit(text, text) from public, anon, authenticated;
grant execute on function public.atlas_consume_limit(text, text) to service_role;
