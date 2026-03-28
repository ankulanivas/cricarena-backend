const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const API_KEY = process.env.CRIC_API_KEY;
const BASE_URL = "https://api.cricapi.com/v1";

const formatToIST = (utcDate) => {
  const date = new Date(utcDate);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// router.get('/upcoming', async (req, res) => {
//   ...
// });

// Mocking other routes for now to keep it stable
router.get('/', (req, res) => res.json([]));
router.get('/:id', (req, res) => res.json({}));
router.post('/', authMiddleware, (req, res) => res.json({}));
router.put('/:id/status', authMiddleware, (req, res) => res.json({}));

module.exports = router;
