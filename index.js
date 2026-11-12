const express = require("express"); //lädt Express
const cors = require("cors"); //etzt erlauben wir deiner UNO-Seite den Zugriff

const app = express(); //erstellt die Server-App und gibt ihr den Namen app
const spiele = new Map();

app.use(cors({ origin: "http://127.0.0.1:5500" }));
app.use(express.json());

const { randomUUID } = require("node:crypto");

app.listen(3000, "127.0.0.1", () => {
  console.log("Mein UNO-Server läuft auf Port 3000");
});

app.get("/", (req, res) => {
  res.send("Hallo vom UNO-Backend!");
});

function mischeKarten(stapel) {
  for (let i = stapel.length - 1; i > 0; i--) {
    const zufallsIndex = Math.floor(Math.random() * (i + 1));
    [stapel[i], stapel[zufallsIndex]] = [stapel[zufallsIndex], stapel[i]];
  }
}

function fuelleZiehstapelAuf(runde, benoetigteKarten) {
  const { ziehstapel, ablagestapel } = runde;

  if (ziehstapel.length >= benoetigteKarten || ablagestapel.length === 0) {
    return;
  }

  const karten = ablagestapel.splice(0);
  mischeKarten(karten);

  // Gezogen wird vom Ende der Liste. Die restlichen Ziehkarten bleiben oben.
  ziehstapel.unshift(...karten);
}

function mitHandwert(person) {
  // Der Handwert wird aus den aktuellen Karten für die API-Antwort berechnet.
  const Score = person.Cards.reduce((summe, karte) => {
    if (karte.Color === "Black") return summe + 50;
    if (["reverse", "draw2", "skip"].includes(karte.Text)) return summe + 20;
    return summe + karte.Value;
  }, 0);

  return { ...person, Score };
}

// Eine Runde bekommt frische Karten, behält aber die Gesamtpunkte der Partie.
function erstelleRunde(spieler, punktestand, rundenNummer) {
  const farben = ["Red", "Blue", "Green", "Yellow"];
  const zahlen = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];

  const kartenstapel = farben.flatMap((farbe) =>
    zahlen.map((zahl, index) => ({
      Color: farbe,
      Text: zahl,
      Value: index,
    })),
  );

  mischeKarten(kartenstapel);

  const ersteOffeneKarte = kartenstapel.pop();
  const sonderkarten = [];

  for (let i = 0; i < 4; i++) {
    sonderkarten.push(
      { Color: "Black", Text: "changecolor", Value: 14 },
      { Color: "Black", Text: "draw4", Value: 13 },
    );
  }

  for (const farbe of farben) {
    // Jede Farbe erhält je eine Karte für +2, Aussetzen und Richtungswechsel.
    sonderkarten.push(
      { Color: farbe, Text: "draw2", Value: 10 },
      { Color: farbe, Text: "skip", Value: 11 },
      { Color: farbe, Text: "reverse", Value: 12 },
    );
  }

  for (const karte of sonderkarten) {
    const position = Math.floor(Math.random() * (kartenstapel.length + 1));
    kartenstapel.splice(position, 0, karte);
  }

  const spiel = {
    Id: randomUUID(),
    // Jede neue Runde beginnt bei der nächsten Person in der ursprünglichen Reihenfolge.
    NextPlayer: spieler[(rundenNummer - 1) % spieler.length],
    Players: spieler.map((name) => ({
      Player: name,
      Cards: kartenstapel.splice(0, 7),
    })),
    TopCard: ersteOffeneKarte,
  };

  const runde = {
    spiel,
    ziehstapel: kartenstapel,
    ablagestapel: [],
    richtung: 1,
    punktestand,
    rundenNummer,
    ergebnis: null,
  };
  spiele.set(spiel.Id, runde);
  return runde;
}

function rundenAntwort(runde) {
  return {
    ...runde.spiel,
    RoundNumber: runde.rundenNummer,
    Players: runde.spiel.Players.map(mitHandwert),
  };
}

