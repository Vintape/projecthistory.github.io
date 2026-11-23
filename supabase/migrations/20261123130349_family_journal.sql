alter table atlas_family.accounts
    add column family_note text not null default '' check (char_length(family_note) <= 1200),
    add column research_question text not null default '' check (char_length(research_question) <= 350);

create or replace function atlas_family.profile_for(p_account_id uuid)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
    select jsonb_build_object(
        'name', account.name,
        'email', account.email,
        'childAge', account.child_age,
        'ancestorPlace', account.ancestor_place,
        'familyNote', account.family_note,
        'researchQuestion', account.research_question,
        'routes', coalesce((
            select jsonb_agg(route.snapshot order by route.id desc)
            from atlas_family.saved_routes route
            where route.account_id = account.id
        ), '[]'::jsonb)
    )
    from atlas_family.accounts account
    where account.id = p_account_id;
$$;

create or replace function public.atlas_family_mutate_profile(
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
    select account_id into owner_id
    from atlas_family.sessions
    where token_hash = decode(p_token_hash, 'hex') and expires_at > statement_timestamp()
    for share;

    if owner_id is null then
        return null;
    end if;

    perform 1 from atlas_family.accounts where id = owner_id for no key update;

    if p_fields <> '{}'::jsonb then
        update atlas_family.accounts
        set name = coalesce(p_fields ->> 'name', name),
            child_age = case when p_fields ? 'childAge' then (p_fields ->> 'childAge')::smallint else child_age end,
            ancestor_place = coalesce(p_fields ->> 'ancestorPlace', ancestor_place),
            family_note = coalesce(p_fields ->> 'familyNote', family_note),
            research_question = coalesce(p_fields ->> 'researchQuestion', research_question)
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
