const Benchmark = require('../models/Benchmark');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all benchmarks (CA can see all, companies see defaults only)
 */
exports.getAllBenchmarks = async (req, res, next) => {
  try {
    const { industry } = req.query;

    let query = {};

    // CAs can see all benchmarks they created or defaults
    if (req.user.role === 'CA') {
      query = {
        $or: [
          { createdBy: req.user._id },
          { isDefault: true }
        ]
      };
    } else {
      // Companies only see default benchmarks
      query.isDefault = true;
    }

    if (industry) {
      query.industry = industry;
    }

    const benchmarks = await Benchmark.find(query)
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, industry: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { benchmarks }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get benchmark by ID
 */
exports.getBenchmarkById = async (req, res, next) => {
  try {
    const { benchmarkId } = req.params;

    const benchmark = await Benchmark.findById(benchmarkId)
      .populate('createdBy', 'name email');

    if (!benchmark) {
      return next(new AppError('Benchmark not found', 404));
    }

    // Check permissions
    if (req.user.role !== 'CA' && !benchmark.isDefault) {
      return next(new AppError('Access denied', 403));
    }

    res.json({
      success: true,
      data: { benchmark }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get default benchmark for industry
 */
exports.getDefaultBenchmark = async (req, res, next) => {
  try {
    const { industry = 'General' } = req.query;

    let benchmark = await Benchmark.findOne({ industry, isDefault: true });

    // Fallback to General if industry-specific not found
    if (!benchmark) {
      benchmark = await Benchmark.findOne({ industry: 'General', isDefault: true });
    }

    if (!benchmark) {
      return next(new AppError('No default benchmark found', 404));
    }

    res.json({
      success: true,
      data: { benchmark }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new benchmark (CA only)
 */
exports.createBenchmark = async (req, res, next) => {
  try {
    const {
      name,
      description,
      industry,
      isDefault,
      liquidityRatios,
      profitabilityRatios,
      leverageRatios,
      efficiencyRatios
    } = req.body;

    // Only Super Admin can create default benchmarks
    if (isDefault && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Only Super Admin can create default benchmarks', 403));
    }

    const benchmark = await Benchmark.create({
      name,
      description,
      industry: industry || 'General',
      isDefault: isDefault || false,
      createdBy: req.user._id,
      liquidityRatios,
      profitabilityRatios,
      leverageRatios,
      efficiencyRatios
    });

    const populatedBenchmark = await Benchmark.findById(benchmark._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Benchmark created successfully',
      data: { benchmark: populatedBenchmark }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update benchmark (CA only, own benchmarks)
 */
exports.updateBenchmark = async (req, res, next) => {
  try {
    const { benchmarkId } = req.params;
    const updateData = req.body;

    const benchmark = await Benchmark.findById(benchmarkId);

    if (!benchmark) {
      return next(new AppError('Benchmark not found', 404));
    }

    // Check permissions
    if (benchmark.isDefault && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Only Super Admin can update default benchmarks', 403));
    }

    if (!benchmark.createdBy.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('You can only update your own benchmarks', 403));
    }

    // Update benchmark
    Object.assign(benchmark, updateData);
    await benchmark.save();

    const populatedBenchmark = await Benchmark.findById(benchmark._id)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Benchmark updated successfully',
      data: { benchmark: populatedBenchmark }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete benchmark (CA only, own benchmarks)
 */
exports.deleteBenchmark = async (req, res, next) => {
  try {
    const { benchmarkId } = req.params;

    const benchmark = await Benchmark.findById(benchmarkId);

    if (!benchmark) {
      return next(new AppError('Benchmark not found', 404));
    }

    // Cannot delete default benchmarks
    if (benchmark.isDefault) {
      return next(new AppError('Cannot delete default benchmarks', 400));
    }

    // Check permissions
    if (!benchmark.createdBy.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('You can only delete your own benchmarks', 403));
    }

    await benchmark.deleteOne();

    res.json({
      success: true,
      message: 'Benchmark deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of industries
 */
exports.getIndustries = async (req, res, next) => {
  try {
    const industries = await Benchmark.distinct('industry');

    res.json({
      success: true,
      data: { industries }
    });
  } catch (error) {
    next(error);
  }
};
