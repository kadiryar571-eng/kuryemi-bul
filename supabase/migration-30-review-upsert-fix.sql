-- ============================================================
-- Kuryemi Bul — Migration 30: reviews upsert düzeltmesi
--
-- SORUN (migration-29'un kendi hatası):
-- Tekillik index'i şöyle yazılmıştı:
--
--   create unique index reviews_reviewer_target_hiring_idx
--     on public.reviews (
--       reviewer_user, target_id,
--       coalesce(hiring_id, '00000000-...'::uuid)   ← İFADE
--     );
--
-- Ama istemci (docs/assets/js/supabase.js → submitFeedback) upsert'i
-- düz kolon listesiyle yapıyor:
--
--   .upsert({...}, { onConflict: "reviewer_user,target_id,hiring_id" })
--
-- Postgres'te ON CONFLICT'in düz kolon listesi, ifade (expression) içeren
-- bir unique index ile EŞLEŞMEZ. İfadeli index'i kullanmak için ON CONFLICT
-- içinde aynı ifadeyi yazmak gerekir; PostgREST'in on_conflict parametresi
-- ise yalnız kolon adı alır, ifade yazılamaz.
--
-- SONUÇ: her değerlendirme gönderimi şu hatayla düşüyordu ve tabloya
-- HİÇBİR kayıt yazılamıyordu:
--
--   42P10 — there is no unique or exclusion constraint
--           matching the ON CONFLICT specification
--
-- ÇÖZÜM: index'i düz kolonlarla yeniden kur.
--
-- NULL SORUNU: hiring_id NULL olabilir ve Postgres varsayılan olarak
-- NULL'ları birbirinden FARKLI sayar — yani aynı çift sınırsız sayıda
-- NULL kayıt açabilirdi. coalesce'i bu yüzden koymuştum. Postgres 15+
-- bunun doğru çözümünü sunuyor: NULLS NOT DISTINCT. Sürüm eskiyse düz
-- index'e düşüyoruz; pratikte hiring_id her zaman dolu geliyor
-- (feedback.js işe alım kaydından alıyor), bu yüzden kabul edilebilir.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

drop index if exists public.reviews_reviewer_target_hiring_idx;

do $$
declare
  surum int := current_setting('server_version_num')::int;
begin
  if surum >= 150000 then
    execute $ix$
      create unique index if not exists reviews_reviewer_target_hiring_idx
        on public.reviews (reviewer_user, target_id, hiring_id)
        nulls not distinct
    $ix$;
    raise notice 'Index NULLS NOT DISTINCT ile kuruldu (PostgreSQL %)', surum;
  else
    execute $ix$
      create unique index if not exists reviews_reviewer_target_hiring_idx
        on public.reviews (reviewer_user, target_id, hiring_id)
    $ix$;
    raise notice 'Index duz kuruldu — PostgreSQL % NULLS NOT DISTINCT desteklemiyor', surum;
  end if;
end $$;


-- ============================================================
-- DOĞRULAMA
--
-- Index artık ifade içermemeli (indexprs NULL olmalı) ve tam olarak
-- üç kolonu kapsamalı. ON CONFLICT ancak böyle eşleşir.
-- ============================================================

do $$
declare
  ifade_var boolean;
  kolonlar  text;
begin
  select (i.indexprs is not null),
         (select string_agg(a.attname, ',' order by k.ord)
            from unnest(i.indkey) with ordinality as k(attnum, ord)
            join pg_attribute a
              on a.attrelid = i.indrelid and a.attnum = k.attnum)
    into ifade_var, kolonlar
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
   where c.relname = 'reviews_reviewer_target_hiring_idx';

  if ifade_var then
    raise exception 'Index hala ifade iceriyor — ON CONFLICT eslesmez';
  end if;

  if kolonlar is distinct from 'reviewer_user,target_id,hiring_id' then
    raise exception 'Index kolonlari beklenenden farkli: %', kolonlar;
  end if;

  raise notice 'Index dogru: (%) — ON CONFLICT artik eslesecek', kolonlar;
  raise notice 'Migration 30 tamam.';
end $$;
