import type { HelpTopicText } from './help-copy'

export const FR_HELP_TOPICS: HelpTopicText = {
  start: [
    'Commencer à regarder Netflix',
    '1. Ouvrez une vidéo Netflix.\n2. Sélectionnez Activer l’extension dans le menu de la barre d’outils ou dans les paramètres.\n3. Cliquez sur la vidéo et utilisez vos raccourcis.\n\nLes raccourcis fonctionnent sur les pages de lecture de Netflix et sont suspendus lorsque vous saisissez du texte.',
  ],
  edit: [
    'Attribuer, effacer, enregistrer et annuler les raccourcis',
    '1. Sélectionnez le crayon sur la ligne d’un raccourci.\n2. Cliquez dans la zone de saisie et appuyez sur la combinaison complète.\n3. Sélectionnez Enregistrer pour appliquer les modifications.\n\n- Effacer le raccourci (×) : effacez puis enregistrez pour laisser la touche non attribuée.\n- Enregistrer : applique le raccourci et les valeurs modifiées avec lui.\n- Annuler : abandonne les modifications en cours.\n- Annuler les modifications : récupère les valeurs présentes à l’ouverture de l’éditeur. Enregistrez pour les appliquer.\n\nLa plupart des options en dehors des fenêtres de modification sont enregistrées automatiquement.',
  ],
  supportedKeys: [
    'Touches réservées lors de la configuration',
    'Vous pouvez attribuer les touches courantes, multimédias, de volume et du navigateur lorsque le navigateur détecte ces touches.',
  ],
  conflicts: [
    'Résoudre les conflits de raccourcis',
    '- Les raccourcis actifs réservent leurs touches parmi les fonctions générales et celles de navigation par sous-titres, même si un interrupteur principal est désactivé.\n- La désactivation d’un raccourci individuel libère sa touche.\n- En cas de conflit, sélectionnez Changer de touche ou confirmez la réattribution pour désactiver le raccourci qui utilise la touche.\n- Appuyez sur Échap, cliquez en dehors de la fenêtre ou annulez pour abandonner les modifications.\n- Les raccourcis généraux sont prioritaires sur les raccourcis de sous-titres lorsque la touche est la même.\n- Réattribuer une action Netflix active bloque sa touche d’origine. Effacer ou désactiver le raccourci libère cette touche.',
  ],
  visibility: [
    'Afficher, masquer et réduire les fonctions',
    '1. Ouvrez Gérer les fonctions de la page en haut d’une section de raccourcis.\n2. Décochez les entrées ou les groupes pour prévisualiser leur masquage et leur désactivation.\n3. Sélectionnez Appliquer pour enregistrer. Annulez ou fermez le menu pour abandonner l’aperçu.\n\nLes fonctions masquées conservent leurs raccourcis et paramètres et disparaissent des résultats dans les paramètres et le menu de la barre d’outils. Cochez-les de nouveau pour les afficher. Les raccourcis en conflit restent désactivés.\n\nRéduire un tableau change uniquement son affichage. Ce guide inclut les fonctions masquées.',
  ],
  reset: [
    'Réinitialiser les paramètres et supprimer les entrées personnalisées',
    'Avant de réinitialiser, vérifiez les paramètres concernés dans la confirmation. Supprimer une entrée personnalisée efface aussi ses paramètres. Exportez une sauvegarde si vous souhaitez pouvoir les récupérer.',
  ],
  backup: [
    'Exporter et importer les paramètres',
    'Pour exporter, ouvrez Sauvegarde et restauration et téléchargez une copie JSON de vos paramètres.\n\nPour importer :\n\n1. Sélectionnez un fichier de sauvegarde.\n2. Vérifiez le résumé.\n3. Confirmez le remplacement des paramètres actuels.\n\nL’importation remplace les paramètres actuels. Exportez-les d’abord si vous souhaitez les conserver.\n\n- Les anciens formats compatibles sont convertis à l’importation.\n- Les fichiers invalides ou issus d’une version plus récente incompatible sont rejetés.\n- Annuler conserve les paramètres actuels.',
  ],
  sync: [
    'Synchronisation et erreurs d’enregistrement',
    'Les paramètres utilisent le stockage synchronisé du navigateur lorsqu’il est disponible. La synchronisation entre appareils dépend du navigateur et de votre compte.\n\n- Chrome et Edge utilisent des comptes de synchronisation distincts de Firefox. Exportez et importez vos paramètres pour les transférer.\n- En cas d’erreur, réessayez et vérifiez que la modification a été enregistrée avant de fermer.\n- Les modifications non enregistrées peuvent être annulées au profit des derniers paramètres confirmés.',
  ],
  diagnostics: [
    'Que faire si les raccourcis ne répondent pas',
    '1. Vérifiez l’interrupteur général, celui de chaque raccourci, les touches attribuées et la visibilité des fonctions. Pour passer d’un sous-titre à l’autre, activez aussi la navigation par sous-titres.\n2. Quittez les champs de texte et cliquez sur la vidéo Netflix.\n3. Ouvrez le menu de la barre d’outils pour vérifier la connexion. Après une mise à jour, rechargez Netflix si l’extension le demande.\n\nPour signaler un problème, sélectionnez Copier le diagnostic afin d’inclure les informations de lecture locales.\n\nL’image dans l’image de cette extension est disponible dans un navigateur Chromium compatible.',
  ],
  permissions: [
    'Accès aux sites et erreurs de sous-titres',
    'Autorisez l’extension à fonctionner sur Netflix.\n\n- La navigation par sous-titres peut aussi demander l’accès aux serveurs de sous-titres de Netflix (nflxvideo.net).\n- Si l’accès a été refusé ou révoqué, désactivez et réactivez la navigation par sous-titres pour le demander de nouveau. Vous pouvez aussi rétablir l’accès dans les autorisations de l’extension.\n- L’accès accordé est conservé lorsque vous désactivez la fonction.\n- Si le chargement échoue toujours, choisissez une autre piste de sous-titres ou rechargez Netflix.',
  ],
  privacy: [
    'Confidentialité et utilisation des données',
    '- Les sous-titres sont récupérés sur les serveurs de Netflix, traités sur l’appareil et conservés en mémoire pendant la lecture en cours.\n- Le traitement s’effectue sur l’appareil, sans service tiers d’analyse ou de traitement.\n- Les paramètres utilisent le stockage du navigateur.\n- Les rapports de compatibilité restent sur l’appareil et sont copiés uniquement lorsque vous sélectionnez Copier le diagnostic.\n- L’extension fonctionne sans analyse à distance ni suivi.',
  ],
}

