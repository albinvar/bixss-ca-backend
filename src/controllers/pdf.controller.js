const PDFDocument = require('pdfkit');
const Analysis = require('../models/Analysis');
const { AppError } = require('../middleware/errorHandler');

/**
 * Generate professional PDF report for an analysis
 */
const generateAnalysisPDF = async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    const { charts } = req.body; // Base64 encoded chart images from frontend

    // Fetch analysis
    const analysis = await Analysis.findOne({ analysisId })
      .populate('company', 'name registrationNumber')
      .populate('uploadedBy', 'name email');

    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }

    // Get data from consolidatedData (raw DB structure)
    const consolidatedData = analysis.consolidatedData || {};
    const companyInfo = consolidatedData.company_information || {};
    const healthAnalysis = analysis.healthAnalysis || {};
    const riskAssessment = consolidatedData.risk_assessment || {};
    const futureOutlook = consolidatedData.future_outlook || {};
    const keyFindings = consolidatedData.key_findings || {};
    const companyName = companyInfo.name || analysis.company?.name || 'Company Analysis';

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: `Financial Analysis - ${companyName}`,
        Author: analysis.uploadedBy?.name || 'BIXSS CA',
        Subject: 'Financial Analysis Report',
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Analysis_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${analysisId}.pdf"`
    );

    // Pipe to response
    doc.pipe(res);

    // Generate PDF content
    generatePDFContent(doc, analysis, charts, companyInfo, healthAnalysis, keyFindings, riskAssessment, futureOutlook);

    // Finalize
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};

/**
 * Generate PDF content
 */
function generatePDFContent(doc, analysis, charts, companyInfo, healthAnalysis, keyFindings, riskAssessment, futureOutlook) {
  // Cover Page
  addCoverPage(doc, companyInfo, analysis);
  doc.addPage();

  // Company Information
  addSection(doc, 'Company Information');
  addCompanyInfo(doc, companyInfo);
  doc.moveDown(2);

  // Financial Health Analysis
  if (healthAnalysis && Object.keys(healthAnalysis).length > 0) {
    addSection(doc, 'Financial Health Analysis');
    addHealthAnalysis(doc, healthAnalysis);
    doc.addPage();
  }

  // Charts
  if (charts && Object.keys(charts).length > 0) {
    addSection(doc, 'Visual Analysis & Charts');
    doc.moveDown();
    addCharts(doc, charts);
    doc.addPage();
  }

  // Key Findings
  if (keyFindings && Object.keys(keyFindings).length > 0) {
    addSection(doc, 'Key Findings & Recommendations');
    addKeyFindings(doc, keyFindings);
    doc.addPage();
  }

  // Risk Assessment
  if (riskAssessment && Object.keys(riskAssessment).length > 0) {
    addSection(doc, 'Risk Assessment');
    addRiskAssessment(doc, riskAssessment);
    doc.addPage();
  }

  // Future Outlook
  if (futureOutlook && Object.keys(futureOutlook).length > 0) {
    addSection(doc, 'Future Outlook');
    addFutureOutlook(doc, futureOutlook);
  }

  // Add page numbers
  addPageNumbers(doc);
}

// Cover Page
function addCoverPage(doc, companyInfo, analysis) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;

  doc.fontSize(45).fillColor('#1e40af').text('BIXSS CA', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(24).fillColor('#000000').text('Financial Analysis Report', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(20).fillColor('#374151').text(companyInfo.name || 'Company Report', { align: 'center' });
  doc.moveDown(3);

  doc.fontSize(12).fillColor('#6b7280').text(
    `Analysis Date: ${new Date(analysis.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`,
    { align: 'center' }
  );
  doc.moveDown();

  doc.fontSize(11).fillColor('#6b7280').text(
    `Prepared by: ${analysis.uploadedBy?.name || 'CA Professional'}`,
    { align: 'center' }
  );

  // Footer
  doc.fontSize(9).fillColor('#9ca3af').text(
    'CONFIDENTIAL - This report contains proprietary financial information',
    40,
    pageHeight - 60,
    { align: 'center', width: pageWidth - 80 }
  );
}

// Section Header
function addSection(doc, title) {
  doc.fontSize(16).fillColor('#1e40af').text(title, { underline: true });
  doc.moveDown(0.5);
  doc.strokeColor('#e5e7eb').lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .stroke();
  doc.moveDown();
}

// Company Info
function addCompanyInfo(doc, companyInfo) {
  doc.fontSize(11).fillColor('#374151');

  if (companyInfo.name) {
    doc.text(`Company Name: ${companyInfo.name}`);
  }
  if (companyInfo.industry) {
    doc.text(`Industry: ${companyInfo.industry}`);
  }
  if (companyInfo.financial_year) {
    doc.text(`Financial Year: ${companyInfo.financial_year}`);
  }
  if (companyInfo.document_type) {
    doc.text(`Document Type: ${companyInfo.document_type}`);
  }
}

// Health Analysis
function addHealthAnalysis(doc, healthAnalysis) {
  const sections = [
    { key: 'liquidity_ratios', title: 'Liquidity Ratios' },
    { key: 'profitability_ratios', title: 'Profitability Ratios' },
    { key: 'leverage_ratios', title: 'Leverage Ratios' },
    { key: 'efficiency_ratios', title: 'Efficiency Ratios' }
  ];

  sections.forEach(section => {
    if (healthAnalysis[section.key]) {
      doc.fontSize(13).fillColor('#1e40af').text(section.title);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#374151');

      const ratios = healthAnalysis[section.key];
      Object.entries(ratios).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let displayValue = 'N/A';

        if (value && typeof value === 'object' && value.value !== undefined) {
          displayValue = `${value.value.toFixed(2)}`;
          if (value.rating) displayValue += ` (${value.rating})`;
        } else if (value !== undefined && value !== null) {
          displayValue = typeof value === 'number' ? value.toFixed(2) : value.toString();
        }

        doc.text(`  ${label}: ${displayValue}`);
      });
      doc.moveDown();
    }
  });
}

