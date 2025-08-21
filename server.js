const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Home Page
app.get('/', (req, res) => {
  // Fetch all polling units from the database
  const sql = 'SELECT uniqueid, polling_unit_name FROM polling_unit';
  db.query(sql, (err, results) => {
    if (err) throw err;

    // Pass polling units to the EJS view
    res.render('index', { pollingUnits: results });
  });
});

// Polling Unit Result Page
app.get('/polling-unit/:id', (req, res) => {
  const puId = req.params.id;

  const sql = `
    SELECT p.partyname, a.party_score
    FROM announced_pu_results a
    JOIN party p ON a.party_abbreviation = p.partyid
    WHERE a.polling_unit_uniqueid = ?;
  `;

  db.query(sql, [puId], (err, results) => {
    if (err) throw err;

    res.render('polling_unit', { puId, results });
  });
});

// LGA Results Page
app.get('/lga', (req, res) => {
  const sql = 'SELECT lga_id, lga_name FROM lga WHERE state_id = 25';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('lga_result', { lgas: results, totals: null, selectedLga: null });
  });
});

app.get('/lga/:id', (req, res) => {
  const lgaId = parseInt(req.params.id); // make sure it's a number

  // 1. Fetch all LGAs
  const lgaSql = 'SELECT lga_id, lga_name FROM lga WHERE state_id = 25';

  db.query(lgaSql, (err, lgas) => {
    if (err) throw err;

    // Find selected LGA
    const selected = lgas.find(l => l.lga_id === lgaId);
    if (!selected) {
      return res.send('Invalid LGA selected');
    }

    // 2. Fetch polling units in this LGA
    db.query('SELECT uniqueid, polling_unit_name FROM polling_unit WHERE lga_id = ?', [lgaId], (err, pus) => {
      if (err) throw err;

      if (pus.length === 0) {
        return res.render('lga_result', { lgas, totals: [], selectedLga: selected });
      }

      // Extract polling unit IDs
      const puIds = pus.map(pu => pu.uniqueid);

      // 3. Fetch summed results for these polling units
      const sql = `
        SELECT p.partyname, SUM(a.party_score) as total_score
        FROM announced_pu_results a
        JOIN party p ON a.party_abbreviation = p.partyid
        WHERE a.polling_unit_uniqueid IN (?)
        GROUP BY p.partyid;
      `;

      db.query(sql, [puIds], (err, totals) => {
        if (err) throw err;

        res.render('lga_result', { lgas, totals, selectedLga: selected });
      });
    });
  });
});


// Show form to add result
app.get('/addNew-result', (req, res) => {
  const sqlPU = 'SELECT uniqueid, polling_unit_name FROM polling_unit';
  const sqlParty = 'SELECT partyid, partyname FROM party';

  db.query(sqlPU, (err, pollingUnits) => {
    if (err) throw err;

    db.query(sqlParty, (err, parties) => {
      if (err) throw err;

      res.render('addNew_result', { pollingUnits, parties, message: null });
    });
  });
});

// Handle form submission
app.post('/addNew-result', (req, res) => {
  const { polling_unit_id, party_abbreviation, party_score } = req.body;

  const sql = `
    INSERT INTO announced_pu_results 
    (polling_unit_uniqueid, party_abbreviation, party_score, entered_by_user, date_entered, user_ip_address) 
    VALUES (?, ?, ?, 'admin', NOW(), '127.0.0.1')
  `;

  db.query(sql, [polling_unit_id, party_abbreviation, party_score], (err) => {
    if (err) throw err;

    const sqlPU = 'SELECT uniqueid, polling_unit_name FROM polling_unit';
    const sqlParty = 'SELECT partyid, partyname FROM party';

    db.query(sqlPU, (err, pollingUnits) => {
      if (err) throw err;

      db.query(sqlParty, (err, parties) => {
        if (err) throw err;

        res.render('addNew_result', { pollingUnits, parties, message: '✅ Result added successfully!' });
      });
    });
  });
});



// Start server
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
