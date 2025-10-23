const express = require('express');
const router = express.Router();
const benchmarkController = require('../controllers/benchmark.controller');
const { authenticate } = require('../middleware/auth');
const { isCA, isSuperAdmin } = require('../middleware/rbac');

// Get all benchmarks
router.get('/', authenticate, benchmarkController.getAllBenchmarks);

// Get industries list
router.get('/industries', authenticate, benchmarkController.getIndustries);

// Get default benchmark for industry
router.get('/default', authenticate, benchmarkController.getDefaultBenchmark);

// Get benchmark by ID
router.get('/:benchmarkId', authenticate, benchmarkController.getBenchmarkById);

// Create benchmark (CA only)
router.post('/', authenticate, isCA, benchmarkController.createBenchmark);

// Update benchmark (CA only, own benchmarks)
router.put('/:benchmarkId', authenticate, isCA, benchmarkController.updateBenchmark);

// Delete benchmark (CA only, own benchmarks)
router.delete('/:benchmarkId', authenticate, isCA, benchmarkController.deleteBenchmark);

module.exports = router;
