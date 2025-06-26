require('dotenv').config();
// Express server index.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
app.use(express.json());

// Register routes
app.use('/api/admin/settings', require('./routes/adminSettings'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/parties', require('./routes/parties'));
app.use('/api/alterations', require('./routes/alterations'));
app.use('/api/push', require('./routes/push'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});