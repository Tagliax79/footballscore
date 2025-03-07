const express = require('express');
const fetch = require('node-fetch'); // Installa con: npm install node-fetch
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Funzione per formattare la data in YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

// Endpoint per partite live
app.get('/api/live-fixtures', async (req, res) => {
  try {
    const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      method: 'GET',
      headers: {
        'x-apisports-key': process.env.FOOTBALL_API_KEY
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Errore durante la richiesta live fixtures:', error);
    res.status(500).json({ error: 'Errore nel recupero delle live fixtures' });
  }
});

// Endpoint per partite programmate (oggi e ieri)
app.get('/api/scheduled-fixtures', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    // Richiesta per oggi
    const responseToday = await fetch(`https://v3.football.api-sports.io/fixtures?date=${todayStr}`, {
      method: 'GET',
      headers: {
        'x-apisports-key': process.env.FOOTBALL_API_KEY
      }
    });
    const dataToday = await responseToday.json();

    // Richiesta per ieri
    const responseYesterday = await fetch(`https://v3.football.api-sports.io/fixtures?date=${yesterdayStr}`, {
      method: 'GET',
      headers: {
        'x-apisports-key': process.env.FOOTBALL_API_KEY
      }
    });
    const dataYesterday = await responseYesterday.json();

    // Unisci le due risposte
    let merged = [];
    if (dataToday.response && Array.isArray(dataToday.response)) {
      merged = merged.concat(dataToday.response);
    }
    if (dataYesterday.response && Array.isArray(dataYesterday.response)) {
      merged = merged.concat(dataYesterday.response);
    }
    res.json({ response: merged });
  } catch (error) {
    console.error('Errore durante la richiesta scheduled fixtures:', error);
    res.status(500).json({ error: 'Errore nel recupero delle scheduled fixtures' });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
