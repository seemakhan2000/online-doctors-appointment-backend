const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/admindashboard');


router.get('/', getDashboardStats);

module.exports = router;
