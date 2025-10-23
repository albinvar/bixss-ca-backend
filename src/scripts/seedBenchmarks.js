const mongoose = require('mongoose');
const Benchmark = require('../models/Benchmark');
require('dotenv').config();

const defaultBenchmark = {
  name: 'General Industry Benchmark',
  description: 'Default benchmark values for general industry financial analysis',
  industry: 'General',
  isDefault: true,
  // Using a system user ID - you may need to adjust this
  createdBy: new mongoose.Types.ObjectId('000000000000000000000000'),

  liquidityRatios: {
    currentRatio: { excellent: 2.5, good: 2.0, fair: 1.5, poor: 1.0 },
    quickRatio: { excellent: 1.5, good: 1.2, fair: 1.0, poor: 0.7 },
    cashRatio: { excellent: 0.5, good: 0.3, fair: 0.2, poor: 0.1 }
  },

  profitabilityRatios: {
    grossMargin: { excellent: 40, good: 30, fair: 20, poor: 10 },
    operatingMargin: { excellent: 20, good: 15, fair: 10, poor: 5 },
    netMargin: { excellent: 15, good: 10, fair: 5, poor: 2 },
    roa: { excellent: 10, good: 7, fair: 5, poor: 2 },
    roe: { excellent: 20, good: 15, fair: 10, poor: 5 }
  },

  leverageRatios: {
    debtToEquity: { excellent: 0.5, good: 1.0, fair: 1.5, poor: 2.0 },
    debtToAssets: { excellent: 30, good: 40, fair: 50, poor: 60 },
    interestCoverage: { excellent: 8, good: 5, fair: 3, poor: 2 }
  },

  efficiencyRatios: {
    assetTurnover: { excellent: 2.0, good: 1.5, fair: 1.0, poor: 0.5 },
    inventoryTurnover: { excellent: 12, good: 8, fair: 6, poor: 4 },
    receivablesTurnover: { excellent: 12, good: 8, fair: 6, poor: 4 }
  }
};

async function seedBenchmarks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB');

    // Check if default benchmark already exists
    const existingBenchmark = await Benchmark.findOne({
      industry: 'General',
      isDefault: true
    });

    if (existingBenchmark) {
      console.log('Default benchmark already exists, updating...');

      // Update existing benchmark
      await Benchmark.findByIdAndUpdate(existingBenchmark._id, {
        ...defaultBenchmark,
        createdBy: existingBenchmark.createdBy // Keep original creator
      });

      console.log('✅ Default benchmark updated successfully');
    } else {
      console.log('Creating default benchmark...');

      // Create new benchmark
      await Benchmark.create(defaultBenchmark);

      console.log('✅ Default benchmark created successfully');
    }

    console.log('\nBenchmark Details:');
    console.log('- Name: General Industry Benchmark');
    console.log('- Industry: General');
    console.log('- Liquidity Ratios: Current Ratio, Quick Ratio, Cash Ratio');
    console.log('- Profitability Ratios: Gross Margin, Operating Margin, Net Margin, ROA, ROE');
    console.log('- Leverage Ratios: Debt-to-Equity, Debt-to-Assets, Interest Coverage');
    console.log('- Efficiency Ratios: Asset Turnover, Inventory Turnover, Receivables Turnover');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding benchmarks:', error);
    process.exit(1);
  }
}

// Run the seed function
seedBenchmarks();
