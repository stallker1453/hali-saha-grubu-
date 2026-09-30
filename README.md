
# Halı Saha Grubu — Lovable tasarımına göre

Bu sürüm, ekran görüntüsündeki koyu lacivert + yeşil tasarımı temel alan bağımsız bir web uygulamasıdır.

## Özellikler
- Oyuncu adını kendisi ekler
- 4 haneli PIN ile kendi oyuncu kaydını silebilir
- Aynı isim ikinci kez eklenemez
- Maça yazılma
- 14 kişilik kadro
- Beyaz / Siyah takım görünümü
- As kadro ve yedek mantığı
- PostgreSQL kalıcı veritabanı
- Admin sıfırlama
- Mobil uyumlu

## Render
Build Command:
npm install

Start Command:
npm start

Environment:
DATABASE_URL=PostgreSQL bağlantı adresi
ADMIN_KEY=Güçlü admin anahtarı
NODE_ENV=production

Not: PostgreSQL olmadan uygulama çalışmaz; çünkü oyuncu ve maç verilerinin tüm kullanıcılar için kalıcı olması amaçlanmıştır.