export const DE_HELP_TOPICS: HelpTopicText = {
  start: [
    'Netflix-Wiedergabe starten',
    '1. Öffnen Sie ein Video auf Netflix.\n2. Wählen Sie im Symbolleistenmenü oder in den Einstellungen Erweiterung aktivieren.\n3. Klicken Sie auf das Video und verwenden Sie Ihre Tastenkürzel.\n\nTastenkürzel funktionieren auf Netflix-Wiedergabeseiten und werden ausgesetzt, solange Sie Text eingeben.',
  ],
  edit: [
    'Tastenkürzel festlegen, entfernen, speichern und verwerfen',
    '1. Wählen Sie das Stiftsymbol in der Zeile des Tastenkürzels.\n2. Klicken Sie in das Aufnahmefeld und drücken Sie die vollständige Tastenkombination.\n3. Wählen Sie Speichern, um die Änderungen zu übernehmen.\n\n- Tastenkürzel entfernen (×): Entfernen und speichern Sie die Belegung, um die Aktion ohne Tastenkürzel zu lassen.\n- Speichern: übernimmt die Taste und die mit ihr bearbeiteten Werte.\n- Abbrechen: verwirft den Entwurf.\n- Änderungen rückgängig machen: lädt die Werte vom Öffnen des Editors. Speichern Sie, um sie zu übernehmen.\n\nDie meisten Einstellungen außerhalb von Dialogen werden automatisch gespeichert.',
  ],
  supportedKeys: [
    'Reservierte Tasten beim Einrichten von Tastenkürzeln',
    'Normale Tastaturtasten, Medien-, Lautstärke- und Browsertasten können zugewiesen werden, wenn der Browser ihre Eingaben erkennt.',
  ],
  conflicts: [
    'Konflikte zwischen Tastenkürzeln lösen',
    '- Aktive Tastenkürzel reservieren ihre Tasten sowohl bei den allgemeinen Aktionen als auch bei der Untertitelnavigation. Das gilt auch bei deaktiviertem Hauptschalter.\n- Das Deaktivieren eines einzelnen Tastenkürzels gibt seine Taste frei.\n- Im Konfliktfall wählen Sie Taste ändern oder bestätigen die Neuzuweisung, um das bisherige Tastenkürzel zu deaktivieren.\n- Drücken Sie Esc, klicken Sie außerhalb des Dialogs oder brechen Sie ab, um den Entwurf zu verwerfen.\n- Bei gleicher Taste haben allgemeine Tastenkürzel Vorrang vor Untertitelkürzeln.\n- Die Neubelegung einer aktiven Netflix-Aktion unterdrückt ihre ursprüngliche Taste. Das Entfernen oder Deaktivieren des Kürzels gibt diese Taste wieder frei.',
  ],
  visibility: [
    'Funktionen anzeigen, ausblenden und einklappen',
    '1. Öffnen Sie oben in einem Tastenkürzelbereich Seitenfunktionen verwalten.\n2. Entfernen Sie Häkchen, um das Ausblenden und Deaktivieren von einzelnen Einträgen oder Gruppen in der Vorschau zu sehen.\n3. Wählen Sie Übernehmen zum Speichern. Brechen Sie ab oder schließen Sie das Menü, um die Vorschau zu verwerfen.\n\nAusgeblendete Funktionen behalten ihre Tasten und Einstellungen. Sie erscheinen weder in den Einstellungen noch in der Suche des Symbolleistenmenüs. Setzen Sie das Häkchen erneut, um sie anzuzeigen. Tastenkürzel mit Konflikten bleiben deaktiviert.\n\nDas Einklappen einer Tabelle ändert nur die Anzeige. Dieses Handbuch enthält auch ausgeblendete Funktionen.',
  ],
  reset: [
    'Einstellungen zurücksetzen und eigene Einträge löschen',
    'Prüfen Sie vor dem Zurücksetzen in der Bestätigung, welche Einstellungen betroffen sind. Beim Löschen eines eigenen Eintrags werden seine Einstellungen entfernt. Exportieren Sie eine Sicherung, wenn Sie die Einstellungen später wiederherstellen möchten.',
  ],
  backup: [
    'Einstellungen exportieren und importieren',
    'Zum Exportieren öffnen Sie Sicherung und Wiederherstellung und laden eine JSON-Datei mit Ihren Einstellungen herunter.\n\nZum Importieren:\n\n1. Wählen Sie eine Sicherungsdatei aus.\n2. Prüfen Sie die Zusammenfassung.\n3. Bestätigen Sie das Ersetzen der aktuellen Einstellungen.\n\nDer Import ersetzt die aktuellen Einstellungen. Exportieren Sie sie vorher, wenn Sie sie behalten möchten.\n\n- Unterstützte ältere Formate werden beim Import aktualisiert.\n- Ungültige oder neuere inkompatible Sicherungen werden abgelehnt.\n- Beim Abbrechen bleiben die aktuellen Einstellungen erhalten.',
  ],
  sync: [
    'Synchronisierung und Speicherfehler',
    'Die Einstellungen verwenden den synchronisierten Browserspeicher, sofern dieser verfügbar ist. Die Synchronisierung zwischen Geräten hängt von Ihrem Browser und Konto ab.\n\n- Chrome und Edge verwenden andere Synchronisierungskonten als Firefox. Exportieren und importieren Sie Ihre Einstellungen für den Wechsel zwischen Browsern.\n- Versuchen Sie die Änderung bei einem Speicherfehler erneut und prüfen Sie vor dem Schließen, ob sie gespeichert wurde.\n- Bei ungespeicherten Änderungen können die zuletzt bestätigten Einstellungen wiederhergestellt werden.',
  ],
  diagnostics: [
    'Wenn Tastenkürzel nicht reagieren',
    '1. Prüfen Sie Hauptschalter, Schalter einzelner Zeilen, Tastenbelegung und Sichtbarkeit der Funktionen. Aktivieren Sie für Untertitelsprünge auch die Untertitelnavigation.\n2. Verlassen Sie Textfelder und klicken Sie auf das Netflix-Video.\n3. Prüfen Sie die Verbindung im Symbolleistenmenü. Laden Sie Netflix nach einem Update neu, wenn Sie dazu aufgefordert werden.\n\nWählen Sie für eine Fehlermeldung Diagnose kopieren, um lokale Wiedergabedaten beizufügen.\n\nDas Bild-im-Bild-Fenster dieser Erweiterung ist in kompatiblen Chromium-Browsern verfügbar.',
  ],
  permissions: [
    'Websitezugriff und Untertitelfehler',
    'Erlauben Sie der Erweiterung, auf Netflix ausgeführt zu werden.\n\n- Für die Untertitelnavigation kann zusätzlicher Zugriff auf die Netflix-Untertitelserver (nflxvideo.net) nötig sein.\n- Bei verweigertem oder widerrufenem Zugriff schalten Sie die Untertitelnavigation aus und wieder ein, um erneut um Zugriff zu bitten. Alternativ können Sie ihn in den Erweiterungsberechtigungen erlauben.\n- Bereits erteilter Zugriff bleibt beim Ausschalten der Funktion bestehen.\n- Wählen Sie eine andere Untertitelspur oder laden Sie Netflix neu, wenn das Laden weiterhin fehlschlägt.',
  ],
  privacy: [
    'Datenschutz und Datennutzung',
    '- Untertitel werden von Netflix-Servern abgerufen, lokal verarbeitet und während der laufenden Wiedergabe im Arbeitsspeicher vorgehalten.\n- Die Verarbeitung findet auf Ihrem Gerät statt, ohne Analyse- oder Verarbeitungsdienste Dritter.\n- Einstellungen werden im Browser gespeichert.\n- Kompatibilitätsberichte bleiben auf dem Gerät und werden nur bei Auswahl von Diagnose kopieren kopiert.\n- Die Erweiterung verwendet keine externe Analyse und kein Tracking.',
  ],
}

