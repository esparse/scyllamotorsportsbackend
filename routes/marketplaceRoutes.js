const express = require('express');
const router = express.Router();
const {getApprovedProducts} = require('../controllers/MarketplaceController');

router.get('/', (req, res) => {res.send('Welcome to the Marketplace API')});

router.get('/products', getApprovedProducts);

module.exports = router;