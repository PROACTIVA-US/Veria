import { Router } from 'express';
import { ReportGenerator } from '../services/reportGenerator';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { companyId, reportType, startDate, endDate, format } = req.body;

    if (!companyId || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and report type are required'
      });
    }

    const generator = new ReportGenerator(companyId);
    const report = await generator.generateReport({
      type: reportType,
      startDate,
      endDate,
      format: format || 'json'
    });

    if (format === 'csv' || format === 'pdf') {
      res.setHeader('Content-Type', `application/${format}`);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reconciliation-${Date.now()}.${format}`
      );
      res.send(report);
    } else {
      res.json({
        success: true,
        report
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

router.get('/types', (req, res) => {
  res.json({
    success: true,
    reportTypes: [
      'reconciliation',
      'balance_sheet',
      'profit_loss',
      'tokenized_assets',
      'audit_trail'
    ],
    formats: ['json', 'csv', 'pdf']
  });
});

export default router;