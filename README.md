# Mein Training – persönliche Trainings-App (PWA)

Eine schlanke Web-App fürs Handy, die dein eigenes Trainingsprogramm zeigt: Tage, Übungen mit Bild, Sätze, Wiederholungen, Gewichte und Pausen. Du bestätigst jeden Satz per Knopfdruck, die App merkt sich alles lokal auf dem Gerät – auch ein angefangenes Training (Zwischenspeicher) – und läuft nach der Installation offline.

Kein Server, kein Konto, keine Abhängigkeiten. Reines HTML, CSS und JavaScript.

## Inhalt

1. [Was die App kann](#was-die-app-kann)
2. [Aufs Handy bringen](#aufs-handy-bringen)
3. [Bedienung](#bedienung)
4. [Trainingsprogramm anpassen](#trainingsprogramm-anpassen)
5. [So funktioniert der Speicher](#so-funktioniert-der-speicher)
6. [Steigerung und Kalorien](#steigerung-und-kalorien)
7. [Projektstruktur](#projektstruktur)
8. [Weiterentwickeln](#weiterentwickeln)

## Was die App kann

- **Übersicht** aller Trainingstage mit Piktogrammen, Muskelgruppen, Dauer und «zuletzt vor x Tagen». Der heutige Wochentag wird markiert.
- **Tabellenansicht** des ganzen Programms (Übung, Muskel, Sätze, Wiederholungen/Zeit, Gewicht, Pause).
- **Training durchführen**: pro Satz Gewicht und Wiederholungen eintragen und mit ✓ bestätigen. Fortschrittsbalken, «Alle bestätigen» pro Übung, Technik-Hinweise aufklappbar.
- **Pausen-Timer** startet automatisch nach jedem bestätigten Satz (mit Vibration, optional Ton). Für Zeit-Übungen (Plank, Seilspringen, Stepper) gibt es einen ▶-Timer für die Belastungszeit.
- **Zwischenspeicher**: Ein laufendes Training bleibt beim Schliessen des Browsers erhalten, inklusive Timer. Auf der Startseite steht «Fortsetzen».
- **Verlauf** aller abgeschlossenen Trainings mit jedem Satz, Dauer und Kalorienschätzung.
- **Letztes Mal** und **Rekord** direkt an der Übung. Die App schlägt das nächste Gewicht nach deiner Steigerungsregel vor.
- **Editor** für Tage und Übungen: Name, Muskelgruppe, Piktogramm oder eigenes Foto (Kamera/Galerie), Sätze, Wiederholungen oder Zeit, Gewicht, Pause, Steigerung, Abschnitte (z.B. «Zirkel · 4 Runden»), Reihenfolge.
- **Sicherung** als JSON-Datei exportieren und importieren (inklusive Fotos).
- **Hell/Dunkel** nach System oder manuell, Bildschirm bleibt während des Trainings an.

## Aufs Handy bringen

### Variante A: GitHub Pages (empfohlen)

1. Auf GitHub: **Settings → Pages → Build and deployment → Source: «Deploy from a branch»**.
2. Als Branch den Standard-Branch wählen (aktuell `claude/visual-training-program-mobile-eh94gq`; du kannst ihn unter Settings → Branches auch in `main` umbenennen), Ordner `/ (root)`, speichern.
3. Nach ein bis zwei Minuten ist die App erreichbar unter
   `https://white3rabbit.github.io/Eigene-Fitness-App/`
4. Diese Adresse auf dem Handy öffnen und installieren (siehe unten).

Wenn das Repository privat ist, braucht GitHub Pages einen bezahlten Plan. Alternative: das Repository auf «Public» stellen (es enthält keine persönlichen Daten, dein Verlauf bleibt nur auf dem Handy) oder Variante B nutzen.

### Variante B: Lokal im WLAN testen

Auf dem PC im Projektordner einen kleinen Webserver starten:

```bash
python3 -m http.server 8080
# oder mit Node:
npx http-server . -p 8080
```

Dann auf dem Handy `http://<IP-des-PCs>:8080` öffnen (gleiches WLAN). Der Offline-Modus (Service Worker) braucht HTTPS oder `localhost`, deshalb funktioniert die Installation als App hier nur eingeschränkt. Zum Ausprobieren reicht es.

### Als App installieren

- **Android (Chrome)**: Menü ⋮ → «Zum Startbildschirm hinzufügen» bzw. «App installieren».
- **iPhone (Safari)**: Teilen-Symbol → «Zum Home-Bildschirm».

Danach startet die App wie eine normale App, ohne Browserleiste, und funktioniert auch ohne Internet.

## Bedienung

| Bereich | Was du dort tust |
|---|---|
| **Training** (Startseite) | Trainingstag öffnen, «Training starten», laufendes Training fortsetzen oder verwerfen. «Als Tabelle» zeigt das ganze Programm kompakt. |
| **Trainingstag** | Pro Satz Gewicht/Wiederholungen eintragen und ✓ drücken. Nach dem Satz läuft die Pause. Unten «Training abschliessen». |
| **Verlauf** | Abgeschlossene Trainings aufklappen, Einträge löschen. |
| **Bearbeiten** | Programmname, Regeln, Tage und Übungen anpassen. Reihenfolge mit ↑↓. |
| **Einstellungen** | Timer, Vibration, Ton, Design, Körperdaten, Sicherung exportieren/importieren, Beispielprogramm zurücksetzen. |

Bei Übungen mit Wiederholungsbereich (z.B. 10–12) wird die Wiederholungszahl aus dem letzten Training vorbelegt, das Gewicht ebenfalls. Bei Zeit-Übungen steht die Zielzeit im Feld; ▶ startet den Countdown.

## Trainingsprogramm anpassen

Es gibt drei Wege. Sie lassen sich kombinieren.

### 1. In der App (Bereich «Bearbeiten»)

Das ist der normale Weg auf dem Handy. Änderungen werden sofort gespeichert. Eigene Fotos werden verkleinert (max. 900 px) und im Gerätespeicher abgelegt.

### 2. In der Datei `js/default-program.js`

Das Programm, das beim ersten Start geladen wird. Praktisch, wenn du den Plan am PC pflegst und ins Git einchecken willst. Nach einer Änderung in der Datei: in der App unter Einstellungen «Beispielprogramm laden» (ersetzt das gespeicherte Programm, der Verlauf bleibt).

Felder pro Übung:

| Feld | Bedeutung | Beispiel |
|---|---|---|
| `id` | Stabile Kennung, verknüpft Verlauf und Rekorde | `'fr-kniebeugen'` |
| `name` | Anzeigename | `'Kniebeugen'` |
| `muscle` | Muskelgruppe / Kategorie | `'Beine'` |
| `image` | Piktogramm, Bild-URL oder `idb:<key>` (eigenes Foto) | `'img/exercises/barbell.svg'` |
| `type` | `'reps'` (Wiederholungen) oder `'time'` (Sekunden) | `'reps'` |
| `sets` | Anzahl Sätze bzw. Runden | `3` |
| `reps` | Ziel-Wiederholungen als Text | `'10–12'`, `'10 je Bein'`, `'max'` |
| `duration` | Zielzeit in Sekunden (nur `type: 'time'`) | `40` |
| `weight` | Startgewicht, `null` = beim ersten Training eintragen | `null` |
| `useWeight` | `false` = ohne Gewichtsfeld (Körpergewicht, Cardio, Core) | `false` |
| `unit` | `'kg'` oder `'lb'` | `'kg'` |
| `rest` | Pause nach dem Satz in Sekunden, `0` = kein Timer | `75` |
| `increment` | Steigerung in kg, wenn alle Sätze die obere Wiederholungszahl erreichen | `2.5` |
| `track` | `'max'` = Rekord verfolgen | `'max'` |
| `section` | Abschnittstitel, gruppiert aufeinanderfolgende Übungen | `'Zirkel · 4 Runden'` |
| `setLabel` | Beschriftung der Sätze | `'Runde'` |
| `met` | Belastungswert für die Kalorienschätzung (optional) | `11` |
| `notes` | Technik-Hinweise, `\n` für Zeilenumbruch | `'Rücken gerade …'` |

Felder pro Tag: `id`, `name`, `weekday` (0 = Sonntag … 6 = Samstag, `null` = kein fester Tag), `color`, `duration` (Minuten), `note`, `exercises`.

Verfügbare Piktogramme in `img/exercises/`: `barbell`, `dumbbell`, `kettlebell`, `machine`, `bodyweight`, `core`, `cardio`, `stretch`. Eigene SVGs einfach dazulegen und in `sw.js` in die Liste `ASSETS` aufnehmen, damit sie offline verfügbar sind.

### 3. Sicherung importieren

Unter Einstellungen «Sicherung exportieren» erzeugt eine JSON-Datei mit Programm, Verlauf, Einstellungen und Fotos. Diese Datei kannst du auf einem anderen Gerät importieren oder am PC bearbeiten. Beim Import wird das Programm ersetzt; Verlauf und Einstellungen werden übernommen, wenn sie in der Datei stehen.

Der aktuelle Plan ist zusätzlich als lesbare Tabelle in [`docs/trainingsplan.md`](docs/trainingsplan.md) abgelegt.

## So funktioniert der Speicher

Alle Daten bleiben auf dem Gerät. Es wird nichts hochgeladen.

| Speicher | Inhalt | Hinweis |
|---|---|---|
| `localStorage` | Programm (`mt.program`), laufendes Training (`mt.session`), Verlauf (`mt.history`), Einstellungen (`mt.settings`) | Kleine JSON-Daten, wird bei jeder Änderung sofort geschrieben |
| IndexedDB | Eigene Fotos (Datenbank `mein-training`, Store `images`) | Bilder sind zu gross für localStorage |
| Service-Worker-Cache | Die App-Dateien selbst | Macht die App offline nutzbar |

**Zwischenspeicher fürs Training:** Jeder bestätigte Satz und jede Eingabe wird sofort in `mt.session` geschrieben. Wird der Browser geschlossen oder das Handy geht aus, findest du das Training beim nächsten Öffnen genau an dieser Stelle wieder, inklusive laufendem Pausen-Timer.

**Wichtig:** Wer im Browser «Websitedaten löschen» ausführt, löscht auch Programm und Verlauf. Deshalb ab und zu eine Sicherung exportieren (Einstellungen). Auf dem Handy landet die Datei über das Teilen-Menü z.B. in der Cloud oder in einer Notiz-App.

## Steigerung und Kalorien

**Gewichte:** Erreichen alle Sätze einer Übung die obere Zahl des Wiederholungsbereichs (z.B. 3 × 12 bei «10–12»), schlägt die App beim nächsten Training das Gewicht plus `increment` vor und belegt die Felder entsprechend vor. Im Beispielprogramm: +2.5 kg, bei Beinübungen +5 kg. Der Vorschlag ist nur eine Vorbelegung, du kannst jederzeit etwas anderes eintragen.

**Rekorde:** Bei Übungen mit `track: 'max'` (Seilspringen) zeigt die App den bisherigen Rekord und das Wochenziel (+5 bis +10).

**Kalorien:** Beim Abschliessen und im Verlauf steht eine grobe Schätzung nach MET-Werten (Belastung × Körpergewicht × Zeit). Körpergewicht und Grösse stehen in den Einstellungen (voreingestellt 98 kg, 185 cm). Die Zahl ist eine Orientierung, kein Messwert.

## Projektstruktur

```
index.html              App-Gerüst (Kopfzeile, Ansicht, Tab-Leiste, Timer-Leiste)
manifest.webmanifest    PWA-Manifest (Name, Icons, Farben)
sw.js                   Service Worker: Offline-Cache der App-Dateien
css/app.css             Gestaltung, helles und dunkles Design
js/storage.js           Speicher-Schicht (localStorage + IndexedDB)
js/default-program.js   Standard-Trainingsprogramm (dein Plan)
js/app.js               App-Logik: Routing, Ansichten, Aktionen, Timer, Export/Import
img/icon.svg, icon-*.png   App-Icon
img/exercises/*.svg     Piktogramme für Übungen
docs/trainingsplan.md   Der Plan als lesbare Tabelle
```

Die App ist als Single-Page-App mit Hash-Routing gebaut (`#/`, `#/day/<id>`, `#/history`, `#/edit`, `#/settings`). Jede Ansicht ist eine Funktion in `js/app.js`, die HTML als Text zurückgibt. Klicks werden zentral über `data-action`-Attribute verarbeitet.

## Weiterentwickeln

**Nach Änderungen an den Dateien** die Konstante `VERSION` in `sw.js` erhöhen (z.B. `mein-training-v2`). Installierte Apps laden dann beim nächsten Start die neue Fassung und zeigen «Neue Version verfügbar».

**Lokal testen:** einen Webserver im Projektordner starten (siehe Variante B) und `http://localhost:8080` öffnen. Die Browser-Konsole zeigt Fehler; `window.MeinTraining.state` gibt Einblick in den aktuellen Zustand.

**Ideen für später:**
- Wochenkalender mit geplanten und erledigten Tagen
- Verlaufskurven pro Übung (Gewicht und Wiederholungen über die Zeit)
- Automatischer Rundenmodus für Zirkel (Runde für Runde durchführen)
- Export des Verlaufs als CSV oder Markdown für Obsidian
- Plan-Varianten (Deload-Woche, Urlaubsprogramm)
