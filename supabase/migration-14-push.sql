-- Push subscription tablosu (web push VAPID)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_owner" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- pg_net extension (web push trigger için)
create extension if not exists pg_net schema extensions;

-- Yeni bildirim eklenince push gönder
create or replace function public.send_web_push()
returns trigger language plpgsql security definer as $$
declare
  edge_url text := current_setting('app.supabase_url', true) || '/functions/v1/send-push';
  svc_key  text := current_setting('app.service_role_key', true);
begin
  if edge_url is null or svc_key is null then return new; end if;
  perform extensions.http_post(
    edge_url,
    json_build_object(
      'user_id', new.user_id::text,
      'title',   new.title,
      'body',    new.body,
      'url',     new.link,
      'tag',     new.type
    )::text,
    'application/json',
    ARRAY[extensions.http_header('Authorization', 'Bearer ' || svc_key)]
  );
  return new;
exception when others then
  return new;
end;
$$;

create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.send_web_push();
