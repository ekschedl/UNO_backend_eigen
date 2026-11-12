// Live Server nutzt den lokalen Node-Server. Online laufen Seite und API unter derselben Adresse.
const gameApi = location.origin === "http://127.0.0.1:5500" ? "http://127.0.0.1:3000" : "";

// ============================================================
// GRUPPE 1: DOM-ELEMENTE + GLOBALE VARIABLEN
// ============================================================

const startButton = document.getElementById("startBtn");
const unoLogoText = document.querySelector(".uno-logo-fixed .title");
const unoStatusText = document.querySelector("header .subtitle"); //  "Willkommen" / "läuft..."
const nameInputs = document.querySelectorAll(".name-card input"); // Eingabefelder
const setupTitle = document.getElementById("setupTitle"); // "Wähle die Spielernamen"
const errorBox = document.getElementById("errorMsg"); // Fehlermeldungen
const playerForm = document.getElementById("playerForm");
const musicBtn = document.getElementById("musicToggle");
const btnToggleTheme = document.getElementById("btnToggleTheme");
const btnEndGame = document.getElementById("btnEndGame");
const body = document.body;
const bottomMenu = document.querySelector(".bottom-menu");
const menuToggle = document.getElementById("menuToggle");

// Dateipfade der Musiktracks
const musicXmas = "sounds/christmas.mp3";
const musicWood = "sounds/normal.mp3";
let bgMusic = null; // Aktuelles Musikobjekt, wird in ladeMusikDatei erstellt
// Statusflag: ob  Musik  schon einmal gestartet wurde
let musicStarted = false;

let vorherigerSpieler = null;
let aktuellerSpieler = null;
let aktiveSpielfarbe = null;
let gameId = null;
let spielGestartet = false; // Merker: läuft schon ein Spiel?
let spielerNamen = []; // alle Spielernamen -> späterkönnen alle Hände updaten
let istUhrzeigersinn = true;
let rundenErgebnis = null;

// ============================================================
// GRUPPE 2: THEMEN-MANAGEMENT (WOOD ↔ XMAS)
// ============================================================

// --- DEFAULT THEME: WOOD ---
body.classList.remove("theme-xmas");
body.classList.add("theme-wood");

// THEME SWITCH (Xmas ↔ Wood)
// ==========================
// Wird ausgeführt, wenn der Benutzer auf den Theme-Button klickt.
// Wechselt das komplette optische Theme (Farben, Hintergrund, Schnee, Musik).
btnToggleTheme.addEventListener("click", () => {
  const warPlaying = !bgMusic.paused;

  if (body.classList.contains("theme-xmas")) {
    body.classList.remove("theme-xmas");
    body.classList.add("theme-wood");
    stopSnow();

    btnToggleTheme.textContent = "🎄";
    ladeMusikDatei(musicWood);
  } else {
    body.classList.remove("theme-wood");
    body.classList.add("theme-xmas");
    startSnow();

    btnToggleTheme.textContent = "🎨";
    ladeMusikDatei(musicXmas);
  }

  if (warPlaying) {
    bgMusic.play().catch(() => {
      console.log(
        "Autoplay blockiert – neuer Track startet nach Button-Klick.",
      );
    });
  }
});

// ============================================================
// GRUPPE 3: MOBILE MENÜ (Hamburger)
// ============================================================

// SVGs für Burger und X
const iconBurger = `
  <svg width="30" height="30" viewBox="0 0 24 24" stroke="white" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </svg>
`;

const iconClose = `
  <svg width="30" height="30" viewBox="0 0 24 24" stroke="white" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M6 6l12 12" />
    <path d="M6 18L18 6" />
  </svg>
`;

// Start-Icon setzen
menuToggle.innerHTML = iconBurger;

// Klick-Handler
menuToggle.addEventListener("click", () => {
  bottomMenu.classList.toggle("show");

  if (bottomMenu.classList.contains("show")) {
    menuToggle.innerHTML = iconClose;
    menuToggle.setAttribute("aria-label", "Menü schließen");
  } else {
    menuToggle.innerHTML = iconBurger;
    menuToggle.setAttribute("aria-label", "Menü öffnen");
  }
});

/* ============================================================
// MUSIKSYSTEM
// - verwaltet Hintergrundmusik
// - kann Theme-Musik austauschen
// - bietet Play/Pause Steuerung
============================================================ */

// Beim Laden der Seite Standard-Musik aktivieren (Wood)
ladeMusikDatei(musicWood);

function toggleMusik() {
  if (bgMusic.paused) {
    bgMusic.play();
    musicBtn.textContent = "🔊";
    musicBtn.classList.add("playing");
  } else {
    bgMusic.pause();
    musicBtn.textContent = "🔇";
    musicBtn.classList.remove("playing");
  }
}

if (musicBtn) {
  musicBtn.addEventListener("click", toggleMusik);
}
// - sorgt dafür, dass Musik nur EINMAL automatisch startet
// - nötig wegen Browser-Autoplay-Regeln
function starteMusikEinmal() {
  musicBtn.classList.add("playing");
  if (musicStarted) return;
  musicStarted = true;

  bgMusic.play().catch(() => {
    console.log("Autoplay blockiert – Musik startet erst nach Klick.");
  });
}

