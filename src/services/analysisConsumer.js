const redis = require('redis');
const Analysis = require('../models/Analysis');
const Document = require('../models/Document');

class AnalysisConsumer {
  constructor() {
    this.subscriber = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Create Redis subscriber client
      this.subscriber = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.subscriber.on('error', (err) => {
        console.error('❌ Redis Subscriber Error:', err);
      });

      this.subscriber.on('connect', () => {
        console.log('🔗 Redis Subscriber connected');
        this.isConnected = true;
      });

      this.subscriber.on('ready', () => {
        console.log('✅ Redis Subscriber ready');
      });

      await this.subscriber.connect();

      // Subscribe to analysis:completed channel
      await this.subscriber.subscribe('analysis:completed', async (message) => {
        await this.handleAnalysisMessage(message);
      });

      console.log('👂 Subscribed to analysis:completed channel');

    } catch (error) {
      console.error('Failed to connect Redis subscriber:', error);
      throw error;
    }
  }

  async handleAnalysisMessage(message) {
    try {
      const data = JSON.parse(message);
      console.log(`📥 Received analysis message: ${data.analysis_id}`);
      console.log(`🔍 Message keys: ${Object.keys(data).join(', ')}`);
      console.log(`🔍 analysis_data exists: ${!!data.analysis_data}`);
      console.log(`🔍 analysis_data type: ${typeof data.analysis_data}`);

      // Validate required fields
      if (!data.analysis_id) {
        throw new Error('Missing analysis_id in message');
      }
      if (!data.analysis_data) {
        throw new Error('Missing analysis_data in message');
      }

      const {
        job_id,
        analysis_id,
        company_id,
        company_name,
        analysis_data,
        document_ids,
        metadata
      } = data;

      console.log(`💾 Saving to MongoDB: ${analysis_id}`);
      console.log(`📊 Company: ${company_name} (${company_id})`);

      // Get document details from MongoDB if IDs provided
      let documents = [];
      if (document_ids && document_ids.length > 0) {
        const docs = await Document.find({ _id: { $in: document_ids } });
        documents = docs.map(doc => ({
          documentId: doc._id,
          filename: doc.originalName || doc.filename,
          fileType: doc.fileType
        }));
      }

      // Create or update analysis in MongoDB
      const analysis = await Analysis.findOneAndUpdate(
        { analysisId: analysis_id },
        {
          analysisId: analysis_id,
          company: company_id,
          jobId: job_id,
          documents,
          documentCount: metadata?.document_count || documents.length,
          totalPagesProcessed: metadata?.total_pages_processed || 0,

          // Store complete analysis data
          consolidatedData: analysis_data,
          healthAnalysis: analysis_data?.financial_health_analysis || {},

          status: 'completed'
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      // Update document statuses
      if (document_ids && document_ids.length > 0) {
        await Document.updateMany(
          { _id: { $in: document_ids } },
          {
            status: 'analyzed',
            analysisId: analysis_id
          }
        );
      }

      console.log(`✅ Analysis ${analysis_id} saved successfully to MongoDB`);
      console.log(`✅ Document ID: ${analysis._id}`);

    } catch (error) {
      console.error('❌ Error handling analysis message:', error);
      console.error('   Stack:', error.stack);
      // Log but don't throw - we don't want to crash the consumer
    }
  }

  async disconnect() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.isConnected = false;
      console.log('🔌 Redis Subscriber disconnected');
    }
  }
}

// Create singleton instance
const analysisConsumer = new AnalysisConsumer();

module.exports = analysisConsumer;
