# Yönetim Rehberi — Supabase Studio

Uygulama içi admin sayfası (`admin.html`) kaldırıldı. Tüm yönetim işlemleri
**Supabase Dashboard → SQL Editor** üzerinden yapılır.

**Proje:** `fdszypytpodndtlbuzuz` · https://supabase.com/dashboard

> Studio'da sorgular `postgres` rolüyle çalışır; RLS ve `auth.uid()` tabanlı
> koruyucu trigger'lar devreye girmez. Bu yüzden aşağıdaki işlemler doğrudan
> yapılabilir. Aynı sorguları uygulama içinden çalıştırmak mümkün değildir.

---

## 1. Kimlik doğrulama (KYC) onayı

### Bekleyen başvuruları listele
```sql
select k.profile_id, p.ad, p.role, k.ad_soyad, k.tc_no,
       k.belge_turu, k.not_text, k.created_at
  from public.kyc_submissions k
  join public.profiles p on p.id = k.profile_id
 where k.durum = 'pending'
 order by k.created_at;
```

### Yüklenen belgeyi görüntüle
Belgeler `kyc_documents` (özel) bucket'ındadır.
**Storage → kyc_documents** → kullanıcının `user_id` klasörü.
Ya da imzalı URL üret:
```sql
-- Dashboard → Storage üzerinden "Get URL" daha pratiktir.
select * from storage.objects
 where bucket_id = 'kyc_documents'
 order by created_at desc limit 20;
```

### Onayla
```sql
update public.profiles        set dogrulama = 'verified' where id = '<profile_id>';
update public.kyc_submissions set durum     = 'verified' where profile_id = '<profile_id>';
```

### Reddet
```sql
update public.profiles        set dogrulama = 'rejected' where id = '<profile_id>';
update public.kyc_submissions set durum     = 'rejected' where profile_id = '<profile_id>';
```

> `dogrulama` değişince `kb_dogrulama_notify` trigger'ı kullanıcıya otomatik
> bildirim (ve e-posta) gönderir — ayrıca bir şey yapmana gerek yok.

---

## 2. Platform istatistikleri
```sql
select public.platform_stats();
select public.online_users_count();
```

---

## 3. Kullanıcı yönetimi

### Profilleri listele
```sql
select p.id, p.ad, p.role, p.sehir, p.yayinda, p.dogrulama,
       p.puan, p.degerlendirme, p.created_at, c.email
  from public.profiles p
  left join public.profile_contacts c on c.profile_id = p.id
 order by p.created_at desc;
```

### Havuzdan gizle (askıya alma yerine)
```sql
update public.profiles set yayinda = false where id = '<profile_id>';
```

### Hesabı tamamen sil
`auth.users`'tan silmek yeterlidir; profil, ilan, başvuru, mesaj, bildirim ve
cihaz token'ları `on delete cascade` ile temizlenir.
```sql
delete from auth.users where id = '<user_id>';
```

### Puan / teslimat sayısı düzeltme
Bu alanlar kullanıcıya kapalıdır (`guard_profile_metrics`, migration-20).
Studio'dan düzeltilebilir:
```sql
update public.profiles set tamamlanan = 42 where id = '<profile_id>';
```

---

## 4. İlan denetimi
```sql
-- Tüm ilanlar
select l.id, l.baslik, l.durum, l.sahip_ad, l.sehir, l.created_at
  from public.listings l order by l.created_at desc;

-- İlanı yayından kaldır
update public.listings set durum = 'kapali' where id = '<listing_id>';

-- Süresi dolmuşları toplu kapat
select public.close_expired_listings();
```

---

## 5. Admin yetkisi
`admins` tablosu `is_admin()` fonksiyonu ve `review_kyc()` RPC'si tarafından
kullanılır. Uygulama içi admin arayüzü olmadığı için zorunlu değildir, ama
ileride gerekirse:
```sql
insert into public.admins(user_id) values ('<auth_user_id>')
  on conflict do nothing;
```
Kullanıcının `auth_user_id` değeri: **Authentication → Users** ekranında.

---

## 6. Sağlık kontrolleri
```sql
-- Demo/seed profil kalmamalı (0 dönmeli)
select count(*) from public.profiles where user_id is null;

-- Sahipsiz ilan kalmamalı (0 dönmeli)
select count(*) from public.listings l
 where not exists (select 1 from public.profiles p where p.id = l.owner_id);

-- Güvenlik: misafir profiles tablosunu okuyamamalı
set role anon;
select count(*) from public.profiles;         -- 0
select count(*) from public.profiles_public;  -- >0
reset role;
```