export const ID_HELP_TOPICS: HelpTopicText = {
  start: [
    'Mulai menonton Netflix',
    '1. Buka video Netflix.\n2. Pilih Aktifkan ekstensi di menu bilah alat atau pengaturan.\n3. Klik video, lalu gunakan pintasan Anda.\n\nPintasan berfungsi di halaman pemutaran Netflix dan dijeda saat Anda mengetik di kolom teks.',
  ],
  edit: [
    'Tetapkan, kosongkan, simpan, dan batalkan pintasan',
    '1. Pilih ikon pensil pada baris pintasan.\n2. Klik area perekaman dan tekan kombinasi tombol lengkap.\n3. Pilih Simpan untuk menerapkan perubahan.\n\n- Kosongkan pintasan (×): kosongkan lalu simpan agar tindakan tidak memiliki pintasan.\n- Simpan: terapkan tombol dan nilai yang diedit bersamanya.\n- Batal: buang perubahan yang belum disimpan.\n- Urungkan perubahan: kembalikan nilai saat editor dibuka. Simpan untuk menerapkannya.\n\nSebagian besar opsi di luar dialog disimpan secara otomatis.',
  ],
  supportedKeys: [
    'Tombol yang dibatasi saat mengatur pintasan',
    'Tombol umum, media, volume, dan browser dapat ditetapkan jika browser mendeteksi penekanannya.',
  ],
  conflicts: [
    'Atasi benturan pintasan',
    '- Pintasan aktif mencadangkan tombolnya di antara pintasan umum dan navigasi subtitel, meskipun sakelar utama nonaktif.\n- Menonaktifkan satu pintasan akan membebaskan tombolnya.\n- Jika terjadi benturan, pilih Ganti tombol atau konfirmasikan pengalihan untuk menonaktifkan pintasan yang memakai tombol itu.\n- Tekan Esc, klik di luar dialog, atau pilih Batal untuk membuang perubahan.\n- Jika memakai tombol yang sama, pintasan umum lebih diutamakan daripada pintasan subtitel.\n- Mengganti tombol untuk tindakan Netflix yang aktif akan memblokir tombol aslinya. Kosongkan atau nonaktifkan pintasan untuk membebaskan tombol asli.',
  ],
  visibility: [
    'Tampilkan, sembunyikan, dan tutup fitur',
    '1. Buka Kelola fitur halaman di bagian atas kelompok pintasan.\n2. Hapus centang pada item atau grup untuk melihat pratinjau penyembunyian dan penonaktifan.\n3. Pilih Terapkan untuk menyimpan. Pilih Batal atau tutup menu untuk membuang pratinjau.\n\nFitur yang disembunyikan tetap menyimpan tombol dan parameternya, tetapi tidak muncul di pengaturan atau pencarian menu bilah alat. Centang lagi untuk menampilkannya. Pintasan yang bentrok tetap nonaktif.\n\nMenutup tabel hanya mengubah tampilannya. Panduan ini tetap mencakup fitur yang disembunyikan.',
  ],
  reset: [
    'Atur ulang pengaturan dan hapus item khusus',
    'Sebelum mengatur ulang, periksa pengaturan yang terdampak di dialog konfirmasi. Menghapus item khusus juga menghapus pengaturannya. Ekspor cadangan jika ingin memulihkannya nanti.',
  ],
  backup: [
    'Ekspor dan impor pengaturan',
    'Untuk mengekspor, buka Pencadangan dan pemulihan lalu unduh file JSON pengaturan Anda.\n\nUntuk mengimpor:\n\n1. Pilih file cadangan.\n2. Tinjau ringkasannya.\n3. Konfirmasikan penggantian pengaturan saat ini.\n\nImpor mengganti pengaturan saat ini. Ekspor terlebih dahulu jika ingin menyimpannya.\n\n- Format lama yang didukung diperbarui saat diimpor.\n- Cadangan tidak valid atau dari versi lebih baru yang tidak didukung akan ditolak.\n- Jika Anda membatalkan, pengaturan saat ini tetap sama.',
  ],
  sync: [
    'Sinkronisasi dan kesalahan penyimpanan',
    'Pengaturan menggunakan penyimpanan sinkron browser jika tersedia. Sinkronisasi antarperangkat bergantung pada browser dan akun Anda.\n\n- Chrome dan Edge menggunakan akun sinkronisasi yang berbeda dari Firefox. Ekspor dan impor pengaturan untuk memindahkannya.\n- Jika gagal menyimpan, ulangi perubahan dan pastikan sudah tersimpan sebelum menutup.\n- Perubahan yang belum tersimpan dapat dikembalikan ke pengaturan terakhir yang berhasil disimpan.',
  ],
  diagnostics: [
    'Jika pintasan tidak merespons',
    '1. Periksa sakelar utama, sakelar tiap pintasan, tombol yang ditetapkan, dan apakah fitur ditampilkan. Untuk melompat di antara subtitel, aktifkan juga navigasi subtitel.\n2. Keluar dari kolom teks dan klik video Netflix.\n3. Buka menu bilah alat untuk memeriksa koneksi. Muat ulang Netflix setelah pembaruan jika diminta.\n\nUntuk melaporkan masalah, pilih Salin diagnostik agar detail pemutaran lokal dapat disertakan.\n\nMode gambar dalam gambar ekstensi ini tersedia di browser Chromium yang mendukungnya.',
  ],
  permissions: [
    'Akses situs dan kesalahan subtitel',
    'Izinkan ekstensi berjalan di Netflix.\n\n- Navigasi subtitel juga dapat meminta akses ke server subtitel Netflix (nflxvideo.net).\n- Jika akses ditolak atau dicabut, nonaktifkan lalu aktifkan kembali navigasi subtitel untuk memintanya lagi. Anda juga dapat memulihkan akses dari pengaturan izin ekstensi di browser.\n- Akses yang diberikan tetap berlaku saat fitur dimatikan.\n- Jika subtitel masih gagal dimuat, pilih trek subtitel lain atau muat ulang Netflix.',
  ],
  privacy: [
    'Privasi dan penggunaan data',
    '- Subtitel diambil dari server Netflix, diproses secara lokal, dan disimpan sementara dalam memori selama sesi pemutaran.\n- Pemrosesan berlangsung di perangkat, tanpa layanan analitik atau pemrosesan pihak ketiga.\n- Pengaturan menggunakan penyimpanan browser.\n- Laporan kompatibilitas tetap di perangkat dan disalin hanya saat Anda memilih Salin diagnostik.\n- Ekstensi ini tidak menggunakan analitik jarak jauh atau pelacakan.',
  ],
}
