# mcserver-installer

![Version](https://img.shields.io/badge/version-1.55-2ea44f)
![Shell](https://img.shields.io/badge/shell-bash-4eaa25)
![Platform](https://img.shields.io/badge/platform-Debian%20%7C%20Ubuntu-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

[English](#english) | [Turkce](#turkce)

---

## English

`mcserver-installer` is a Bash-based CLI tool for installing, configuring, and managing Minecraft servers on Linux systems, with the smoothest path on Debian and Ubuntu.

It is designed for server owners and administrators who want one terminal interface for installation, updates, backups, runtime control, plugin management, and operational checks.

### What It Does

| Area | Details |
| --- | --- |
| Server installation | Installs Vanilla, Paper, Folia, Purpur, Fabric, Forge, NeoForge, Velocity, Waterfall, and BungeeCord. |
| Java management | Detects the required Java version for the selected Minecraft version and installs OpenJDK when needed. |
| Runtime control | Starts servers in detached GNU `screen` sessions and supports graceful stop/restart flows. |
| Backups | Creates manual backups and schedules daily or weekly automated backups through `cron`. |
| Configuration | Provides an interactive `server.properties` editor and RAM allocation controls. |
| Monitoring | Shows live CPU, RAM, and disk usage for running servers. |
| Notifications | Sends asynchronous Discord webhook alerts for server start, stop, force-stop, backups, and plugin changes. |
| Boot startup | Generates `systemd` services so registered servers can start after host reboot. |
| Plugins | Searches and installs compatible Modrinth plugins, removes plugin jars, and can install Geyser/Floodgate. |
| Proxy networks | Can deploy backend Paper servers behind supported proxy software. |

### Supported Software

Production server software:

- Vanilla
- Paper
- Folia
- Purpur
- Fabric
- Forge
- NeoForge

Proxy software:

- Velocity
- Waterfall
- BungeeCord

### Requirements

The script automatically checks for the required tools and can install missing packages on Debian/Ubuntu:

- `bash`
- `curl`
- `jq`
- `screen`
- `tar`
- `gzip`
- Java/OpenJDK version required by the selected Minecraft version

Velocity builds require Java 21. The installer selects Java 21 for Velocity automatically and refreshes generated `start.sh` launchers before starting registered servers.

Non-Debian Linux distributions and macOS may work in compatibility mode, but Debian/Ubuntu is the intended production target.

### Quick Start

```bash
git clone https://github.com/devRaikou/mcserver-installer.git
cd mcserver-installer
chmod +x mcserver-installer
./mcserver-installer
```

### Headless Commands

Create a backup for a registered server without opening the interactive UI:

```bash
./mcserver-installer --backup <server_name>
```

This is useful for `cron`, remote automation, and external dashboards.

### Main Menu

```text
  Developer: devRaikou | Version: 1.55
  GitHub:    https://github.com/devRaikou/mcserver-installer
  ================================================================

  MAIN DIRECTORY MENU
  ================================================================

    1. Install Minecraft Server
    2. Manage Existing Server
    3. Update Server Jar
    4. Backup Server
    5. Restore Backup
    6. Remove Server / Registration
    7. Settings & System checks
    8. About
    9. Exit
  ================================================================
  Select option (1-9):
```

### Server Management

After a server is installed and registered, the management menu can:

- Start, stop, and restart the server.
- Open a managed console overlay or attach directly to GNU `screen`.
- View `logs/latest.log`.
- Edit `server.properties`.
- Create and restore backups.
- Configure automated backup schedules.
- Change RAM allocation in `start.sh`.
- Optimize common Paper/Spigot configuration values.
- Monitor live resource usage.
- Install or remove plugins.
- Enable or disable boot auto-start with `systemd`.

### Runtime Model

Each server is launched through a generated `start.sh` file. The script starts that file inside a detached `screen` session named with the pattern:

```text
mc-<server-name>-<path-hash>
```

The generated launcher includes a crash restart loop. Manual stops create a `.stop_restart` lock file so intentional shutdowns do not immediately restart.

### Backups

Manual and scheduled backups are stored in each server directory:

```text
<server>/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

Backups exclude the `backups` and `logs` directories to avoid recursive archives and unnecessary log growth.

### Settings

The installer stores its local settings and registry under:

```text
~/.mcserver-installer/
```

Important files:

- `registry.txt`: registered server name, path, software type, and version.
- `settings.conf`: language and Discord webhook settings.
- `.public_ip`: cached public IP used in UI and notifications.

### Verification

Run the verification script before publishing or after editing:

```bash
./verify.sh
```

It checks Bash syntax, executable permissions, and Mojang version manifest parsing through `curl` and `jq`.

### Developer

Developed by **devRaikou** and released under the MIT License.

### License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Turkce

`mcserver-installer`, Linux sistemlerinde Minecraft sunucusu kurmak, yapılandırmak ve yönetmek için hazırlanmış Bash tabanlı bir CLI aracıdır. En sorunsuz kullanım hedefi Debian ve Ubuntu sistemleridir.

Sunucu sahipleri ve yöneticileri için kurulum, güncelleme, yedekleme, çalışma kontrolü, eklenti yönetimi ve sistem kontrollerini tek terminal arayüzünde toplar.

### Ne Ise Yarar?

| Alan | Detay |
| --- | --- |
| Sunucu kurulumu | Vanilla, Paper, Folia, Purpur, Fabric, Forge, NeoForge, Velocity, Waterfall ve BungeeCord kurabilir. |
| Java yonetimi | Secilen Minecraft surumu icin gereken Java surumunu algilar ve gerekirse OpenJDK kurar. |
| Calisma kontrolu | Sunuculari bagimsiz GNU `screen` oturumlarinda baslatir; guvenli durdurma ve yeniden baslatma akislari sunar. |
| Yedekleme | Manuel yedek olusturur, `cron` ile gunluk veya haftalik otomatik yedek planlar. |
| Yapilandirma | Etkilesimli `server.properties` editoru ve RAM ayarlari sunar. |
| Izleme | Calisan sunucular icin canli CPU, RAM ve disk kullanimini gosterir. |
| Bildirimler | Baslatma, durdurma, zorla kapatma, yedekleme ve eklenti islemleri icin Discord webhook bildirimi gonderir. |
| Sistem acilisi | Kayitli sunucularin makine acilisinda baslamasi icin `systemd` servisi olusturur. |
| Eklentiler | Modrinth uzerinden uyumlu eklenti arar, kurar, siler ve Geyser/Floodgate kurulumu yapabilir. |
| Proxy aglari | Desteklenen proxy yazilimlarinin arkasina Paper backend sunuculari kurabilir. |

### Desteklenen Yazilimlar

Sunucu yazilimlari:

- Vanilla
- Paper
- Folia
- Purpur
- Fabric
- Forge
- NeoForge

Proxy yazilimlari:

- Velocity
- Waterfall
- BungeeCord

### Gereksinimler

Script gerekli araclari otomatik kontrol eder ve Debian/Ubuntu uzerinde eksik paketleri kurabilir:

- `bash`
- `curl`
- `jq`
- `screen`
- `tar`
- `gzip`
- Secilen Minecraft surumunun gerektirdigi Java/OpenJDK surumu

Velocity derlemeleri Java 21 gerektirir. Installer, Velocity icin Java 21'i otomatik secer ve kayitli sunucular baslatilmadan once olusturulan `start.sh` dosyasindaki Java yolunu yeniler.

Debian disi Linux dagitimlari ve macOS uyumluluk modunda calisabilir, ancak asil hedef uretim ortami Debian/Ubuntu sistemleridir.

### Hizli Baslangic

```bash
git clone https://github.com/devRaikou/mcserver-installer.git
cd mcserver-installer
chmod +x mcserver-installer
./mcserver-installer
```

### Etkilesimsiz Komutlar

Kayitli bir sunucunun yedegini arayuzu acmadan almak icin:

```bash
./mcserver-installer --backup <sunucu_adi>
```

Bu ozellik `cron`, uzak otomasyonlar ve harici paneller icin kullanislidir.

### Ana Menu

```text
  Geliştirici: devRaikou | Sürüm: 1.55
  GitHub:      https://github.com/devRaikou/mcserver-installer
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

### Sunucu Yonetimi

Bir sunucu kurulduktan ve kaydedildikten sonra yonetim menusu ile sunlari yapabilirsiniz:

- Sunucuyu baslatma, durdurma ve yeniden baslatma.
- Yonetimli konsol arayuzu acma veya dogrudan GNU `screen` oturumuna baglanma.
- `logs/latest.log` dosyasini goruntuleme.
- `server.properties` dosyasini duzenleme.
- Yedek olusturma ve yedekten geri yukleme.
- Otomatik yedekleme zamanlamasi ayarlama.
- `start.sh` icindeki RAM miktarlarini degistirme.
- Yaygin Paper/Spigot performans ayarlarini optimize etme.
- Canli kaynak kullanimini izleme.
- Eklenti kurma veya silme.
- `systemd` ile sistem acilisinda otomatik baslatmayi acma veya kapatma.

### Calisma Modeli

Her sunucu, kurulum sirasinda olusturulan `start.sh` dosyasi ile baslatilir. Bu dosya su formattaki bagimsiz bir `screen` oturumunda calisir:

```text
mc-<sunucu-adi>-<dizin-hash>
```

Olusturulan baslatici dosyada cokme sonrasi otomatik yeniden baslatma dongusu bulunur. Manuel durdurmalarda `.stop_restart` kilit dosyasi olusturularak sunucunun hemen yeniden baslamasi engellenir.

### Yedekler

Manuel ve otomatik yedekler her sunucunun kendi dizininde tutulur:

```text
<sunucu>/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

Yedekler olusturulurken `backups` ve `logs` dizinleri haric tutulur. Boylece tekrar eden arsivler ve gereksiz log buyumesi engellenir.

### Ayarlar

Installer yerel ayarlarini ve sunucu kayitlarini su dizinde tutar:

```text
~/.mcserver-installer/
```

Onemli dosyalar:

- `registry.txt`: kayitli sunucu adi, dizini, yazilim tipi ve surumu.
- `settings.conf`: dil ve Discord webhook ayarlari.
- `.public_ip`: arayuz ve bildirimlerde kullanilan onbellege alinmis genel IP.

### Dogrulama

Duzenleme yaptiktan veya yayinlamadan once dogrulama scriptini calistirin:

```bash
./verify.sh
```

Bu script Bash soz dizimini, calistirma iznini ve `curl`/`jq` ile Mojang surum manifestinin okunabildigini kontrol eder.

### Gelistirici

**devRaikou** tarafindan gelistirilmis olup MIT Lisansi ile yayinlanmistir.

### Lisans

Bu proje MIT Lisansi altinda yayinlanmistir. Detaylar icin [LICENSE](LICENSE) dosyasina bakin.
