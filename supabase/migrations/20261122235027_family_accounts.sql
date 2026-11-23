create schema atlas_family;
revoke all on schema atlas_family from public, anon, authenticated;
grant usage on schema atlas_family to service_role;

create table atlas_family.accounts (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 100),
    email text not null unique check (char_length(email) between 1 and 254),
    password_hash bytea not null check (octet_length(password_hash) = 32),
    password_salt bytea not null check (octet_length(password_salt) = 16),
    password_iterations integer not null check (password_iterations >= 600000),
    child_age smallint check (child_age between 0 and 18),
    ancestor_place text not null default '' check (char_length(ancestor_place) <= 160)
);

create table atlas_family.sessions (
    token_hash bytea primary key check (octet_length(token_hash) = 32),
    account_id uuid not null references atlas_family.accounts (id) on delete cascade,
    expires_at timestamptz not null
);

create index sessions_account_expiry on atlas_family.sessions (account_id, expires_at);

create table atlas_family.saved_routes (
    id bigint generated always as identity primary key,
    account_id uuid not null references atlas_family.accounts (id) on delete cascade,
    route_id text not null check (char_length(route_id) between 1 and 128),
    snapshot jsonb not null check (
        jsonb_typeof(snapshot) = 'object'
        and snapshot ?& array['id', 'title', 'overview', 'stops', 'format']
        and (snapshot ->> 'id') is not distinct from route_id
    ),
    unique (account_id, route_id)
);

create index saved_routes_account_order on atlas_family.saved_routes (account_id, id desc);

alter table atlas_family.accounts enable row level security;
alter table atlas_family.sessions enable row level security;
alter table atlas_family.saved_routes enable row level security;

revoke all on all tables in schema atlas_family from public, anon, authenticated;
revoke all on all sequences in schema atlas_family from public, anon, authenticated;
grant select, insert, update on atlas_family.accounts to service_role;
grant select, insert, update, delete on atlas_family.sessions to service_role;
grant select, insert, update, delete on atlas_family.saved_routes to service_role;
grant usage on sequence atlas_family.saved_routes_id_seq to service_role;

create function atlas_family.profile_for(p_account_id uuid)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
    select jsonb_build_object(
        'name', account.name,
        'email', account.email,
        'childAge', account.child_age,
        'ancestorPlace', account.ancestor_place,
        'routes', coalesce((
            select jsonb_agg(route.snapshot order by route.id desc)
            from atlas_family.saved_routes route
            where route.account_id = account.id
        ), '[]'::jsonb)
    )
    from atlas_family.accounts account
    where account.id = p_account_id;
$$;

revoke all on function atlas_family.profile_for(uuid) from public, anon, authenticated;
grant execute on function atlas_family.profile_for(uuid) to service_role;

create function public.atlas_family_profile(p_token_hash text)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
    select atlas_family.profile_for(session.account_id)
    from atlas_family.sessions session
    where session.token_hash = decode(p_token_hash, 'hex')
      and session.expires_at > statement_timestamp();
$$;

create function public.atlas_family_start_session(p_account_id uuid, p_token_hash text)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
begin
    delete from atlas_family.sessions
    where account_id = p_account_id and expires_at <= statement_timestamp();

    insert into atlas_family.sessions (token_hash, account_id, expires_at)
    values (decode(p_token_hash, 'hex'), p_account_id, statement_timestamp() + interval '720 hours');

    return atlas_family.profile_for(p_account_id);
end;
$$;

create function public.atlas_family_register(
    p_name text, p_email text, p_password_hash text, p_password_salt text,
    p_password_iterations integer, p_child_age smallint, p_ancestor_place text, p_token_hash text
)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
    new_account_id uuid;
begin
    insert into atlas_family.accounts (name, email, password_hash, password_salt, password_iterations, child_age, ancestor_place)
    values (p_name, p_email, decode(p_password_hash, 'hex'), decode(p_password_salt, 'hex'),
            p_password_iterations, p_child_age, p_ancestor_place)
    on conflict (email) do nothing
    returning id into new_account_id;

    if new_account_id is null then
        return null;
    end if;

    return public.atlas_family_start_session(new_account_id, p_token_hash);
end;
$$;

create function public.atlas_family_credentials(p_email text)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
    select jsonb_build_object(
        'id', id,
        'salt', encode(password_salt, 'hex'),
        'hash', encode(password_hash, 'hex'),
        'iterations', password_iterations
    )
    from atlas_family.accounts
    where email = p_email;
$$;

create function public.atlas_family_logout(p_token_hash text)
returns void
language sql security invoker
set search_path = ''
as $$
    delete from atlas_family.sessions where token_hash = decode(p_token_hash, 'hex');
$$;

create function public.atlas_family_mutate_profile(
    p_token_hash text,
    p_fields jsonb default '{}'::jsonb,
    p_route jsonb default null,
    p_remove_route text default null
)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
    owner_id uuid;
begin
    -- Hold the session through the write so logout and mutation have a consistent order.
    select account_id into owner_id
    from atlas_family.sessions
    where token_hash = decode(p_token_hash, 'hex') and expires_at > statement_timestamp()
    for share;

    if owner_id is null then
        return null;
    end if;

    -- Serialize writes and their returned snapshots for each family.
    perform 1 from atlas_family.accounts where id = owner_id for no key update;

    if p_fields <> '{}'::jsonb then
        update atlas_family.accounts
        set name = coalesce(p_fields ->> 'name', name),
            child_age = case when p_fields ? 'childAge' then (p_fields ->> 'childAge')::smallint else child_age end,
            ancestor_place = coalesce(p_fields ->> 'ancestorPlace', ancestor_place)
        where id = owner_id;
    end if;

    if p_route is not null then
        insert into atlas_family.saved_routes (account_id, route_id, snapshot)
        values (owner_id, p_route ->> 'id', p_route)
        on conflict (account_id, route_id) do update set snapshot = excluded.snapshot;
    end if;

    if p_remove_route is not null then
        delete from atlas_family.saved_routes where account_id = owner_id and route_id = p_remove_route;
    end if;

    return atlas_family.profile_for(owner_id);
end;
$$;

revoke all on function
    public.atlas_family_profile(text),
    public.atlas_family_start_session(uuid, text),
    public.atlas_family_register(text, text, text, text, integer, smallint, text, text),
    public.atlas_family_credentials(text),
    public.atlas_family_logout(text),
    public.atlas_family_mutate_profile(text, jsonb, jsonb, text)
from public, anon, authenticated;

grant execute on function
    public.atlas_family_profile(text),
    public.atlas_family_start_session(uuid, text),
    public.atlas_family_register(text, text, text, text, integer, smallint, text, text),
    public.atlas_family_credentials(text),
    public.atlas_family_logout(text),
    public.atlas_family_mutate_profile(text, jsonb, jsonb, text)
to service_role;

notify pgrst, 'reload schema';
