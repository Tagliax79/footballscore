// Variabili globali per salvare i dati recuperati
let liveFixtures = [];
let scheduledFixtures = [];

// currentView può essere "live", "finished" oppure "today"
let currentView = "live";

// Al caricamento della pagina, avvia le fetch e configura gli event listener
window.addEventListener("load", () => {
  setupControls();
  fetchLiveFixtures();
  fetchScheduledFixtures();
});

// Configura i pulsanti e il filtro competizioni
function setupControls() {
  const btnLive = document.getElementById("btnLive");
  const btnFinished = document.getElementById("btnFinished");
  const btnToday = document.getElementById("btnToday");
  const filterSelect = document.getElementById("competitionFilter");

  btnLive.addEventListener("click", () => {
    currentView = "live";
    btnLive.classList.add("active");
    btnFinished.classList.remove("active");
    btnToday.classList.remove("active");
    renderFixtures();
  });

  btnFinished.addEventListener("click", () => {
    currentView = "finished";
    btnFinished.classList.add("active");
    btnLive.classList.remove("active");
    btnToday.classList.remove("active");
    renderFixtures();
  });

  btnToday.addEventListener("click", () => {
    currentView = "today";
    btnToday.classList.add("active");
    btnLive.classList.remove("active");
    btnFinished.classList.remove("active");
    renderFixtures();
  });

  filterSelect.addEventListener("change", () => {
    renderFixtures();
  });
}

// Fetch per le partite live
async function fetchLiveFixtures() {
  try {
    const response = await fetch('/api/live-fixtures');
    const data = await response.json();
    if (data.response && Array.isArray(data.response)) {
      liveFixtures = data.response;
      // Aggiorna il filtro competizioni (basandosi sui dati live e scheduled)
      updateCompetitionFilter([...liveFixtures, ...scheduledFixtures]);
      if (currentView === "live") renderFixtures();
    }
  } catch (error) {
    console.error("Errore nel recupero delle partite live:", error);
  }
}

// Fetch per le partite scheduled/finite
async function fetchScheduledFixtures() {
  try {
    const response = await fetch('/api/scheduled-fixtures');
    const data = await response.json();
    if (data.response && Array.isArray(data.response)) {
      scheduledFixtures = data.response;
      // Aggiorna il filtro competizioni (unione dei dati live e scheduled)
      updateCompetitionFilter([...liveFixtures, ...scheduledFixtures]);
      if (currentView === "finished" || currentView === "today") renderFixtures();
    }
  } catch (error) {
    console.error("Errore nel recupero delle partite scheduled:", error);
  }
}

// Aggiorna il dropdown del filtro competizioni
function updateCompetitionFilter(fixtures) {
  const filterSelect = document.getElementById("competitionFilter");
  const competitionsSet = new Set();
  fixtures.forEach(item => {
    if (item.league && item.league.name) {
      competitionsSet.add(item.league.name);
    }
  });
  const competitions = Array.from(competitionsSet).sort((a, b) => a.localeCompare(b));
  filterSelect.innerHTML = `<option value="all">Tutte le competizioni</option>`;
  competitions.forEach(comp => {
    const option = document.createElement("option");
    option.value = comp;
    option.textContent = comp;
    filterSelect.appendChild(option);
  });
}

// Ordina le partite: competizioni con standings true prima, poi in ordine alfabetico
function sortFixtures(fixtures) {
  return fixtures.sort((a, b) => {
    const aMajor = a.league.standings ? 0 : 1;
    const bMajor = b.league.standings ? 0 : 1;
    if (aMajor !== bMajor) return aMajor - bMajor;
    return a.league.name.localeCompare(b.league.name);
  });
}

// Funzione di supporto per verificare se una data è "oggi"
function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

