-- ============================================================
-- Kuryemi Bul — Migration 21: guard_dogrulama sıkılaştırma
--
-- SORUN (migration-09-admin.sql içindeki sürüm):
--   if auth.uid() is not null and new.dogrulama <> 'pending'
--      and not public.is_admin(auth.uid()) then ...
--
--   Koruma yalnız auth.uid() DOLU iken çalışıyordu. auth.uid()
--   NULL olduğu her bağlamda (service_role anahtarı, SQL editor,
--   başka bir security definer fonksiyonun içinden yapılan update,
--   arka plan job'ları) kontrol tamamen atlanıyor ve dogrulama
--   alanı serbestçe 'verified' yapılabiliyordu.
--
--   KYC doğrulaması bu alana bakıyor; yani sahte bir 'verified'
--   rozeti platformdaki tüm güven sinyalini geçersiz kılar.
--
-- ÇÖZÜM: varsayılanı REDDET yap. Yalnız gerçek bir admin
--   oturumu dogrulama'yı değiştirebilir; auth.uid() yoksa
--   değişiklik sessizce geri alınır.
--
-- KULLANIM: Supabase → SQL Editor → Run.
-- ============================================================

create or replace function public.guard_dogrulama()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Alan değişmiyorsa dokunma
  if new.dogrulama is not distinct from old.dogrulama then
    return new;
  end if;

  -- Kullanıcı kendi başvurusunu 'pending' yapabilir (KYC gönderimi).
  -- Bunun için de gerçek bir oturum gerekir.
  if new.dogrulama = 'pending' and auth.uid() is not null then
    return new;
  end if;

  -- Bunun dışındaki her değişiklik yalnız admin oturumuyla mümkün.
  -- auth.uid() NULL ise is_admin(NULL) false döner → değişiklik reddedilir.
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Yetkisiz: değişikliği sessizce geri al (hata fırlatmak, alakasız
  -- alanları güncelleyen normal profil kaydetmelerini de bozardı).
  new.dogrulama := old.dogrulama;
  return new;
end $$;

-- is_admin(NULL) güvenli mi? Doğrula: NULL user_id hiçbir satırla
-- eşleşmeyeceği için false dönmeli.
do $$
begin
  if public.is_admin(null) then
    raise exception 'is_admin(NULL) true döndü — beklenmedik';
  end if;
  raise notice 'is_admin(NULL) = false ✓';
end $$;

-- Trigger'ı yeniden kurmaya GEREK YOK: create or replace function
-- fonksiyonu yerinde günceller, mevcut trigger zaten ona bakıyor.
-- Yine de var olduğunu doğrulayalım (migration-08 kurmuştu,
-- trigger adı: guard_dogrulama_trg).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'guard_dogrulama_trg'
      and tgrelid = 'public.profiles'::regclass
      and not tgisinternal
  ) then
    raise notice 'guard_dogrulama_trg bulunamadı — yeniden kuruluyor';
    create trigger guard_dogrulama_trg
      before update on public.profiles
      for each row execute function public.guard_dogrulama();
  else
    raise notice 'guard_dogrulama_trg mevcut ✓';
  end if;
end $$;