// - zb bei Serverfehler passiert
// - stoppt Musik hart und setzt sie zurück
function stoppeMusikSofort() {
  try {
    bgMusic.pause(); // sofort stoppen
    bgMusic.currentTime = 0; // zurückspulen
    bgMusic.src = ""; // Audioquelle entfernen
    bgMusic.load(); // Player "vergessen" lassen
  } catch (e) {
    console.warn("Musik konnte nicht gestoppt werden:", e);
  }
}

// - lädt einen neuen Track (z. B. beim Theme-Wechsel)
// - pausiert alte Musik
// - erstellt neues Audio-Objekt
function ladeMusikDatei(name) {
  if (bgMusic) {
    bgMusic.pause(); // alte Musik stoppen
  }
  bgMusic = new Audio(name); // neue Musik laden
  bgMusic.loop = true; // Musik soll sich wiederholen
  bgMusic.volume = 0.3; // angenehme Lautstärke
}

/* ============================================================
   GRUPPE 5: BASIS-EVENTS (Regeln, Spiel beenden)
============================================================ */

// SPIEL BEENDEN
//Spiel wird beendet, indem die Seite neu geladen wird -> neuer Spielstart möglich
btnEndGame.addEventListener("click", () => {
  location.reload();
});

/* ============================================================
   GRUPPE 6: ALLGEMEINE UI-HILFSFUNKTIONEN
============================================================ */

//spielt Wellen-Animation in UNO-Logo ab
function spieleWave() {
  if (!unoLogoText) return;
  restartAnimation(unoLogoText, "wave");
}

//überprüft ob das Spiel im mobile-Modus betrieben wird
//Wichtig - muss mit max-width der media-query in CSS übereinstimmen!
function isMobile() {
  return window.innerWidth <= 600;
}

//Hilfsklasse, um CSS-basierte Animationen abzuspielen zb Top-Card, bei Score aktualisieren
function restartAnimation(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth; //damit CSS-Animation neu gestartet werden kann
  element.classList.add(klasse);
}

//Anzeige des aktuellen Spielzustandes (startet, läuft...)
function setzeStatusText(neuerText, wave = false) {
  unoStatusText.classList.remove("is-fading-in");
  unoStatusText.classList.add("is-fading-out");

  setTimeout(() => {
    unoStatusText.textContent = neuerText;
    unoStatusText.classList.remove("is-fading-out");
    unoStatusText.classList.add("is-fading-in");

    if (wave) spieleWave();
  }, 300); //Text würde einfach umspringen, flackern
}

// erzugt  beliebiges Popup / Overlay in der Mitte des Bildschirms. Der Bildschirmhintergrund wird dabei
// mit einem Blur-Effekt ausgeblendet.
function zeigeOverlay(html) {
  // Hintergrund verschwimmen lassen
  document.body.classList.add("blurred");

  const overlay = document.createElement("div");
  overlay.className = "uno-overlay";
  overlay.innerHTML = `
  <div class="uno-popup" role="dialog" aria-modal="true">
    ${html}
  </div>
  `;
  document.body.appendChild(overlay);

  return overlay;
}

// Schließt ein Overlay, das mit zeigeOverlay() erstellt wurde.
function schliesseOverlay(overlay) {
  document.body.classList.remove("blurred");
  overlay.remove();
}

// Zeigt einen Spielhinweis an und lässt die aktuelle Runde geöffnet.
function zeigeSpielHinweis(nachricht) {
  if (document.querySelector(".uno-overlay")) return;

  const overlay = zeigeOverlay('<p></p><button type="button">OK</button>');
  overlay.querySelector("p").textContent = nachricht;

  const okButton = overlay.querySelector("button");
  okButton.addEventListener("click", () => schliesseOverlay(overlay));
  okButton.addEventListener("keydown", (event) => event.stopPropagation());
  okButton.focus();
}

//spielt Wellen-Animation des UNO-Logos ab beim Start der Seite
window.addEventListener("load", () => {
  spieleWave();
});

/* ============================================================
   GRUPPE 7: SETUP-SCREEN — Starten, Namen prüfen
============================================================ */

//wird ausgeführt bei Klick auf den Start-Button
playerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  //verhindert, dass Spiel versehentlich ein zweites Mal gestartet wird
  if (spielGestartet === true) {
    return;
  }

  spielerNamen = []; //Array  leeren

  for (let i = 0; i < nameInputs.length; i++) {
    let feld = nameInputs[i];
    let name = feld.value.trim();

    if (name === "") name = nameInputs[i].placeholder;
    spielerNamen.push(name);
  }

  if (pruefeDoppelteNamen(spielerNamen)) return;

  //startet nachdem alle Bedingungen erfüllt wurden
  starteMusikEinmal();

  startButton.classList.add("fade-away");

  spielGestartet = true;
  errorBox.textContent = "";

  //geht 4 Namens-Eingabefelder durch und deaktiviert sie sauber
  for (let i = 0; i < nameInputs.length; i++) {
    let feld = nameInputs[i];
    feld.readOnly = true;
    feld.style.pointerEvents = "none";
    feld.style.cursor = "default";
    feld.style.boxShadow = "none";
    feld.style.outline = "none";
  }

  setupTitle.classList.add("fade-away");
  errorBox.classList.add("fade-away");

  zeigeStartOverlay(spielerNamen);
});

