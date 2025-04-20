const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Room routes
router.get('/', (req, res) => res.redirect('/default'));
router.get('/:roomName', roomController.getRoom);
router.post('/claim', roomController.claimRoom);
router.get('/:roomName/history', roomController.getTextHistory);

module.exports = router;