// Renderizza le partite in base alla vista corrente e al filtro selezionato
function renderFixtures() {
  const container = document.getElementById("matchesContainer");
  container.innerHTML = "";

  let fixtures = [];
  if (currentView === "live") {
    fixtures = liveFixtures;
  } else if (currentView === "finished") {
    // Per le partite finite, escludi quelle non ancora iniziate (NS)
    fixtures = scheduledFixtures.filter(item => item.fixture.status.short !== "NS");
  } else if (currentView === "today") {
    // Per le partite programmate per oggi: solo quelle con data odierna e stato "NS"
    fixtures = scheduledFixtures.filter(item => isToday(item.fixture.date) && item.fixture.status.short === "NS");
  }

  // Applica il filtro competizioni se non "all"
  const filterValue = document.getElementById("competitionFilter").value;
  if (filterValue !== "all") {
    fixtures = fixtures.filter(item => item.league.name === filterValue);
  }

  // Ordina i match: competizioni maggiori (standings true) prima
  fixtures = sortFixtures(fixtures);

  if (fixtures.length === 0) {
    container.innerHTML = `<p>Nessuna partita trovata per questa modalità.</p>`;
    return;
  }

  // Per ogni match, crea una "card" con i dettagli
  fixtures.forEach(fixtureData => {
    const { fixture: fix, league, teams, goals, score, events } = fixtureData;
    const matchDate = new Date(fix.date).toLocaleString();

    const card = document.createElement("div");
    card.className = "card";

    // Informazioni sulla competizione
    const leagueDiv = document.createElement("div");
    leagueDiv.className = "league-info";
    leagueDiv.innerHTML = `
      <img src="${league.logo}" alt="${league.name}" class="league-logo">
      <div>
        <span class="league-name">${league.name}</span><br>
        <span class="league-round">${league.round}</span>
      </div>
    `;

    // Informazioni sulle squadre e punteggi
    const homeScore = (goals && goals.home !== null) ? goals.home :
                      (score && score.fulltime && score.fulltime.home !== null ? score.fulltime.home : "-");
    const awayScore = (goals && goals.away !== null) ? goals.away :
                      (score && score.fulltime && score.fulltime.away !== null ? score.fulltime.away : "-");

    const teamsDiv = document.createElement("div");
    teamsDiv.className = "teams-info";
    teamsDiv.innerHTML = `
      <div class="team home-team">
        <img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo">
        <span class="team-name">${teams.home.name}</span>
        <span class="team-score">${homeScore}</span>
      </div>
      <div class="team away-team">
        <span class="team-score">${awayScore}</span>
        <span class="team-name">${teams.away.name}</span>
        <img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo">
      </div>
    `;

    // Informazioni generali sulla partita
    const matchInfoDiv = document.createElement("div");
    matchInfoDiv.className = "match-info";
    let statusText = fix.status.long;
    if (fix.status.elapsed) {
      statusText += " (" + fix.status.elapsed + "')";
    }
    matchInfoDiv.innerHTML = `
      <span class="match-date">${matchDate}</span>
      <span class="match-status">${statusText}</span>
      <span class="match-venue">${(fix.venue && fix.venue.name) ? fix.venue.name + " - " + fix.venue.city : "Sede N/D"}</span>
      <span class="match-referee">${fix.referee ? fix.referee : "Arbitro N/D"}</span>
    `;

    card.appendChild(leagueDiv);
    card.appendChild(teamsDiv);
    card.appendChild(matchInfoDiv);

    // Visualizza gli eventi (ad esempio, i marcatori) se la partita è in live oppure è terminata ("FT")
    if ((currentView === "live" || fix.status.short === "FT") && events && events.length > 0) {
      let eventsHTML = `<h4>Eventi:</h4>`;
      events.forEach(ev => {
        eventsHTML += `<div class="event">
          <span class="event-time">${ev.time.elapsed ? ev.time.elapsed + "'" : ""}</span>
          <span class="event-type">${ev.type}</span> -
          <span class="event-detail">${ev.detail}</span>
          ${ev.player && ev.player.name ? `: ${ev.player.name}` : ""}
          ${ev.assist && ev.assist.name ? ` (Assist: ${ev.assist.name})` : ""}
        </div>`;
      });
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "events-container";
      eventsDiv.innerHTML = eventsHTML;
      card.appendChild(eventsDiv);
    }
    container.appendChild(card);
  });
}
