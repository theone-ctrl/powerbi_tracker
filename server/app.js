const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync('./data/ideas.json'));
  res.render('index', { data, statuses:config.statuses, statuses_label: config.statuses_labels });
});

app.listen(3000, () => {
  console.log('Server started: http://localhost:3000');
});