function beendeRunde(runde, person) {
  // Der Rundensieger erhält die Handwerte aller anderen Personen.
  const punkte = runde.spiel.Players
    .filter((eintrag) => eintrag !== person)
    .reduce((summe, eintrag) => summe + mitHandwert(eintrag).Score, 0);
  const gesamt = runde.punktestand.get(person.Player) + punkte;
  runde.punktestand.set(person.Player, gesamt);

  // Ab 500 Punkten ist die ganze Partie beendet.
  runde.ergebnis = {
    Winner: person.Player,
    Points: punkte,
    Standings: runde.spiel.Players.map(({ Player }) => ({
      Player,
      Total: runde.punktestand.get(Player),
    })),
    MatchWinner: gesamt >= 500 ? person.Player : null,
  };
}

app.post("/Api/Game/Start", (req, res) => {
  const spieler = req.body;

  if (!Array.isArray(spieler) || spieler.length !== 4) {
    return res.status(400).json({ Fehler: "UNO braucht genau vier Spieler." });
  }

  if (spieler.some((name) => typeof name !== "string" || name.trim() === "")) {
    return res
      .status(400)
      .json({ Fehler: "Jeder Spieler braucht einen Namen." });
  }

  const namenZumVergleichen = spieler.map((name) => name.trim().toLowerCase());

  if (new Set(namenZumVergleichen).size !== 4) {
    return res
      .status(400)
      .json({ Fehler: "Die Spielernamen müssen verschieden sein." });
  }

  const punktestand = new Map(spieler.map((name) => [name, 0]));
  res.json(rundenAntwort(erstelleRunde(spieler, punktestand, 1)));
});

app.post("/Api/Game/NextRound/:id", (req, res) => {
  const runde = spiele.get(req.params.id);

  if (!runde) {
    return res.status(404).json({ error: "Spiel nicht gefunden." });
  }

  if (!runde.ergebnis || runde.ergebnis.MatchWinner) {
    return res.status(409).json({ error: "Es kann noch keine weitere Runde starten." });
  }

  const namen = runde.spiel.Players.map(({ Player }) => Player);
  const naechsteRunde = erstelleRunde(namen, runde.punktestand, runde.rundenNummer + 1);
  // Die neue Spiel-ID trennt alte Zug-Anfragen eindeutig von der neuen Runde.
  spiele.delete(req.params.id);
  res.json(rundenAntwort(naechsteRunde));
});

app.get("/Api/Game/GetCards/:id", (req, res) => {
  const runde = spiele.get(req.params.id);

  if (!runde) {
    return res.status(404).json({ error: "Spiel nicht gefunden." });
  }

  const person = runde.spiel.Players.find(
    (eintrag) => eintrag.Player === req.query.playerName,
  );

  if (!person) {
    return res.status(404).json({ error: "Spieler nicht gefunden." });
  }

  res.json(mitHandwert(person));
});

function passtAufOffeneKarte(runde, karte) {
  const offeneKarte = runde.spiel.TopCard;
  const aktiveFarbe = runde.wildColor ?? offeneKarte.Color;

  return karte.Color === aktiveFarbe || karte.Value === offeneKarte.Value;
}

function anzahlStrafkarten(karte) {
  if (karte.Text === "draw4") return 4;
  if (karte.Text === "draw2") return 2;
  return 0;
}

app.put("/Api/Game/DrawCard/:id", (req, res) => {
  //Karte ziehen
  const runde = spiele.get(req.params.id);

  if (!runde) {
    return res.status(404).json({ error: "Spiel nicht gefunden." });
  }

  if (runde.ergebnis) {
    return res.status(409).json({ error: "Diese Runde ist beendet." });
  }

  const { spiel, ziehstapel } = runde;
  fuelleZiehstapelAuf(runde, 1);
  const karte = ziehstapel.pop();

  const index = spiel.Players.findIndex(
    (person) => person.Player === spiel.NextPlayer,
  );
  const person = spiel.Players[index];

  if (karte) {
    person.Cards.push(karte);
  } else {
    // Beide Stapel sind leer. +2 und +4 können ihre Strafkarten jetzt nicht austeilen.
    const kannAblegen = person.Cards.some(
      (handkarte) =>
        anzahlStrafkarten(handkarte) === 0 &&
        (handkarte.Text === "changecolor" || passtAufOffeneKarte(runde, handkarte)),
    );

    if (kannAblegen) {
      return res.status(409).json({
        error: "Der Ziehstapel ist leer. Lege eine passende Karte ab.",
      });
    }
    // Ohne zulässige Handkarte geht der Zug unten an die nächste Person.
  }
  const anzahl = spiel.Players.length;
  const naechsterIndex = (index + runde.richtung + anzahl) % anzahl;
  spiel.NextPlayer = spiel.Players[naechsterIndex].Player;
  res.json({
    Player: person.Player,
    Card: karte ?? null,
    Passed: !karte,
    NextPlayer: spiel.NextPlayer,
  });
});