// Charts
function addCharts(doc, charts) {
  Object.entries(charts).forEach(([chartName, chartData], index) => {
    try {
      const title = chartName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      doc.fontSize(12).fillColor('#374151').text(title);
      doc.moveDown(0.5);

      const base64Data = chartData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const maxWidth = doc.page.width - 80;
      const maxHeight = 250;

      doc.image(imageBuffer, {
        fit: [maxWidth, maxHeight],
        align: 'center'
      });

      doc.moveDown(2);

      // Add page break if needed
      if (doc.y > doc.page.height - 150 && index < Object.keys(charts).length - 1) {
        doc.addPage();
      }
    } catch (error) {
      console.error(`Error adding chart ${chartName}:`, error);
      doc.fontSize(10).fillColor('#ef4444').text(`Chart could not be rendered: ${chartName}`);
      doc.moveDown();
    }
  });
}

// Key Findings
function addKeyFindings(doc, findings) {
  if (findings.strengths && findings.strengths.length > 0) {
    doc.fontSize(12).fillColor('#10b981').text('Strengths');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    findings.strengths.forEach(strength => {
      doc.text(`  ✓ ${strength}`, { indent: 10 });
    });
    doc.moveDown();
  }

  if (findings.weaknesses && findings.weaknesses.length > 0) {
    doc.fontSize(12).fillColor('#ef4444').text('Weaknesses');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    findings.weaknesses.forEach(weakness => {
      doc.text(`  ✗ ${weakness}`, { indent: 10 });
    });
    doc.moveDown();
  }

  if (findings.recommendations && findings.recommendations.length > 0) {
    doc.fontSize(12).fillColor('#1e40af').text('Recommendations');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    findings.recommendations.forEach(rec => {
      doc.text(`  → ${rec}`, { indent: 10 });
    });
  }
}

// Risk Assessment
function addRiskAssessment(doc, risk) {
  if (risk.overall_risk_level) {
    doc.fontSize(11).fillColor('#374151');
    doc.text(`Overall Risk Level: ${risk.overall_risk_level.toUpperCase()}`);
    doc.moveDown();
  }

  if (risk.risk_factors && risk.risk_factors.length > 0) {
    doc.fontSize(12).fillColor('#1e40af').text('Risk Factors');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    risk.risk_factors.forEach(factor => {
      const severity = factor.severity ? `[${factor.severity.toUpperCase()}]` : '';
      const description = factor.description || factor;
      doc.text(`  • ${severity} ${description}`, { indent: 10 });
    });
  }
}

// Future Outlook
function addFutureOutlook(doc, outlook) {
  if (outlook.predictions) {
    doc.fontSize(12).fillColor('#1e40af').text('3-Year Financial Predictions');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');

    ['year_1', 'year_2', 'year_3'].forEach((year, index) => {
      if (outlook.predictions[year]) {
        doc.fontSize(11).fillColor('#1e40af').text(`Year ${index + 1}:`);
        doc.fontSize(10).fillColor('#374151');
        const pred = outlook.predictions[year];

        if (pred.revenue) {
          doc.text(`  Revenue: ₹${formatNumber(pred.revenue.expected)} (Range: ₹${formatNumber(pred.revenue.min)} - ₹${formatNumber(pred.revenue.max)})`);
        }
        if (pred.profit) {
          doc.text(`  Profit: ₹${formatNumber(pred.profit.expected)} (Range: ₹${formatNumber(pred.profit.min)} - ₹${formatNumber(pred.profit.max)})`);
        }
        doc.moveDown(0.5);
      }
    });
  }

  if (outlook.assumptions && outlook.assumptions.length > 0) {
    doc.moveDown();
    doc.fontSize(11).fillColor('#6b7280').text('Key Assumptions:');
    doc.fontSize(9).fillColor('#374151');
    outlook.assumptions.forEach(assumption => {
      doc.text(`  • ${assumption}`, { indent: 10 });
    });
  }
}

// Page Numbers
function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(9).fillColor('#9ca3af').text(
      `Page ${i + 1} of ${range.count}`,
      40,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 80 }
    );
  }
}

// Helper: Format large numbers
function formatNumber(num) {
  if (!num && num !== 0) return 'N/A';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
}

module.exports = {
  generateAnalysisPDF
};
