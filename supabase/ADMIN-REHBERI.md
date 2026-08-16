# Yönetim Rehberi

## Yönetim artık ayrı bir paneldedir → **kb-yonetim.pages.dev**

Günlük işlerin tamamı (kimlik doğrulama onayı, kullanıcı yönetimi, ilan
denetimi) orada yapılır. Panel her işlemi `admin_audit_log` tablosuna
yazar — Studio'nun hiç vermediği şey budur: **kim, ne zaman, neyi
değiştirdi kaydı kalır.**

| | Panel | Studio (bu belge) |
|---|---|---|
| Günlük işler | ✅ | — |
| Denetim izi | ✅ otomatik | ❌ hiç yok |
| Yanlış `update` riski | düşük (kelime onayı) | yüksek |
| Şema değişikliği, migration | ❌ | ✅ |
| Panel bozulursa | — | ✅ acil durum yedeği |

**Aşağıdaki SQL reçeteleri acil durum yedeği olarak korunuyor.** Panel
çalışmıyorsa ya da şemaya dokunman gerekiyorsa buradan devam et.

**Proje:** `fdszypytpodndtlbuzuz` · https://supabase.com/dashboard

> Studio'da sorgular `postgres` rolüyle çalışır; RLS ve `auth.uid()` tabanlı
> koruyucu trigger'lar devreye girmez. Bu yüzden aşağıdaki işlemler doğrudan
> yapılabilir. Aynı sorguları uygulama içinden çalıştırmak mümkün değildir.
>
> **DİKKAT:** Studio'dan yapılan hiçbir işlem denetim günlüğüne yazılmaz.
> Yapabildiğin bir işi panelden yap.

### Web sitesi ve mobil uygulamada admin YOKTUR

`docs/` (site) ve `www/` (APK) yönetici kavramını hiç bilmez: `admins`
tablosuna sorgu atmaz, admin rolü tanımaz, admin sayfası içermez.
Migration-28 sonrası `admins` tablosunun RLS policy'si de kaldırıldı —
hiçbir istemci o tabloyu okuyamaz. `is_admin()` çalışmaya devam eder
(`security definer` olduğu için RLS'i baypas eder).

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

`admins` tablosu artık **zorunludur** — yönetim paneline giriş yapabilmenin
tek koşulu budur. `admin-api` Edge Function'ı her istekte bu tabloyu sorgular;
satırı olmayan bir kullanıcı doğru parolayla giriş yapsa bile 403 alır (ve
deneme `admin_audit_log`'a `auth.denied` olarak yazılır).

```sql
insert into public.admins(user_id) values ('<auth_user_id>')
  on conflict do nothing;
```
Kullanıcının `auth_user_id` değeri: **Authentication → Users** ekranında.

### Yetkiyi geri alma
```sql
delete from public.admins where user_id = '<auth_user_id>';
```
Etkisi anındadır — bir sonraki istekte 403 alır. Oturumu kapatmaya gerek yok.

### Kim yönetici?
```sql
select a.user_id, u.email, a.created_at
  from public.admins a
  join auth.users u on u.id = a.user_id
 order by a.created_at;
```

---

## 5b. Denetim günlüğü (migration-28)

Panelden yapılan her değiştiren işlem buraya yazılır. Tablo hiçbir arayüzden
silinemez/değiştirilemez: RLS açık ve **hiç policy yok**, yalnız
`service_role` yazabilir.

```sql
-- Son 50 işlem
select created_at, admin_email, action, target_table, target_id, result
  from public.admin_audit_log
 order by created_at desc limit 50;

-- Yetkisiz erişim denemeleri — panel adresini bilen ama yetkisi olmayan biri
select created_at, admin_email, ip
  from public.admin_audit_log
 where action = 'auth.denied'
 order by created_at desc;

-- Kimlik belgesi kimler tarafından açıldı (KVKK — erişim kaydı)
select created_at, admin_email, target_id
  from public.admin_audit_log
 where action = 'kyc.doc'
 order by created_at desc;

-- Silinen hesaplar
select created_at, admin_email, target_id
  from public.admin_audit_log
 where action in ('users.delete', 'listings.delete')
 order by created_at desc;
```

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