app.put("/Api/Game/PlayCard/:id", (req, res) => {
  const runde = spiele.get(req.params.id);

  if (!runde) {
    return res.status(404).json({ error: "Spiel nicht gefunden." });
  }

  if (runde.ergebnis) {
    return res.status(409).json({ error: "Diese Runde ist beendet." });
  }

  const { spiel } = runde;
  const { value, color, wildColor } = req.query;

  const person = spiel.Players.find(
    (eintrag) => eintrag.Player === spiel.NextPlayer,
  );

  const karte = person.Cards.find(
    (eintrag) => String(eintrag.Value) === value && eintrag.Color === color,
  );

  if (!karte) {
    return res
      .status(400)
      .json({ error: "Diese Karte ist nicht auf deiner Hand." });
  }

  const offeneKarte = spiel.TopCard;
  const istFarbwahl = karte.Text === "changecolor" || karte.Text === "draw4";
  const aktiveFarbe = runde.wildColor ?? offeneKarte.Color;

  const istPlusVier = karte.Text === "draw4";
  const strafkarten = anzahlStrafkarten(karte);

  if (
    istPlusVier &&
    person.Cards.some((eintrag) => eintrag.Color === aktiveFarbe)
  ) {
    return res.status(400).json({
      error: "Du hast noch eine Karte in der aktiven Farbe.",
    });
  }

  if (istFarbwahl) {
    const erlaubteFarben = ["Red", "Blue", "Green", "Yellow"];

    if (!erlaubteFarben.includes(wildColor)) {
      return res.status(400).json({ error: "Wähle eine gültige Farbe." });
    }
  } else if (!passtAufOffeneKarte(runde, karte)) {
    return res.status(400).json({ error: "Diese Karte passt nicht." });
  }

  // Bei einem gültigen Zug kommt die bisher offene Karte zum Ablagestapel.
  const verfuegbareKarten = runde.ziehstapel.length + runde.ablagestapel.length + 1;
  if (strafkarten > verfuegbareKarten) {
    return res
      .status(409)
      .json({ error: "Es stehen zu wenige Karten zum Ziehen bereit." });
  }

  person.Cards.splice(person.Cards.indexOf(karte), 1);
  runde.ablagestapel.push(spiel.TopCard);
  spiel.TopCard = karte;
  runde.wildColor = istFarbwahl ? wildColor : null;

  if (karte.Text === "reverse") {
    runde.richtung = -runde.richtung;
  }
  const index = spiel.Players.indexOf(person);
  const anzahl = spiel.Players.length;
  let naechsterIndex = (index + runde.richtung + anzahl) % anzahl;

  // +2 und +4 geben der nächsten Person Strafkarten, bevor sie aussetzt.
  if (strafkarten > 0) {
    const betroffenePerson = spiel.Players[naechsterIndex];
    fuelleZiehstapelAuf(runde, strafkarten);
    betroffenePerson.Cards.push(...runde.ziehstapel.splice(-strafkarten));
  }

  if (strafkarten > 0 || karte.Text === "skip") {
    naechsterIndex = (naechsterIndex + runde.richtung + anzahl) % anzahl;
  }

  // Auch Strafkarten aus dem letzten Zug zählen noch zur Rundenwertung.
  if (person.Cards.length === 0) {
    beendeRunde(runde, person);
  }

  spiel.NextPlayer = runde.ergebnis ? null : spiel.Players[naechsterIndex].Player;
  res.json({
    Player: person.Player,
    TopCard: spiel.TopCard,
    WildColor: runde.wildColor,
    NextPlayer: spiel.NextPlayer,
    RoundResult: runde.ergebnis,
  });
});
