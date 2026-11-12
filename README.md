# Kartenspiel für vier Personen

Dieses Lernprojekt entstand im Dezember 2025 im Rahmen meiner Ausbildung an der **FH CAMPUS 02**. Wir entwickelten die Browser-Oberfläche im Team, um die Arbeit mit JavaScript und einer REST-API zu üben. Die Spiellogik lief damals über ein Backend, das im Kurs bereitgestellt wurde. [Ursprüngliches Teamprojekt](https://github.com/ekschedl/NowaUno)

## Meine Weiterentwicklung

In diesem Repository führe ich das Projekt mit einem eigenen Backend in **Node.js und Express** weiter. Der Server teilt die Karten aus, prüft Spielzüge und verwaltet Runden und Punkte. Ich habe außerdem ein eigenes Kartendesign, ein Wintertheme und eine Anleitung ergänzt. Vier Personen spielen gemeinsam an einem Bildschirm.

## Lokal starten

```bash
npm ci
npm start
```

Danach das Spiel unter [127.0.0.1:3000](http://127.0.0.1:3000/) öffnen. Der Server liefert sowohl die Spieloberfläche als auch die API aus. Die Runden werden im Arbeitsspeicher gespeichert und enden bei einem Serverneustart.

## Ursprüngliche Aufgabenstellung aus dem Kurs

Das Uno-Spiel muss:
1. Muss dem Player die Möglichkeit geben 4 Namen einzugeben
2. Keine gleichen/leeren Namen sind erlaubt
3. Neues Spiel am Server starten
4. Alle Karten austeilen (darstellen als Bild)
5. Neben den Karten: Player-Namen anzeigen
6. Wenn Karte geklickt wird: versuchen sie abzulegen
7. Abgelegte Karten wird von Hand gelöscht
8. Abgelegte Karten wird zu Top Card am Ablagestapel
9. Abheben funktioniert
10. Punkte jedes Players sind sichtbar
11. Punkte ändern sich bei jedem Spielzug
12. Aktiven Player darstellen
13. Spielrichtung darstellen
14. Top Card anzeigen: Aufgedeckte Karte darstellen (Ablagestapel)
15. Abhebestapel darstellen
16. CSS Animation bei Ablegen der Karte auf Ablagestapel
17. Animation bei ungültiger Aktion
18. Wenn das Spiel beendet ist: Gewinner*in hervorheben
19. Aktuell gewählte Farbe darstellen (wichtig bei +4 oder Farbwahl)
20. Keine unnötige Anfragen an Server (z.B: Farbe und Nummer lokal
    checken)
21. Button für neues Spiel
22. Ungültige Spielzüge verhindern
23. Link zu den Spielregeln anzeigen
24. Minimale Dokumentation (z.B.: vor Funktionen oder Funktionsblöcken:
    „Diese Funktion bekommt eine Karte und Prüft ob sie ablegbar ist“ oder
    „Diese Funktion startet ein neues Spiel auf dem Server“)



Das Uno Spiel kann (optional):
- nett aussehen
- die Möglichkeit geben, Uno zu rufen (und wenn es vergessen wird: 2 Karten heben)
- Mehrere Runden spielbar sein
- etc…