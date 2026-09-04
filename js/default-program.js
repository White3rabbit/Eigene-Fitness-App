/* Standard-Trainingsprogramm
   Wird beim ersten Start geladen und kann in der App unter «Bearbeiten» angepasst werden.
   Felder pro Übung:
     id         eindeutige Kennung (bleibt stabil, damit der Verlauf zugeordnet werden kann)
     name       Anzeigename
     muscle     Muskelgruppe / Kategorie
     image      Piktogramm (img/exercises/*.svg), Bild-URL oder «idb:<key>» für eigene Fotos
     type       'reps' (Wiederholungen) oder 'time' (Zeit in Sekunden)
     sets       Anzahl Sätze bzw. Runden
     reps       Ziel-Wiederholungen als Text, z.B. '10–12', '10 je Bein', 'max'
     duration   Zielzeit in Sekunden (nur bei type 'time')
     weight     Startgewicht (null = beim ersten Training eintragen)
     useWeight  false = ohne Gewichtseingabe (Körpergewicht, Cardio, Core)
     rest       Pause nach dem Satz in Sekunden (0 = kein Pausen-Timer)
     increment  Steigerung in kg, wenn alle Sätze die obere Wiederholungszahl erreichen
     track      'max' = Rekord verfolgen (z.B. Seilspringen)
     section    optionaler Abschnittstitel (z.B. Zirkel), gruppiert aufeinanderfolgende Übungen
     setLabel   Beschriftung der Sätze, z.B. 'Runde' statt 'Satz'
     met        Belastungswert für die Kalorienschätzung (optional)
     notes      Technik-Hinweise
*/
'use strict';