// === Hilfsfunktion: prüft, ob Spielernamen doppelt sind ===
function pruefeDoppelteNamen(spielerNamen) {
  //  WICHTIG: echte Werte normalisieren (wegen CSS uppercase!)
  const normalized = spielerNamen.map((name) => name.toLowerCase().trim());

  //Set kann nur eindeutige Werte speichern  und  entfernt automatisch Duplikate :also zum Erkennen, DASS Duplikate existieren
  const setOhne = new Set(normalized);
  const gibtDoppelt = setOhne.size < normalized.length;

  if (gibtDoppelt) {
    errorBox.textContent = "⚠️ Jeder Name muss einzigartig sein.";
    errorBox.style.color = "#b30000";
    errorBox.style.fontWeight = "bold";

    // alle Borders löschen
    nameInputs.forEach((f) => (f.style.border = ""));

    //suchen, welche konkreten Eingabefelder (p1, p2, p3, p4) doppelt sind
    const counter = {};
    normalized.forEach((n) => (counter[n] = (counter[n] || 0) + 1));

    // Border bei den doppelten Inputs setzen
    for (let i = 0; i < normalized.length; i++) {
      if (counter[normalized[i]] > 1) {
        nameInputs[i].style.border = "2px solid #b30000";
      }
    }

    // nach 2 Sekunden wieder löschen
    setTimeout(() => {
      nameInputs.forEach((f) => (f.style.border = ""));
      errorBox.textContent = "";
    }, 2000);

    return true; // Fehler gefunden
  }

  return false; // alles OK
}

/* ============================================================
   GRUPPE 8: START-OVERLAY + SETUP-ANIMATION
============================================================ */

// Zeigt ein Overlay mit den Namen der vier Spieler. Wird bei Klick oder
// nach 2 Sekunden automatisch geschlossen. Danach wird starteSetupAnimation()
// aufgerufen.
function zeigeStartOverlay(spielerNamen) {
  setzeStatusText("startet…", true);

  const farben = ["#e63b2e", "#2185d0", "#21ba45", "#f7c600"];
  let namenHTML = "";

  for (let i = 0; i < spielerNamen.length; i++) {
    namenHTML += `<span style='color:${farben[i]}'>${spielerNamen[
      i
    ].toUpperCase()}</span>&emsp;`;
  }

  const overlay = zeigeOverlay(`
    <p>Spiel startet mit:<br>${namenHTML}</p>
    <small>(Klick oder warte kurz...)</small>
  `);

  // Damit das Overlay nur einmal geschlossen wird
  let overlaySchonGeschlossen = false;

  function schliesseStartOverlay() {
    if (overlaySchonGeschlossen) return;
    overlaySchonGeschlossen = true;
    schliesseOverlay(overlay);
    starteSetupAnimation(spielerNamen);
  }
  overlay.addEventListener("click", schliesseStartOverlay);
  setTimeout(schliesseStartOverlay, 2000);
}

// Baut das UI von der Namenseingabe zum Spieltisch um.
// Danach wird starteServerSpiel() aufgerufen.
function starteSetupAnimation(spielerNamen) {
  //Start-Button, Start UI wird ausgeblendet
  startButton.classList.add("fade-away", "fade-out-btn");
  setupTitle.classList.add("gone");
  errorBox.classList.add("gone");

  //Spielernamen werden am Desktop in die Ecken bewegt, und ausgeblendet bei mobile
  let spielerNameBoxes = document.querySelectorAll(".name-card");
  for (let i = 0; i < spielerNameBoxes.length; i++) {
    if (!isMobile()) {
      spielerNameBoxes[i].classList.add("to-corner");
    } else {
      spielerNameBoxes[i].style.opacity = "0";
      spielerNameBoxes[i].style.transition = "opacity 0s";
    }
  }

  setTimeout(() => {
    starteServerSpiel(spielerNamen);
  }, 1500);
}

/* ============================================================
   GRUPPE 9: SERVER-KOMMUNIKATION (Start, Fehler-Overlay)
============================================================ */

