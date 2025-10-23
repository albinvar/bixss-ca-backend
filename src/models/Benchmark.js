const mongoose = require('mongoose');

const benchmarkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    required: true,
    trim: true,
    default: 'General'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Liquidity Ratios Benchmarks
  liquidityRatios: {
    currentRatio: {
      excellent: { type: Number, default: 2.5 },
      good: { type: Number, default: 2.0 },
      fair: { type: Number, default: 1.5 },
      poor: { type: Number, default: 1.0 }
    },
    quickRatio: {
      excellent: { type: Number, default: 1.5 },
      good: { type: Number, default: 1.2 },
      fair: { type: Number, default: 1.0 },
      poor: { type: Number, default: 0.7 }
    },
    cashRatio: {
      excellent: { type: Number, default: 0.5 },
      good: { type: Number, default: 0.3 },
      fair: { type: Number, default: 0.2 },
      poor: { type: Number, default: 0.1 }
    }
  },

  // Profitability Ratios Benchmarks
  profitabilityRatios: {
    grossMargin: {
      excellent: { type: Number, default: 40 },
      good: { type: Number, default: 30 },
      fair: { type: Number, default: 20 },
      poor: { type: Number, default: 10 }
    },
    operatingMargin: {
      excellent: { type: Number, default: 20 },
      good: { type: Number, default: 15 },
      fair: { type: Number, default: 10 },
      poor: { type: Number, default: 5 }
    },
    netMargin: {
      excellent: { type: Number, default: 15 },
      good: { type: Number, default: 10 },
      fair: { type: Number, default: 5 },
      poor: { type: Number, default: 2 }
    },
    roa: {
      excellent: { type: Number, default: 10 },
      good: { type: Number, default: 7 },
      fair: { type: Number, default: 5 },
      poor: { type: Number, default: 2 }
    },
    roe: {
      excellent: { type: Number, default: 20 },
      good: { type: Number, default: 15 },
      fair: { type: Number, default: 10 },
      poor: { type: Number, default: 5 }
    }
  },

  // Leverage Ratios Benchmarks
  leverageRatios: {
    debtToEquity: {
      excellent: { type: Number, default: 0.5 },
      good: { type: Number, default: 1.0 },
      fair: { type: Number, default: 1.5 },
      poor: { type: Number, default: 2.0 }
    },
    debtToAssets: {
      excellent: { type: Number, default: 30 },
      good: { type: Number, default: 40 },
      fair: { type: Number, default: 50 },
      poor: { type: Number, default: 60 }
    },
    interestCoverage: {
      excellent: { type: Number, default: 8 },
      good: { type: Number, default: 5 },
      fair: { type: Number, default: 3 },
      poor: { type: Number, default: 2 }
    }
  },

  // Efficiency Ratios Benchmarks
  efficiencyRatios: {
    assetTurnover: {
      excellent: { type: Number, default: 2.0 },
      good: { type: Number, default: 1.5 },
      fair: { type: Number, default: 1.0 },
      poor: { type: Number, default: 0.5 }
    },
    inventoryTurnover: {
      excellent: { type: Number, default: 12 },
      good: { type: Number, default: 8 },
      fair: { type: Number, default: 6 },
      poor: { type: Number, default: 4 }
    },
    receivablesTurnover: {
      excellent: { type: Number, default: 12 },
      good: { type: Number, default: 8 },
      fair: { type: Number, default: 6 },
      poor: { type: Number, default: 4 }
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
benchmarkSchema.index({ industry: 1, isDefault: 1 });
benchmarkSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Benchmark', benchmarkSchema);
