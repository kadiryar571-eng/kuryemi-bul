// ============================================================================
// purge-user-files — bir kullanıcının Storage'daki TÜM dosyalarını siler
//
// NEDEN AYRI BİR ADIM:
// auth.users satırı silinince public tabloların hepsi `on delete cascade` ile
// temizlenir, ama Storage dosyaları tablo değildir; kendiliğinden SİLİNMEZ.
// Supabase `storage.objects`'ten SQL ile silmeyi de engeller (protect_delete),
// bu yüzden delete_own_account() RPC'si dosyalara dokunamıyordu. Sonuç:
// silinen hesabın kimlik belgeleri (kyc_documents) ve açık kovadaki
// fotoğrafları sonsuza kadar kalıyordu — KVKK ve Google Play hesap silme
// politikası ihlali.
//
// KOVA YOL ŞEMALARI (yükleyen kod: www/assets/js/supabase.js):
//   avatars, kyc_documents, firma_belgeler, firma_fotograflar → <uid>/<dosya>
//   chat_files                                               → <konuşma>/<gönderen>/<dosya>
//
// chat_files için kullanıcının dahil olduğu konuşmaların KLASÖRÜNÜN TAMAMI
// silinir, karşı tarafın dosyaları dahil: konuşma satırı cascade ile zaten
// gidiyor ve okuma izni (migration-27) konuşma üyeliğine bağlı — karşı taraf
// o dosyalara bir daha erişemez, yalnız sahipsiz çöp olarak kalırlardı.
//
// Yeni bir kova eklerseniz BURAYA da ekleyin.
// ============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const UID_PREFIXED_BUCKETS = ["avatars", "kyc_documents", "firma_belgeler", "firma_fotograflar"];
const PAGE = 1000;
const REMOVE_CHUNK = 100;

/** Bir klasörün doğrudan altındaki girdiler (dosya + alt klasör), sayfalı. */
async function listAll(svc: SupabaseClient, bucket: string, prefix: string) {
  const out: { name: string; isFolder: boolean }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await svc.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}/${prefix} listelenemedi: ${error.message}`);
    // Storage API'de klasörlerin id'si null döner
    for (const e of data ?? []) out.push({ name: e.name, isFolder: e.id === null });
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function removePaths(svc: SupabaseClient, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const { error } = await svc.storage.from(bucket).remove(paths.slice(i, i + REMOVE_CHUNK));
    if (error) throw new Error(`${bucket} silinemedi: ${error.message}`);
  }
}

/** Kullanıcının tüm dosyalarını siler; kova başına silinen sayıyı döner.
    Herhangi bir adım başarısız olursa FIRLATIR — çağıran hesabı silmemeli. */
export async function purgeUserFiles(svc: SupabaseClient, uid: string) {
  const report: Record<string, number> = {};

  for (const bucket of UID_PREFIXED_BUCKETS) {
    const files = (await listAll(svc, bucket, uid)).filter((e) => !e.isFolder);
    await removePaths(svc, bucket, files.map((f) => `${uid}/${f.name}`));
    report[bucket] = files.length;
  }

  // chat_files: konuşmalar cascade ile silinmeden ÖNCE kimliklerini al
  const { data: convs, error: convErr } = await svc
    .from("conversations").select("id")
    .or(`kurye_user.eq.${uid},employer_user.eq.${uid}`);
  if (convErr) throw new Error(`konuşmalar okunamadı: ${convErr.message}`);

  let chatCount = 0;
  for (const c of convs ?? []) {
    const paths: string[] = [];
    for (const sub of await listAll(svc, "chat_files", c.id)) {
      if (!sub.isFolder) { paths.push(`${c.id}/${sub.name}`); continue; }
      for (const f of await listAll(svc, "chat_files", `${c.id}/${sub.name}`)) {
        if (!f.isFolder) paths.push(`${c.id}/${sub.name}/${f.name}`);
      }
    }
    await removePaths(svc, "chat_files", paths);
    chatCount += paths.length;
  }
  report["chat_files"] = chatCount;

  return report;
}
