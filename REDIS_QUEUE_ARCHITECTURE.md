# Redis Queue Architecture

## Overview
Analysis data flows from Python microservice to Node.js backend via Redis pub/sub for loose coupling and resilience.

## Architecture Flow

```
┌─────────────────────┐
│  Python Microservice│
│  (Port 8000)        │
│                     │
│  ✅ AI Analysis     │
│  ✅ Document Parse  │
│  ✅ RAG Chatbot     │
└──────────┬──────────┘
           │
           │ Publish to
           │ 'analysis:completed'
           ↓
    ┌─────────────┐
    │    Redis    │
    │  Queue/P ubbSub │
    └──────┬──────┘
           │
           │ Subscribe
           │
           ↓
┌─────────────────────┐
│  Node.js Backend    │
│  (Port 3001)        │
│                     │
│  ✅ Companies       │
│  ✅ Users           │
│  ✅ Documents       │
│  ✅ Analyses (new)  │
│  ✅ Comparisons     │
└──────────┬──────────┘
           │
           ↓
    ┌─────────────┐
    │   MongoDB   │
    └─────────────┘
```

## Message Format

### Channel: `analysis:completed`

```json
{
  "job_id": "uuid",
  "analysis_id": "uuid",
  "company_id": "mongodb_id",
  "company_name": "Company Name",
  "analysis_data": {
    "company_information": {...},
    "balance_sheet_data": {...},
    "income_statement_data": {...},
    "cash_flow_data": {...},
    "comprehensive_financial_metrics": {...},
    "financial_health_analysis": {...},
    "trend_analysis": {...},
    "risk_assessment": {...},
    "industry_benchmarking": {...}
  },
  "document_ids": ["id1", "id2"],
  "metadata": {
    "total_pages_processed": 10,
    "document_count": 2,
    "created_at": "2025-10-20T..."
  }
}
```

## Components

### Python Backend (Publisher)
**File:** `/src/api/analysis.py`
- After analysis completes, publishes message to Redis
- Channel: `analysis:completed`
- Non-blocking: If publish fails, analysis still succeeds

### Node.js Backend (Consumer)
**File:** `/src/services/analysisConsumer.js`
- Subscribes to `analysis:completed` channel
- Stores analysis in MongoDB
- Updates document statuses
- Runs continuously in background

## Benefits

✅ **Loose Coupling**: Services don't know about each other
✅ **Resilient**: If Node.js is down, messages queue up
✅ **Async**: Python doesn't wait for Node.js
✅ **Scalable**: Can add multiple consumers
✅ **Simple**: Uses existing Redis infrastructure

## API Endpoints (Node.js)

### Get Analysis
```
GET /api/analysis/:analysisId
```

### Get Company History
```
GET /api/analysis/history/company/:companyId?limit=50
```

### Compare Analyses
```
GET /api/analysis/compare/company/:companyId?analysisIds=id1,id2&startDate=...&endDate=...
```

## Database Schema

### MongoDB Collection: `analyses`
```javascript
{
  analysisId: String (unique),
  company: ObjectId (ref: Company),
  uploadedBy: ObjectId (ref: User),
  documents: [{documentId, filename, fileType}],
  companyInformation: Mixed,
  balanceSheetData: Mixed,
  incomeStatementData: Mixed,
  cashFlowData: Mixed,
  comprehensiveFinancialMetrics: Mixed,
  financialHealthAnalysis: Mixed,
  trendAnalysis: Mixed,
  riskAssessment: Mixed,
  industryBenchmarking: Mixed,
  status: 'completed',
  jobId: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Setup

1. Ensure Redis is running:
```bash
redis-cli ping  # Should return PONG
```

2. Install dependencies:
```bash
cd /Users/athul/Desktop/bixss-ca-backend
npm install
```

3. Start Node.js backend:
```bash
npm run dev
```

The consumer will automatically start and subscribe to the queue.

## Monitoring

Check consumer status:
```javascript
console.log('👂 Subscribed to analysis:completed channel');  // On startup
console.log('📥 Received analysis message: {id}');          // On message
console.log('✅ Stored analysis {id} in MongoDB');          // On success
```

Check Redis:
```bash
redis-cli
> PUBSUB CHANNELS analysis:*
> PUBSUB NUMSUB analysis:completed
```