// Startet ein neues Spiel am Server und speichert die Spiel-ID.
// Danach wird baueSpielfeld() aufgerufen.
// Bei einem Fehler (Verbindung, Server-interner Fehler, etc.) wird
// ein Fehler-Overlay angezeigt.
async function starteServerSpiel(spielerNamen) {
  try {
    //damit Fehler abgefangen werden
    const antwortVomServer = await fetch(
      `${gameApi}/Api/Game/Start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spielerNamen),
      },
    );

    if (!antwortVomServer.ok) {
      throw new Error("Server antwortet nicht korrekt");
    }

    const datenVomServerInJS = await antwortVomServer.json(); //await - Warten auf Server, nur. mit async möglich

    console.log("Start-Response:", datenVomServerInJS);

    gameId = datenVomServerInJS.Id;
    aktuellerSpieler = datenVomServerInJS.NextPlayer;

    baueSpielfeld(datenVomServerInJS);
  } catch (fehler) {
    zeigeServerFehler(fehler);
  }
}

// Zeigt eine Fehlermeldung als Overlay an, und lädt die Seite danach neu
function zeigeServerFehler(fehler) {
  console.error("Fehler vom Server:", fehler.message);

  const overlay = zeigeOverlay(`
    <p>⚠️ Serverfehler oder Verbindung unterbrochen.</p>
    <p>Das Spiel wird neu gestartet.</p>
    <small>(Klick zum Neustart)</small>
  `);
  // Musik sofort stoppen
  stoppeMusikSofort();

  // Klick → Reload (kurzer Delay damit Musik wirklich stoppt)
  overlay.addEventListener("click", () => {
    schliesseOverlay(overlay);

    setTimeout(() => {
      location.reload();
    }, 200);
  });
}

/* ============================================================
   GRUPPE 10: SPIELFELD AUFBAUEN (Spielerpositionen, Hands, Score)
============================================================ */

// Erstellt das Spielfeld basierend auf den Kartendaten, die vom Server
// erhalten wurden
function baueSpielfeld(datenVomServerInJS) {
  zeigeHaendeUndScores(datenVomServerInJS);

  setTimeout(() => {
    zeigeTischMitte(datenVomServerInJS.TopCard);
  }, 1000);
}

// Erstellt die Hände und die Score-Anzeigen der vier Spieler.
function zeigeHaendeUndScores(datenVomServerInJS) {
  spielerNamen = datenVomServerInJS.Players.map((p) => p.Player); //Speichert eine Liste aller Spielernamen

  //Auf Mobile wird alles in einen einzigen Container gestapelt
  let mobileStack = null;
  if (isMobile()) {
    mobileStack = document.getElementById("mobileStack");
    mobileStack.innerHTML = "";
  }

  const farben = ["#e63b2e", "#2185d0", "#21ba45", "#242109ff"];

  const positionen = [
    { x: "25%", y: "25%" },
    { x: "75%", y: "25%" },
    { x: "75%", y: "72%" }, // P4 ← TAUSCH
    { x: "25%", y: "72%" }, // P3 ← TAUSCH
  ];

  for (let i = 0; i < datenVomServerInJS.Players.length; i++) {
    const spieler = datenVomServerInJS.Players[i];
    const feld = nameInputs[i];

    feld.value = `${spieler.Player} — Hand: ${spieler.Score}`;
    feld.style.color = farben[i];
    animiereHandScore(feld);
    feld.parentElement.classList.add("started");

    // Erstelle Wrapper um die Karten des Spielers (die "Hand")
    const hand = document.createElement("div");
    hand.className = "player-hand";
    hand.dataset.player = spieler.Player;

    if (!isMobile()) {
      hand.style.left = positionen[i].x;
      hand.style.top = positionen[i].y;
    } else {
      hand.style.position = "static";
      hand.style.transform = "none";
      hand.style.margin = "0 auto 2rem";
    }

    // Erstelle die Karten in der Hand des Spielers
    for (let j = 0; j < spieler.Cards.length; j++) {
      const karte = spieler.Cards[j];
      const img = erstelleKarte(karte, spieler.Player, j);
      hand.appendChild(img);
    }

    if (isMobile()) {
      const block = document.createElement("div");
      block.className = "player-block";

      block.appendChild(feld.parentElement);
      block.appendChild(hand);

      mobileStack.appendChild(block);
    } else {
      document.body.appendChild(hand);
    }
  }

  if (isMobile()) {
    for (let i = 0; i < nameInputs.length; i++) {
      nameInputs[i].parentElement.style.opacity = "1";
      nameInputs[i].parentElement.style.transition = "opacity 0.3s ease";
    }
  }

  requestAnimationFrame(() => {
    highlightAktivenSpieler(aktuellerSpieler);
    setzeSichtbarkeitFuerAlleSpieler();
  });
}

function animiereHandScore(inputElement) {
  restartAnimation(inputElement, "hand-score-appear");
}

/* ============================================================
   GRUPPE 11: TISCHMITTE (Ziehstapel, Ablagestapel, erste Karte)
============================================================ */

// Erstellt den Ziehstapel, den Spielrichtungspfeil und den Ablagestapel
function zeigeTischMitte(obersteKarte) {
  aktiveSpielfarbe = obersteKarte.Color;
  const tischMitte = document.createElement("div");
  tischMitte.className = "table-center";

  // --- linker Nachziehstapel ---
  const ziehstapelDiv = document.createElement("div");
  ziehstapelDiv.className = "deck-stack";
  ziehstapelDiv.addEventListener("click", () => karteZiehen());

  for (let i = 0; i < 4; i++) {
    const rueckseiteImg = document.createElement("img");
    rueckseiteImg.src = "karten/back0.png";
    rueckseiteImg.className = "deck-card";
    ziehstapelDiv.appendChild(rueckseiteImg);
  }

  // --- Richtungsanzeige in der Mitte
  const dirDiv = document.createElement("div");
  dirDiv.className = "direction-indicator";
  dirDiv.innerHTML = '<span class="dir-arrow">⟳</span>';

  // --- rechter Ablagestapel ---
  const ablagestapelDiv = document.createElement("div");
  ablagestapelDiv.className = "top-card";

  const bild = document.createElement("img");
  bild.src = findeKartenBildDatei(obersteKarte);
  bild.className = "uno-card-img";

  ablagestapelDiv.appendChild(bild);

  // Reihenfolge: Ziehstapel – Richtung – Ablagestapel
  tischMitte.appendChild(ziehstapelDiv);
  tischMitte.appendChild(dirDiv);
  tischMitte.appendChild(ablagestapelDiv);
  document.body.appendChild(tischMitte);

  // Anzeige / Animation
  requestAnimationFrame(() => {
    tischMitte.classList.add("show");
    setzeStatusText("läuft…", true);
  });

  // Start-Richtung anzeigen
  aktualisiereRichtungspfeil(obersteKarte);
}

/* ============================================================
   GRUPPE 12: FARBWAHL-MODAL (für Wild & +4 Karten)
============================================================ */

// Zeigt ein Overlay mit vier Farb-Buttons, zur Auswahl der Farbe
// bei Wild- und +4-Karten. Wenn eine Farbe gewählt wird, wird
// spieleKarteZumServer() aufgerufen und die Farbe dem Server übergeben.
function oeffneColorModal(spielerName, index, karte, imgElement) {
  const overlay = zeigeOverlay(`
    <p>Welche Farbe möchtest du wählen?</p>

    <div style="display:flex; gap:0.75rem; justify-content:center; margin-top:1rem; flex-wrap:wrap;">
      <button data-color="Red"    style="padding:.5rem 1rem; border:none; border-radius:999px; font-weight:700; background:#e63b2e; color:white;">Rot</button>
      <button data-color="Yellow" style="padding:.5rem 1rem; border:none; border-radius:999px; font-weight:700; background:#fee22f; color:#3a2a09;">Gelb</button>
      <button data-color="Green"  style="padding:.5rem 1rem; border:none; border-radius:999px; font-weight:700; background:#21ba45; color:white;">Grün</button>
      <button data-color="Blue"   style="padding:.5rem 1rem; border:none; border-radius:999px; font-weight:700; background:#2185d0; color:white;">Blau</button>
    </div>

    <small style="display:block; margin-top:.8rem; color:#666;">Klick daneben, um abzubrechen</small>
  `);

  function schliessenOhneZug() {
    schliesseOverlay(overlay);
    imgElement.classList.remove("card-selected");
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) schliessenOhneZug();
  });

  const buttons = overlay.querySelectorAll("button[data-color]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const gewaehlteFarbe = btn.dataset.color;

      schliesseOverlay(overlay);

      spieleKarteZumServer(
        spielerName,
        index,
        karte,
        imgElement,
        gewaehlteFarbe,
      );
    });
  });
}

/* ============================================================
   GRUPPE 13: KARTENBILD BESTIMMEN (Mapping Text → Bilddatei)
============================================================ */

function findeKartenBildDatei(karte) {
  const farbeErstesGross =
    karte.Color[0].toUpperCase() + karte.Color.slice(1).toLowerCase();

  let textKlein = karte.Text.toLowerCase().replace(/\s+/g, "");

  const map = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    draw2: 10,
    skip: 11,
    reverse: 12,
    draw4: 13,
    changecolor: 14,
    wilddraw4: 14,
  };

  let nummer = map[textKlein];

  return `karten/${farbeErstesGross}${nummer}.png`;
}

/* ============================================================
   GRUPPE 14: WILD-BILDER (nach Farbwahl)
============================================================ */

function wildColorBild(color) {
  switch (color.toLowerCase()) {
    case "red":
      return "karten/wild_r.png";
    case "blue":
      return "karten/wild_b.png";
    case "yellow":
      return "karten/wild_j.png";
    case "green":
      return "karten/wild_v.png";
    default:
      return "karten/Black14.png";
  }
}

function wildDraw4Bild(color) {
  switch (color.toLowerCase()) {
    case "red":
      return "karten/Red13.png";
    case "yellow":
      return "karten/Yellow13.png";
    case "blue":
      return "karten/Blue13.png";
    case "green":
      return "karten/Green13.png";
    default:
      return "karten/Black14.png";
  }
}

/* ============================================================
   GRUPPE 15: AKTIVEN SPIELER HIGHLIGHTEN
============================================================ */

function highlightAktivenSpieler(name) {
  for (let i = 0; i < nameInputs.length; i++) {
    const feld = nameInputs[i];
    const box = feld.parentElement;

    const spielerName = feld.value.split("—")[0].trim();

    if (spielerName === name) {
      box.classList.add("active-player");
    } else {
      box.classList.remove("active-player");
    }
  }
}

function darfKarteSpielen(spielerName) {
  return spielerName === aktuellerSpieler;
}

/* ============================================================
   GRUPPE 16: KARTE SPIELEN (inkl. Wild-Handling)
============================================================ */

// Bereitet das Spielen einer Karte vor:
// Stammt die Karte von einem nicht aktiven Spieler, darf sie nicht gespielt
// werden, was durch eine Schüttel-Animation gezeigt wird.
// Wenn die Karte eine Farbwahl voraussetzt, wird ein Farbwahl-Overlay angezeigt.
async function versucheKarteZuSpielen(spielerName, index, karte, imgElement) {
  if (!darfKarteSpielen(spielerName)) {
    restartAnimation(imgElement, "shake");

    setTimeout(() => imgElement.classList.remove("shake"), 400);
    return;
  }

  // Bei +4 die Hand prüfen, bevor das Fenster zur Farbwahl aufgeht.
  if (karte.Text === "draw4") {
    const hand = imgElement.closest(".player-hand");
    const handkarten = Array.from(hand.querySelectorAll("img[data-card]"));
    const hatAktiveFarbe = handkarten.some(
      (bild) => JSON.parse(bild.dataset.card).Color === aktiveSpielfarbe,
    );

    if (hatAktiveFarbe) {
      restartAnimation(imgElement, "shake");
      setTimeout(() => imgElement.classList.remove("shake"), 400);
      return;
    }
  }

  imgElement.classList.add("card-selected");

  const text = karte.Text.toLowerCase();
  const colorLower = karte.Color.toLowerCase();
  const istWild =
    colorLower === "black" || text.includes("wild") || text.includes("change");

  // Wild → Farbwahl-Modal öffnen
  if (istWild) {
    oeffneColorModal(spielerName, index, karte, imgElement);
    return;
  }

  // Normale Karte direkt spielen
  spieleKarteZumServer(spielerName, index, karte, imgElement, null);
}

/* ============================================================
   GRUPPE 17: ZUG AN SERVER SENDEN (PlayCard)
============================================================ */

// Sendet die gespielte Karte zum Server.
// Wenn der Server einen Fehler meldet, wird der Zug als ungültig
// interpretiert und eine Schüttel-Animation wird angezeigt.
async function spieleKarteZumServer(
  spielerName,
  index,
  karte,
  imgElement,
  wildColor,
) {
  const url =
    `${gameApi}/Api/Game/PlayCard/${gameId}` +
    `?value=${karte.Value}` +
    `&color=${karte.Color}` +
    `&wildColor=${wildColor ?? ""}`;

  const response = await fetch(url, { method: "PUT" });
  const daten = await response.json();

  if (daten.error) {
    imgElement.classList.remove("card-selected");
    restartAnimation(imgElement, "shake");
    setTimeout(() => imgElement.classList.remove("shake"), 400);
    return;
  }

  console.log("✔️ Karte akzeptiert:", daten);

  // Wenn es eine Reverse-Karte war → Richtung kippen
  aktualisiereRichtungspfeil(karte);

  imgElement.classList.add("fly-to-center");

  setTimeout(() => {
    imgElement.remove();

    // 1) Spielzustand aktualisieren
    aktualisiereSpielNachZug(daten, spielerName);

    // 2) Top-Karte anpassen
    setzeNeueTopKarte(daten.TopCard ?? karte, daten.WildColor ?? wildColor);
  }, 350);
}

/* ============================================================
   GRUPPE 18: SPIEL NACH ZUG AKTUALISIEREN
============================================================ */

async function aktualisiereSpielNachZug(daten, spielerName) {
  vorherigerSpieler = spielerName;

  // Bei Rundenende sperren wir weitere Klicks und zeigen gleich das Server-Ergebnis.
  const neuerSpieler = daten.RoundResult ? null : (daten.NextPlayer ?? daten.Player);
  aktuellerSpieler = neuerSpieler;

  // Highlight aktualisieren
  highlightAktivenSpieler(neuerSpieler);

  // alle Hände neu rendern
  await Promise.all(
    spielerNamen.map((name) => aktualisiereHandUndPunkte(name)),
  );

  if (daten.RoundResult) {
    showWinner(daten.RoundResult);
    return;
  }

  // Karten flippen (sichtbar / unsichtbar)
  setzeSichtbarkeitFuerAlleSpieler();

  console.log("Neuer aktiver Spieler:", neuerSpieler);
}

/* ============================================================
   GRUPPE 19: TOP-KARTE UPDATEN
============================================================ */

function setzeNeueTopKarte(karte, wildColor = null) {
  aktiveSpielfarbe = wildColor ?? karte.Color;
  const topImg = document.querySelector(".top-card img");
  if (!topImg) return;

  const text = karte.Text.toLowerCase();
  const isWild = karte.Color.toLowerCase() === "black";

  if (wildColor && isWild) {
    if (text.includes("draw4")) {
      topImg.src = wildDraw4Bild(wildColor);
    } else {
      topImg.src = wildColorBild(wildColor);
    }
  } else {
    topImg.src = findeKartenBildDatei(karte);
  }

  restartAnimation(topImg, "hand-score-appear");
}

function aktualisiereRichtungspfeil(karte) {
  const textLower = karte.Text.toLowerCase();
  if (!textLower.includes("reverse")) {
    return;
  }

  istUhrzeigersinn = !istUhrzeigersinn;

  const arrow = document.querySelector(".dir-arrow");
  if (!arrow) return;

  if (istUhrzeigersinn) {
    arrow.textContent = "⟳"; // Pfeil im Uhrzeigersinn
  } else {
    arrow.textContent = "⟲"; // Gegen den Uhrzeigersinn
  }
}

/* ============================================================
   GRUPPE 20: KARTE ZIEHEN (DrawCard)
============================================================ */

async function karteZiehen() {
  const url = `${gameApi}/Api/Game/DrawCard/${gameId}`;
  const response = await fetch(url, { method: "PUT" });
  const daten = await response.json();

  if (daten.error) {
    console.log("Server meldet Fehler:", daten.error);
    if (response.status === 409) {
      zeigeSpielHinweis(daten.error);
    }
    return;
  }

  // Bei einem Pass gibt es keine neue Karte. Das Spielfeld wechselt direkt den Zug.
  if (daten.Passed) {
    zeigeSpielHinweis(`Der Ziehstapel ist leer. ${daten.NextPlayer} ist dran.`);
    await aktualisiereSpielNachZug(daten, aktuellerSpieler);
    return;
  }

  // Karte erzeugen
  const img = document.createElement("img");
  img.src = findeKartenBildDatei(daten.Card);
  img.className = "uno-card";
  img.dataset.card = JSON.stringify(daten.Card);

  const hand = document.querySelector(
    `.player-hand[data-player="${daten.Player}"]`,
  );

  hand.appendChild(img);

  aktualisiereSpielNachZug(daten, aktuellerSpieler);
}

/* ============================================================
   GRUPPE 21: HAND UND SCORES AKTUALISIEREN
============================================================ */

async function aktualisiereHandUndPunkte(playerName) {
  const url = `${gameApi}/Api/Game/GetCards/${gameId}?playerName=${encodeURIComponent(
    playerName,
  )}`;
  const response = await fetch(url);
  const daten = await response.json();

  console.log("Aktuelle Karten für", playerName, daten);

  const hand = document.querySelector(
    `.player-hand[data-player="${playerName}"]`,
  );
  if (!hand) return;

  hand.innerHTML = "";

  for (let i = 0; i < daten.Cards.length; i++) {
    const karte = daten.Cards[i];
    const img = erstelleKarte(karte, playerName, i);
    hand.appendChild(img);
  }
  updateScore(playerName, daten.Score);

}

/* ============================================================
   GRUPPE 22: KARTE ERSTELLEN (DOM-Objekt)
============================================================ */

// Karten werden immer "verdeckt" erstellt, außer die des vorherigen
// Spielers (dessen Karten sind zum Zeitpunkt, wenn diese Funktion
// aufgerufen wird, "aufgedeckt"). Die Karten des vorherigen und
// aktuellen Spielers werden später mit flipKarte umgedreht.
function erstelleKarte(karte, playerName, index) {
  const istVorherigerSpieler = playerName === vorherigerSpieler; //Ist diese Karte von dem Spieler, der gerade vorher dran war?

  const img = document.createElement("img");
  img.src = istVorherigerSpieler
    ? findeKartenBildDatei(karte)
    : "karten/back0.png";

  img.className = "uno-card";
  img.dataset.player = playerName;
  img.dataset.index = index;
  img.dataset.card = JSON.stringify(karte);

  img.addEventListener("click", () => {
    versucheKarteZuSpielen(playerName, index, karte, img);
  });

  return img;
}

/* ============================================================
   GRUPPE 23: SCORE / PUNKTESTAND UPDATEN
============================================================ */

function updateScore(playerName, score) {
  //aus der NodeList ein echtes Array machen
  const feld = nameInputs[spielerNamen.indexOf(playerName)];
  if (!feld) return;

  restartAnimation(feld, "hand-score-appear");
  feld.value = `${playerName} — Hand: ${score}`;
}

/* ============================================================
   GRUPPE 24: SICHTBARKEIT / FLIP-ANIMATION FÜR ALLE SPIELER
============================================================ */

function setzeSichtbarkeitFuerAlleSpieler() {
  const haende = document.querySelectorAll(".player-hand");
  const delayStep = 0.07;

  // 1) Alle Spieler außer aktueller & vorheriger → ZU
  haende.forEach((hand) => {
    if (
      hand.dataset.player !== aktuellerSpieler &&
      hand.dataset.player !== vorherigerSpieler
    ) {
      const karten = hand.querySelectorAll("img");
      karten.forEach((img) => {
        img.classList.remove("flip-out", "flip-in");
        img.style.transition = "none";
        img.offsetHeight;
        img.src = "karten/back0.png";
        img.style.transform = "rotateY(0deg)";
        img.style.opacity = "1";
      });
    }
  });

  // 2) Aktiver Spieler → Karten öffnen
  haende.forEach((hand) => {
    if (hand.dataset.player === aktuellerSpieler) {
      const karten = hand.querySelectorAll("img");
      karten.forEach((img, index) => {
        const data = JSON.parse(img.dataset.card);
        flipKarte(img, findeKartenBildDatei(data), index * delayStep);
      });
    }
  });

  // 3) Vorheriger Spieler → Karten schließen
  haende.forEach((hand) => {
    if (hand.dataset.player === vorherigerSpieler) {
      const karten = hand.querySelectorAll("img");
      karten.forEach((img, index) => {
        flipKarte(
          img,
          "karten/back0.png",
          index * delayStep,
        );
      });
    }
  });
}

/* ============================================================
   GRUPPE 25: KARTEN-FLIP ANIMATION
============================================================ */

function flipKarte(img, neuesBild, delay = 0) {
  setTimeout(() => {
    img.classList.remove("flip-in");
    img.classList.add("flip-out");

    setTimeout(() => {
      img.src = neuesBild;
      img.classList.remove("flip-out");
      img.classList.add("flip-in");
    }, 200);
  }, delay * 1000);
}

/* ============================================================
   GRUPPE 27: DARF SPIELER KARTE SPIELEN?
============================================================ */

function darfKarteSpielen(spielerName) {
  return spielerName === aktuellerSpieler;
}

/* ============================================================
   GRUPPE 28: GEWINNER-OVERLAY
============================================================ */

function showWinner(ergebnis) {
  rundenErgebnis = ergebnis;
  const overlay = document.getElementById("winnerOverlay");
  const button = document.getElementById("winnerClose");

  // Die Punkte kommen aus dem Backend, damit die Wertung für alle Züge gleich ist.
  document.getElementById("winnerName").textContent = ergebnis.Winner;
  const titel = ergebnis.MatchWinner ? "hat die Partie gewonnen!" : "gewinnt die Runde!";
  document.getElementById("winnerSummary").textContent = `${titel} +${ergebnis.Points} Punkte`;
  document.getElementById("winnerStandings").textContent = ergebnis.Standings
    .map(({ Player, Total }) => `${Player}: ${Total}`)
    .join(" · ");
  button.textContent = ergebnis.MatchWinner ? "Neues Spiel" : "Nächste Runde";
  overlay.classList.remove("gone");
  button.focus();
}

document.getElementById("winnerClose").addEventListener("click", async (event) => {
  if (rundenErgebnis.MatchWinner) {
    location.reload();
    return;
  }

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await fetch(`${gameApi}/Api/Game/NextRound/${gameId}`, {
      method: "POST",
    });

    if (!response.ok) throw new Error("Die nächste Runde konnte nicht starten.");

    const daten = await response.json();
    // Auf dem Handy liegen die Namensfelder in der alten Handansicht.
    // Wir holen sie zuerst zurück, damit sie beim Neuaufbau erhalten bleiben.
    const namensListe = playerForm.querySelector(".cards");
    nameInputs.forEach((feld) => namensListe.appendChild(feld.parentElement));
    document.querySelectorAll(".player-hand, .table-center, .player-block").forEach(
      (element) => element.remove(),
    );

    gameId = daten.Id;
    vorherigerSpieler = null;
    aktuellerSpieler = daten.NextPlayer;
    istUhrzeigersinn = true;
    rundenErgebnis = null;
    document.getElementById("winnerOverlay").classList.add("gone");

    zeigeHaendeUndScores(daten);
    zeigeTischMitte(daten.TopCard);
  } catch (fehler) {
    document.getElementById("winnerSummary").textContent = fehler.message;
  } finally {
    button.disabled = false;
  }
});

/* ======== Karte Ziehen mit ENTER TASTE=================================*/

// nur der aktive Spieler mit ENTER ziehen darf
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && aktuellerSpieler && !event.target.closest?.("a, button, input")) {
    karteZiehen();
  }
});

/* ======== Schnee================================*/

function startSnow() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const snowContainer = document.createElement("div");
  snowContainer.id = "snow-container";
  snowContainer.setAttribute("aria-hidden", "true");
  document.body.appendChild(snowContainer);

  const interval = setInterval(() => {
    if (!document.body.classList.contains("theme-xmas")) {
      stopSnow();
      return;
    }

    const snow = document.createElement("div");
    snow.classList.add("snowflake");
    const size = Math.random() * 5 + 4;
    const left = Math.random() * 100;
    const duration = Math.random() * 4 + 10;

    snow.style.left = left + "vw";
    snow.style.width = size + "px";
    snow.style.height = size + "px";
    snow.style.animationDuration = duration + "s";
    snow.style.setProperty("--snow-drift", (Math.random() * 60 - 30) + "px");

    snowContainer.appendChild(snow);

    // Entfernen sobald unten
    setTimeout(() => snow.remove(), duration * 1000);
  }, 300);

  window._snowInterval = interval;
}
function stopSnow() {
  clearInterval(window._snowInterval);
  const container = document.getElementById("snow-container");
  if (container) container.remove();
}
// Automatisch Schnee starten, wenn Xmas aktiv ist
if (document.body.classList.contains("theme-xmas")) {
  startSnow();
}