const DEFAULT_PROGRAM = {
  version: 1,
  name: 'Mein Trainingsplan',
  notes:
    'Steigerung Gewichte: Wenn du 12 Wiederholungen sauber schaffst, nächstes Mal 2.5 kg mehr (Beine 5 kg). ' +
    'Die App schlägt das neue Gewicht automatisch vor.\n' +
    'Seilspringen: Rekord notieren, Ziel +5–10 Sprünge pro Woche. Von 70 kommst du so in zwei Monaten Richtung 150.\n' +
    'Dienstag ausgefallen? Dann das 20-Minuten-Programm zu Hause.',
  days: [
    {
      id: 'fr-ganzkoerper',
      name: 'Freitag · Ganzkörper',
      weekday: 5,
      color: '#14889a',
      duration: 75,
      note: 'Kraft: je 3 Sätze × 10–12 Wiederholungen, 60–90 s Pause.',
      exercises: [
        {
          id: 'fr-stepper-warm', name: 'Stepper (Aufwärmen)', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 1, duration: 600, useWeight: false, rest: 0, met: 6,
          notes: 'Locker, ruhiges Tempo. Ziel: warm werden, nicht auspowern.',
        },
        {
          id: 'fr-kniebeugen', name: 'Kniebeugen', muscle: 'Beine', image: 'img/exercises/barbell.svg',
          type: 'reps', sets: 3, reps: '10–12', weight: null, unit: 'kg', rest: 75, increment: 5,
          notes: 'Füsse schulterbreit, Knie in Richtung Zehen, Rücken gerade. So tief, dass die Oberschenkel etwa parallel zum Boden sind.\nSteigerung: 12 saubere Wdh in allen Sätzen → nächstes Mal +5 kg.',
        },
        {
          id: 'fr-hip-thrust', name: 'Hip Thrust / Glute Bridge', muscle: 'Gesäss', image: 'img/exercises/barbell.svg',
          type: 'reps', sets: 3, reps: '10–12', weight: null, unit: 'kg', rest: 75, increment: 5,
          notes: 'Oben kurz anspannen, Becken ganz strecken, Kinn leicht zur Brust.\nSteigerung: 12 saubere Wdh → +5 kg.',
        },
        {
          id: 'fr-rudern', name: 'Rudern (Kabel oder Maschine)', muscle: 'Rücken', image: 'img/exercises/machine.svg',
          type: 'reps', sets: 3, reps: '10–12', weight: null, unit: 'kg', rest: 75, increment: 2.5,
          notes: 'Schultern hinten-unten, Ellbogen nah am Körper, am Ende kurz halten.\nSteigerung: 12 saubere Wdh → +2.5 kg.',
        },
        {
          id: 'fr-bankdruecken', name: 'Bankdrücken (oder Liegestütze)', muscle: 'Brust', image: 'img/exercises/barbell.svg',
          type: 'reps', sets: 3, reps: '10–12', weight: null, unit: 'kg', rest: 75, increment: 2.5,
          notes: 'Schulterblätter zusammen, Füsse fest am Boden, Stange kontrolliert zur Brust.\nAlternative: Liegestütze mit gleichen Sätzen.\nSteigerung: 12 saubere Wdh → +2.5 kg.',
        },
        {
          id: 'fr-ausfallschritte', name: 'Ausfallschritte', muscle: 'Beine', image: 'img/exercises/dumbbell.svg',
          type: 'reps', sets: 3, reps: '10 je Bein', weight: null, unit: 'kg', rest: 75, increment: 5,
          notes: '10 pro Bein. Oberkörper aufrecht, vorderes Knie über dem Fuss, hinteres Knie fast bis zum Boden.\nSteigerung: sauber geschafft → +5 kg (Gesamtgewicht der Hanteln).',
        },
        {
          id: 'fr-latzug', name: 'Latzug', muscle: 'Rücken', image: 'img/exercises/machine.svg',
          type: 'reps', sets: 3, reps: '10–12', weight: null, unit: 'kg', rest: 75, increment: 2.5,
          notes: 'Zur oberen Brust ziehen, Ellbogen nach unten, Oberkörper nur leicht zurück.\nSteigerung: 12 saubere Wdh → +2.5 kg.',
        },
        {
          id: 'fr-seilspringen', name: 'Seilspringen (Maximum)', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'reps', sets: 6, reps: 'max', useWeight: false, rest: 60, track: 'max', met: 11,
          notes: 'So viele Sprünge wie möglich am Stück, dann 60 s Pause. Zahl eintragen – die App merkt sich den Rekord.\nZiel: +5–10 Sprünge pro Woche (von 70 Richtung 150 in zwei Monaten).',
        },
        {
          id: 'fr-plank', name: 'Plank (Bosu/Ball)', muscle: 'Core', image: 'img/exercises/core.svg',
          type: 'time', sets: 3, duration: 40, useWeight: false, rest: 45, met: 3.8, section: 'Core auf Bosu / Ball',
          notes: 'Körper in einer Linie, Bauch fest, nicht ins Hohlkreuz fallen.',
        },
        {
          id: 'fr-crunches', name: 'Crunches (Ball)', muscle: 'Core', image: 'img/exercises/core.svg',
          type: 'reps', sets: 3, reps: '15', useWeight: false, rest: 45, met: 3.8, section: 'Core auf Bosu / Ball',
          notes: 'Langsam hoch, Blick zur Decke, unten nicht ganz ablegen.',
        },
        {
          id: 'fr-seitstuetz', name: 'Seitstütz (je Seite)', muscle: 'Core', image: 'img/exercises/core.svg',
          type: 'time', sets: 3, duration: 30, useWeight: false, rest: 30, met: 3.8, section: 'Core auf Bosu / Ball',
          notes: '30 s pro Seite, dann wechseln. Hüfte oben halten, Körper gerade.',
        },
        {
          id: 'fr-stepper-end', name: 'Stepper (Abschluss)', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 1, duration: 900, useWeight: false, rest: 0, met: 9,
          notes: 'Zügiges Tempo, 15 Minuten durchziehen.',
        },
      ],
    },
    {
      id: 'di-zirkel',
      name: 'Dienstag · Zirkel',
      weekday: 2,
      color: '#d99a2f',
      duration: 45,
      note: 'Zirkel: 4 Runden, zwischen den Übungen kaum Pause, nach jeder Runde 90 s.',
      exercises: [
        {
          id: 'di-warm', name: 'Aufwärmen: Stepper oder Laufen', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 1, duration: 300, useWeight: false, rest: 0, met: 6,
          notes: '5 Minuten locker.',
        },
        {
          id: 'di-goblet', name: 'Goblet-Squat', muscle: 'Beine', image: 'img/exercises/kettlebell.svg',
          type: 'reps', sets: 4, reps: '12', weight: null, unit: 'kg', rest: 0, increment: 5, section: 'Zirkel · 4 Runden', setLabel: 'Runde',
          notes: 'Kettlebell oder Kurzhantel vor der Brust, Ellbogen innen an den Knien vorbei, Brust raus.',
        },
        {
          id: 'di-liegestuetze', name: 'Liegestütze', muscle: 'Brust', image: 'img/exercises/bodyweight.svg',
          type: 'reps', sets: 4, reps: '10', useWeight: false, rest: 0, section: 'Zirkel · 4 Runden', setLabel: 'Runde',
          notes: 'Körper gespannt, Ellbogen etwa 45° zum Körper.',
        },
        {
          id: 'di-rudern', name: 'Rudern', muscle: 'Rücken', image: 'img/exercises/machine.svg',
          type: 'reps', sets: 4, reps: '12', weight: null, unit: 'kg', rest: 0, increment: 2.5, section: 'Zirkel · 4 Runden', setLabel: 'Runde',
          notes: 'Kabel oder Maschine. Ellbogen nah am Körper, Schultern hinten-unten.',
        },
        {
          id: 'di-stepups', name: 'Step-ups', muscle: 'Beine', image: 'img/exercises/dumbbell.svg',
          type: 'reps', sets: 4, reps: '10 je Bein', weight: null, unit: 'kg', rest: 0, increment: 5, section: 'Zirkel · 4 Runden', setLabel: 'Runde',
          notes: '10 pro Bein. Über die Ferse hochdrücken, oben ganz strecken.',
        },
        {
          id: 'di-seil', name: 'Seilspringen', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 4, duration: 60, useWeight: false, rest: 90, met: 11, section: 'Zirkel · 4 Runden', setLabel: 'Runde',
          notes: '60 s springen. Danach 90 s Pause, dann nächste Runde.',
        },
        {
          id: 'di-intervalle', name: 'Stepper-Intervalle', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 8, duration: 120, useWeight: false, rest: 0, met: 9,
          notes: 'Pro Satz: 1 Minute zügig, dann 1 Minute locker. 8 Durchgänge = 16 Minuten.',
        },
      ],
    },
    {
      id: 'zh-kurz',
      name: 'Zu Hause · 20 Minuten',
      weekday: null,
      color: '#2f9e63',
      duration: 20,
      note: 'Ersatz, wenn der Dienstag ausfällt. Kein Gerät nötig.',
      exercises: [
        {
          id: 'zh-seil', name: 'Seilspringen Intervalle', muscle: 'Ausdauer', image: 'img/exercises/cardio.svg',
          type: 'time', sets: 10, duration: 30, useWeight: false, rest: 30, met: 11,
          notes: '30 s springen, 30 s Pause, 10 Durchgänge.',
        },
        {
          id: 'zh-kniebeugen', name: 'Kniebeugen', muscle: 'Beine', image: 'img/exercises/bodyweight.svg',
          type: 'reps', sets: 3, reps: '15', useWeight: false, rest: 0, section: '3 Runden', setLabel: 'Runde',
          notes: 'Körpergewicht, kontrolliert und tief.',
        },
        {
          id: 'zh-liegestuetze', name: 'Liegestütze', muscle: 'Brust', image: 'img/exercises/bodyweight.svg',
          type: 'reps', sets: 3, reps: '10', useWeight: false, rest: 0, section: '3 Runden', setLabel: 'Runde',
          notes: 'Bei Bedarf auf den Knien.',
        },
        {
          id: 'zh-glute', name: 'Glute Bridges', muscle: 'Gesäss', image: 'img/exercises/bodyweight.svg',
          type: 'reps', sets: 3, reps: '12', useWeight: false, rest: 0, section: '3 Runden', setLabel: 'Runde',
          notes: 'Oben 1 s halten, Gesäss anspannen.',
        },
        {
          id: 'zh-plank', name: 'Plank', muscle: 'Core', image: 'img/exercises/core.svg',
          type: 'time', sets: 3, duration: 30, useWeight: false, rest: 60, met: 3.8, section: '3 Runden', setLabel: 'Runde',
          notes: 'Nach der Plank 60 s durchatmen, dann nächste Runde.',
        },
      ],
    },
  ],
};
