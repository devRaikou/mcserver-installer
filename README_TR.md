# mcserver-installer

[English](README.md) | Türkçe

Linux sistemlerinde (Debian/Ubuntu için optimize edilmiştir) Minecraft sunucu kurulumu, yapılandırılması ve yaşam döngüsü yönetimini otomatikleştiren profesyonel bir komut satırı arayüzü (CLI) aracıdır.

Görsel netlik, operasyonel güvenlik ve sunucu yönetiminde tam kontrol isteyen yöneticiler için tasarlanmıştır.

---

## Geliştirici

**devRaikou** tarafından geliştirilmiş olup MIT Lisansı altında sunulmuştur.

---

## Özellikler

- **Otomatik Java JRE Yöneticisi:** Sistemdeki bağımsız çalışma ortamlarını (Java 8, 17, 21, 25) tarar, seçilen Minecraft sürümünün gereksinimlerini belirler ve uygun JRE'yi indirip yapılandırır.
- **Çoklu Sunucu Platformları:** Belirtilen platformlar için derlemeleri ve güncellemeleri otomatik olarak indirir:
  - Sunucu Yazılımları: Vanilla, Paper, Folia, Purpur, Fabric, Forge, NeoForge
  - Proxy Yazılımları: Velocity, Waterfall, BungeeCord
- **Gerçek Zamanlı Kaynak Monitörü:** Canlı CPU, RAM (başlangıç ayarlarına göre görsel ilerleme çubuğu göstergeli) ve depolama alanı kullanımını gösteren dinamik gösterge paneli.
- **systemd Entegrasyonu:** Sunucunun sistem açılışında otomatik olarak başlamasını sağlayan systemd servis dosyalarını oluşturup kaydeder; işlemler mevcut kullanıcı oturumu altında güvenle yürütülür.
- **Otomatik Yedekleme Zamanlayıcı:** Günlük veya haftalık otomatik sunucu yedeklemeleri için entegre cron zamanlayıcı. Mutlak dizin doğrulaması ve parametrik (headless) çalışma desteği içerir.
- **Discord Webhook Bildirimleri:** Sunucu başlatıldığında, durdurulduğunda veya yedeklendiğinde; Sunucu Adı, JRE Sürümü, Genel/Yerel IP'ler, Bağlantı Portları ve GitHub referanslarını içeren detaylı bildirim kartlarını Discord kanalınıza eşzamansız (arka planda) gönderir.
- **Canlı server.properties Editörü:** Etkileşimli CLI menüsü üzerinden `server.properties` ayarlarını anlık olarak okur, düzenler ve kaydeder.
- **Arka Plan Servis Modunda Çalıştırma:** SSH oturumları kapansa dahi sunucunun kapanmasını önlemek için işlemleri arka planda bağımsız GNU `screen` oturumlarında çalıştırır.
- **Çökme ve Durdurma Koruması:** Sunucunun çökmelerde otomatik yeniden başlamasını, ancak manuel durdurmalarda temiz bir şekilde kapanmasını sağlayan dinamik `.stop_restart` kilitleme sistemli döngü.
- **Optimize Edilmiş JVM Parametreleri:** Bellek sınırlarını otomatik ayarlar ve Aikar'ın optimize edilmiş Garbage Collection (Çöp Toplayıcı) parametrelerini tek tıkla entegre eder.

---

## Gereksinimler

Kurulum aracı Debian ve Ubuntu dağıtımlarında yerel olarak çalışır. Aşağıdaki paketleri otomatik olarak denetler ve eksik olanları yükler:
- `curl` (veri transferleri)
- `jq` (JSON veri ayrıştırma)
- `screen` (arka plan oturum yönetimi)
- `tar` & `gzip` (yedeklerin sıkıştırılması ve açılması)
- Uygun Java JDK sürümü (sistemde yoksa otomatik seçilir ve kurulur)

*Debian dışı veya macOS ortamlarında uyumluluk modu için uyarı gösterilir.*

---

## Kurulum

Script dosyasını indirmek ve çalıştırma izni vermek için aşağıdaki komutları sırasıyla terminalde çalıştırın:

```bash
# Depoyu klonlayın
git clone https://github.com/devRaikou/mcserver-installer.git
cd mcserver-installer

# Çalıştırma izni verin
chmod +x mcserver-installer

# Kurulum aracını başlatın
./mcserver-installer
```

---

## Komut Satırı Argümanları (Otomasyon)

Crontab veya harici otomasyon panelleri gibi etkileşimsiz ortamlar için script parametrik çalıştırmayı destekler:

```bash
# Belirli bir sunucunun yedeklemesini etkileşimsiz olarak tetikleme
./mcserver-installer --backup <sunucu_adi>
```

---

## Kullanım

Başlatıldığında, script sizi etkileşimli bir ana menü ile karşılar:

```text
  __  __  _____  _____                                 
 |  \/  |/ ____|/ ____|                                
 | \  / | |    | (___   ___ _ ____   _____ _ __        
 | |\/| | |     \___ \ / _ \ '__\ \ / / _ \ '__|       
 | |  | | |____ ____) |  __/ |   \ V /  __/ |          
 |_|  |_|\_____|_____/ \___|_|    \_/ \___|_|          
  _           _        _   _                           
 (_)         | |      | | | |                          
  _ _ __  ___| |_ __ _| | | | ___ _ __                 
 | | '_ \/ __| __/ _` | | | |/ _ \ '__|                
 | | | | \__ \ || (_| | | | |  __/ |                   
 |_|_| |_|___/\__\__,_|_| |_|\___|_|                   

  Geliştirici: devRaikou | Proje: mcserver-installer | Sürüm: 1.8
  ================================================================

  ANA MENÜ
  ================================================================

    1. Minecraft Sunucusu Kur
    2. Mevcut Sunucuyu Yönet
    3. Sunucu Jar Dosyasını Güncelle
    4. Sunucuyu Yedekle
    5. Yedeği Geri Yükle
    6. Sunucuyu Kaldır / Kaydı Sil
    7. Ayarlar ve Sistem Kontrolleri
    8. Hakkında
    9. Çıkış
  ================================================================
  Seçim yapın (1-9):
```

### Sunucu Yönetim Menüsü

**Mevcut Sunucuyu Yönet** seçeneğini seçtikten sonra, o sunucuya özel konsola erişebilirsiniz:

- **Sunucuyu Başlat:** Sunucuyu `mc-[ad]-[hash]` isimli GNU `screen` oturumunda başlatır.
- **Sunucuyu Durdur:** Sunucu konsoluna `stop` komutunu göndererek güvenle durdurur ve çökme koruması yeniden başlatma döngülerini kapatır.
- **Konsola Bağlan:** Etkileşimli konsola terminal üzerinden bağlanır (Oturumdan güvenle çıkmak için sırasıyla `Ctrl+A` ve ardından `D` tuşlarına basın).
- **server.properties Düzenle:** Port, MOTD, Maksimum Oyuncu Sayısı, Oyun Modu gibi ayarları canlı düzenler.
- **RAM Sınırlarını Değiştir:** Sunucunun `start.sh` dosyasındaki bellek sınırlarını günceller.
- **Gerçek Zamanlı Kaynak İzleme:** CPU, RAM ve Disk durumunu canlı grafiksel takip eder.
- **Sistem Açılışında Başlatmayı Etkinleştir/Kaldır:** Sunucu için systemd otomatik başlama servisi ayarlarını yönetir.

---

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için LICENSE dosyasına bakabilirsiniz.
