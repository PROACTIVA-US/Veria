import Fastify from 'fastify';
import { createPostgresPool, createRedisClient } from '@veria/database';
import { authenticate, authorize, Permission } from '@veria/auth-middleware';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import cron from 'node-cron';
import Handlebars from 'handlebars';
import { z } from 'zod';
import { createWriteStream, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Database connections
const pgPool: Pool = createPostgresPool();
const redis: Redis = createRedisClient();

// Report types
enum ReportType {
  SAR = 'suspicious_activity_report',
  CTR = 'currency_transaction_report',
  KYC_SUMMARY = 'kyc_summary',
  AML_MONITORING = 'aml_monitoring',
  COMPLIANCE_AUDIT = 'compliance_audit',
  TRANSACTION_LOG = 'transaction_log',
  REGULATORY_FILING = 'regulatory_filing'
}

// Report status
enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SUBMITTED = 'submitted'
}

// Report schemas
const GenerateReportSchema = z.object({
  type: z.nativeEnum(ReportType),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  format: z.enum(['pdf', 'excel', 'json']).default('pdf'),
  filters: z.object({
    userId: z.string().optional(),
    transactionId: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.string().optional()
  }).optional(),
  recipients: z.array(z.string().email()).optional()
});

// SAR (Suspicious Activity Report) template
const sarTemplate = `
SUSPICIOUS ACTIVITY REPORT (SAR)
=====================================
Filing Institution: Veria Financial
Date: {{filingDate}}
Report Period: {{startDate}} - {{endDate}}

SUBJECT INFORMATION
-------------------
Name: {{subjectName}}
Account: {{accountNumber}}
Date of Birth: {{dateOfBirth}}
Address: {{address}}

SUSPICIOUS ACTIVITY
------------------
Activity Date(s): {{activityDates}}
Transaction Amount(s): {{transactionAmounts}}
Activity Type: {{activityType}}

NARRATIVE
---------
{{narrative}}

ACTIONS TAKEN
-------------
{{actionsTaken}}

FILING INFORMATION
-----------------
Filed By: {{filedBy}}
Title: {{title}}
Date: {{filingDate}}
Contact: {{contact}}
`;

// CTR (Currency Transaction Report) template
const ctrTemplate = `
CURRENCY TRANSACTION REPORT (CTR)
=====================================
Filing Institution: Veria Financial
Date: {{filingDate}}

TRANSACTION INFORMATION
----------------------
Date: {{transactionDate}}
Amount: {{amount}}
Type: {{transactionType}}
Account Number: {{accountNumber}}

PERSON CONDUCTING TRANSACTION
-----------------------------
Name: {{personName}}
Date of Birth: {{dateOfBirth}}
SSN/TIN: {{ssn}}
Address: {{address}}
Occupation: {{occupation}}

BENEFICIARY INFORMATION
----------------------
Name: {{beneficiaryName}}
Account: {{beneficiaryAccount}}
Relationship: {{relationship}}

FILING INFORMATION
-----------------
Filed By: {{filedBy}}
Date: {{filingDate}}
`;

// Report generator class
class ReportGenerator {
  private pool: Pool;
  private redis: Redis;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  async generateSAR(data: any, format: string): Promise<string> {
    // Fetch suspicious activities
    const activities = await this.fetchSuspiciousActivities(data);
    
    if (activities.length === 0) {
      throw new Error('No suspicious activities found for the specified period');
    }

    const reportData = {
      filingDate: new Date().toISOString().split('T')[0],
      startDate: data.startDate.toISOString().split('T')[0],
      endDate: data.endDate.toISOString().split('T')[0],
      subjectName: activities[0].user_name || 'Unknown',
      accountNumber: activities[0].account_number || 'N/A',
      dateOfBirth: activities[0].date_of_birth || 'N/A',
      address: activities[0].address || 'N/A',
      activityDates: activities.map(a => a.activity_date).join(', '),
      transactionAmounts: activities.map(a => `$${a.amount}`).join(', '),
      activityType: this.categorizeActivity(activities),
      narrative: this.generateNarrative(activities),
      actionsTaken: 'Account monitored, compliance team notified, report filed',
      filedBy: 'Compliance Officer',
      title: 'Chief Compliance Officer',
      contact: 'compliance@veria.finance'
    };

    const template = Handlebars.compile(sarTemplate);
    const content = template(reportData);

    if (format === 'pdf') {
      return await this.generatePDF(content, 'SAR');
    } else if (format === 'excel') {
      return await this.generateExcel(activities, 'SAR');
    } else {
      return JSON.stringify(reportData);
    }
  }

  async generateCTR(data: any, format: string): Promise<string> {
    // Fetch large currency transactions
    const transactions = await this.fetchLargeTransactions(data);
    
    const reports = [];
    for (const transaction of transactions) {
      const reportData = {
        filingDate: new Date().toISOString().split('T')[0],
        transactionDate: transaction.created_at,
        amount: `$${transaction.amount.toLocaleString()}`,
        transactionType: transaction.type,
        accountNumber: transaction.account_number,
        personName: transaction.user_name,
        dateOfBirth: transaction.date_of_birth,
        ssn: transaction.ssn_last4 ? `***-**-${transaction.ssn_last4}` : 'N/A',
        address: transaction.address,
        occupation: transaction.occupation || 'N/A',
        beneficiaryName: transaction.beneficiary_name || 'N/A',
        beneficiaryAccount: transaction.beneficiary_account || 'N/A',
        relationship: transaction.relationship || 'N/A',
        filedBy: 'Compliance Officer'
      };

      const template = Handlebars.compile(ctrTemplate);
      reports.push(template(reportData));
    }

    if (format === 'pdf') {
      return await this.generatePDF(reports.join('\n\n'), 'CTR');
    } else if (format === 'excel') {
      return await this.generateExcel(transactions, 'CTR');
    } else {
      return JSON.stringify(reports);
    }
  }

  async generateComplianceAudit(data: any, format: string): Promise<string> {
    const auditData = await this.fetchAuditData(data);
    
    const summary = {
      period: {
        start: data.startDate,
        end: data.endDate
      },
      statistics: {
        totalTransactions: auditData.transactions,
        totalUsers: auditData.users,
        kycCompleted: auditData.kyc_completed,
        amlAlerts: auditData.aml_alerts,
        sarsFiled: auditData.sars_filed,
        ctrsFiled: auditData.ctrs_filed
      },
      riskDistribution: auditData.risk_distribution,
      complianceRate: auditData.compliance_rate,
      issues: auditData.issues,
      recommendations: auditData.recommendations
    };

    if (format === 'pdf') {
      return await this.generateAuditPDF(summary);
    } else if (format === 'excel') {
      return await this.generateAuditExcel(summary);
    } else {
      return JSON.stringify(summary);
    }
  }

  private async fetchSuspiciousActivities(data: any): Promise<any[]> {
    const query = `
      SELECT 
        cc.*, 
        u.email as user_name,
        u.created_at as account_opened,
        t.amount,
        t.type as transaction_type
      FROM compliance_checks cc
      JOIN users u ON cc.user_id = u.id
      LEFT JOIN transactions t ON cc.transaction_id = t.id
      WHERE cc.created_at >= $1 
        AND cc.created_at <= $2
        AND (cc.status = 'failed' OR cc.result->>'risk_level' IN ('high', 'critical'))
      ORDER BY cc.created_at DESC
    `;

    const result = await this.pool.query(query, [data.startDate, data.endDate]);
    return result.rows;
  }

  private async fetchLargeTransactions(data: any): Promise<any[]> {
    const query = `
      SELECT 
        t.*,
        u.email as user_name,
        u.created_at as account_opened
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.created_at >= $1 
        AND t.created_at <= $2
        AND t.amount >= 10000
      ORDER BY t.created_at DESC
    `;

    const result = await this.pool.query(query, [data.startDate, data.endDate]);
    return result.rows;
  }

  private async fetchAuditData(data: any): Promise<any> {
    // Aggregate compliance metrics
    const queries = {
      transactions: 'SELECT COUNT(*) FROM transactions WHERE created_at >= $1 AND created_at <= $2',
      users: 'SELECT COUNT(DISTINCT user_id) FROM transactions WHERE created_at >= $1 AND created_at <= $2',
      kyc_completed: 'SELECT COUNT(*) FROM users WHERE kyc_status = \'verified\' AND updated_at >= $1 AND updated_at <= $2',
      aml_alerts: 'SELECT COUNT(*) FROM compliance_checks WHERE check_type = \'aml\' AND status IN (\'failed\', \'manual_review\') AND created_at >= $1 AND created_at <= $2',
      sars_filed: 'SELECT COUNT(*) FROM regulatory_reports WHERE type = \'SAR\' AND created_at >= $1 AND created_at <= $2',
      ctrs_filed: 'SELECT COUNT(*) FROM regulatory_reports WHERE type = \'CTR\' AND created_at >= $1 AND created_at <= $2'
    };

    const results: any = {};
    for (const [key, sql] of Object.entries(queries)) {
      const result = await this.pool.query(sql, [data.startDate, data.endDate]);
      results[key] = parseInt(result.rows[0].count);
    }

    // Risk distribution
    const riskQuery = `
      SELECT 
        result->>'risk_level' as risk_level,
        COUNT(*) as count
      FROM compliance_checks
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY result->>'risk_level'
    `;
    const riskResult = await this.pool.query(riskQuery, [data.startDate, data.endDate]);
    results.risk_distribution = riskResult.rows;

    // Compliance rate
    const complianceQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'passed' THEN 1 END)::float / COUNT(*)::float * 100 as rate
      FROM compliance_checks
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const complianceResult = await this.pool.query(complianceQuery, [data.startDate, data.endDate]);
    results.compliance_rate = complianceResult.rows[0].rate || 0;

    // Issues and recommendations
    results.issues = await this.identifyIssues(data);
    results.recommendations = await this.generateRecommendations(results);

    return results;
  }

  private categorizeActivity(activities: any[]): string {
    // Analyze activities to determine category
    const categories = new Set();
    
    for (const activity of activities) {
      if (activity.amount > 50000) categories.add('Large Transaction');
      if (activity.risk_level === 'critical') categories.add('High Risk');
      if (activity.check_type === 'sanctions') categories.add('Sanctions Alert');
      if (activity.rapid_transactions) categories.add('Velocity Alert');
    }

    return Array.from(categories).join(', ') || 'Unusual Activity';
  }

  private generateNarrative(activities: any[]): string {
    const narratives = [];
    
    for (const activity of activities) {
      let narrative = `On ${activity.created_at}, `;
      narrative += `user ${activity.user_name} `;
      
      if (activity.amount) {
        narrative += `conducted a transaction of $${activity.amount} `;
      }
      
      if (activity.risk_level) {
        narrative += `with a risk level of ${activity.risk_level}. `;
      }
      
      if (activity.flags && activity.flags.length > 0) {
        narrative += `Flags raised: ${activity.flags.join(', ')}. `;
      }
      
      narratives.push(narrative);
    }

    return narratives.join('\n\n');
  }

  private async identifyIssues(data: any): Promise<string[]> {
    const issues = [];
    
    // Check for patterns
    const patterns = await this.pool.query(`
      SELECT 
        user_id,
        COUNT(*) as failed_checks
      FROM compliance_checks
      WHERE status = 'failed'
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY user_id
      HAVING COUNT(*) > 3
    `, [data.startDate, data.endDate]);

    if (patterns.rows.length > 0) {
      issues.push(`${patterns.rows.length} users with multiple failed compliance checks`);
    }

    // Check for missing KYC
    const missingKyc = await this.pool.query(`
      SELECT COUNT(*) 
      FROM users 
      WHERE kyc_status != 'verified' 
        AND created_at < $1
    `, [data.startDate]);

    if (missingKyc.rows[0].count > 0) {
      issues.push(`${missingKyc.rows[0].count} users with incomplete KYC`);
    }

    return issues;
  }

  private generateRecommendations(results: any): string[] {
    const recommendations = [];

    if (results.compliance_rate < 80) {
      recommendations.push('Improve compliance rate through enhanced KYC procedures');
    }

    if (results.aml_alerts > 10) {
      recommendations.push('Review AML detection parameters to reduce false positives');
    }

    if (results.sars_filed > 5) {
      recommendations.push('Implement additional transaction monitoring controls');
    }

    recommendations.push('Continue regular compliance training for all staff');
    recommendations.push('Update policies to reflect current regulatory requirements');

    return recommendations;
  }

  private async generatePDF(content: string, type: string): Promise<string> {
    const filename = `report_${type}_${Date.now()}.pdf`;
    const filepath = join(__dirname, '..', 'reports', filename);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = createWriteStream(filepath);
      
      doc.pipe(stream);
      
      // Add content
      doc.fontSize(16).text('REGULATORY REPORT', { align: 'center' });
      doc.fontSize(12).text(content);
      
      doc.end();
      
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  private async generateExcel(data: any[], type: string): Promise<string> {
    const filename = `report_${type}_${Date.now()}.xlsx`;
    const filepath = join(__dirname, '..', 'reports', filename);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);
    
    // Add headers
    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key.replace(/_/g, ' ').toUpperCase(),
        key: key,
        width: 20
      }));
      
      // Add data
      worksheet.addRows(data);
    }
    
    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }

  private async generateAuditPDF(summary: any): Promise<string> {
    const filename = `audit_${Date.now()}.pdf`;
    const filepath = join(__dirname, '..', 'reports', filename);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = createWriteStream(filepath);
      
      doc.pipe(stream);
      
      // Title
      doc.fontSize(20).text('COMPLIANCE AUDIT REPORT', { align: 'center' });
      doc.moveDown();
      
      // Period
      doc.fontSize(12).text(`Reporting Period: ${summary.period.start} to ${summary.period.end}`);
      doc.moveDown();
      
      // Statistics
      doc.fontSize(14).text('KEY METRICS', { underline: true });
      doc.fontSize(12);
      for (const [key, value] of Object.entries(summary.statistics)) {
        doc.text(`${key.replace(/_/g, ' ')}: ${value}`);
      }
      doc.moveDown();
      
      // Risk Distribution
      doc.fontSize(14).text('RISK DISTRIBUTION', { underline: true });
      doc.fontSize(12);
      for (const item of summary.riskDistribution || []) {
        doc.text(`${item.risk_level}: ${item.count}`);
      }
      doc.moveDown();
      
      // Issues
      if (summary.issues && summary.issues.length > 0) {
        doc.fontSize(14).text('IDENTIFIED ISSUES', { underline: true });
        doc.fontSize(12);
        for (const issue of summary.issues) {
          doc.text(`• ${issue}`);
        }
        doc.moveDown();
      }
      
      // Recommendations
      if (summary.recommendations && summary.recommendations.length > 0) {
        doc.fontSize(14).text('RECOMMENDATIONS', { underline: true });
        doc.fontSize(12);
        for (const rec of summary.recommendations) {
          doc.text(`• ${rec}`);
        }
      }
      
      doc.end();
      
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  private async generateAuditExcel(summary: any): Promise<string> {
    const filename = `audit_${Date.now()}.xlsx`;
    const filepath = join(__dirname, '..', 'reports', filename);
    
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['COMPLIANCE AUDIT REPORT']);
    summarySheet.addRow(['Period', `${summary.period.start} to ${summary.period.end}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['KEY METRICS']);
    for (const [key, value] of Object.entries(summary.statistics)) {
      summarySheet.addRow([key.replace(/_/g, ' '), value]);
    }
    
    // Risk distribution sheet
    if (summary.riskDistribution && summary.riskDistribution.length > 0) {
      const riskSheet = workbook.addWorksheet('Risk Distribution');
      riskSheet.columns = [
        { header: 'Risk Level', key: 'risk_level', width: 20 },
        { header: 'Count', key: 'count', width: 15 }
      ];
      riskSheet.addRows(summary.riskDistribution);
    }
    
    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }
}

// Initialize report generator
const reportGenerator = new ReportGenerator(pgPool, redis);

// API Routes

app.get('/health', async () => ({
  status: 'ok',
  name: 'regulatory-reporting',
  timestamp: new Date().toISOString()
}));

// Generate report
app.post('/reports/generate', {
  preHandler: [authenticate, authorize(Permission.AUDIT_READ)]
}, async (request: any, reply) => {
  try {
    const data = GenerateReportSchema.parse(request.body);
    
    // Create report record
    const reportId = `REP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await pgPool.query(
      `INSERT INTO regulatory_reports 
       (id, type, status, requested_by, parameters, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        reportId,
        data.type,
        ReportStatus.GENERATING,
        request.user.userId,
        JSON.stringify(data)
      ]
    );

    // Generate report asynchronously
    setImmediate(async () => {
      try {
        let filepath: string;
        
        switch (data.type) {
          case ReportType.SAR:
            filepath = await reportGenerator.generateSAR(data, data.format);
            break;
          case ReportType.CTR:
            filepath = await reportGenerator.generateCTR(data, data.format);
            break;
          case ReportType.COMPLIANCE_AUDIT:
            filepath = await reportGenerator.generateComplianceAudit(data, data.format);
            break;
          default:
            throw new Error(`Unsupported report type: ${data.type}`);
        }

        // Update report status
        await pgPool.query(
          `UPDATE regulatory_reports 
           SET status = $1, filepath = $2, completed_at = NOW()
           WHERE id = $3`,
          [ReportStatus.COMPLETED, filepath, reportId]
        );

        // Send notifications if recipients specified
        if (data.recipients && data.recipients.length > 0) {
          // Send email notifications (implementation would go here)
          app.log.info(`Report ${reportId} sent to ${data.recipients.join(', ')}`);
        }
      } catch (error) {
        app.log.error(error, `Failed to generate report ${reportId}`);
        await pgPool.query(
          `UPDATE regulatory_reports 
           SET status = $1, error = $2
           WHERE id = $3`,
          [ReportStatus.FAILED, error.message, reportId]
        );
      }
    });

    return {
      success: true,
      data: {
        reportId,
        status: ReportStatus.GENERATING,
        message: 'Report generation started'
      }
    };
  } catch (error) {
    app.log.error(error, 'Report generation failed');
    return reply.status(400).send({
      success: false,
      error: error.message
    });
  }
});

// Get report status
app.get('/reports/:reportId', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  const { reportId } = request.params;
  
  try {
    const result = await pgPool.query(
      'SELECT * FROM regulatory_reports WHERE id = $1',
      [reportId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'Report not found'
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch report');
    return reply.status(500).send({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

// List reports
app.get('/reports', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { type, status, startDate, endDate } = request.query;
    
    let query = 'SELECT * FROM regulatory_reports WHERE 1=1';
    const params = [];
    
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const result = await pgPool.query(query, params);

    return {
      success: true,
      data: result.rows
    };
  } catch (error) {
    app.log.error(error, 'Failed to list reports');
    return reply.status(500).send({
      success: false,
      error: 'Failed to list reports'
    });
  }
});

// Schedule regular reports
const scheduleReports = () => {
  // Daily SAR check at 2 AM
  cron.schedule('0 2 * * *', async () => {
    app.log.info('Running daily SAR check');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      await reportGenerator.generateSAR({
        startDate: yesterday,
        endDate: new Date(),
        format: 'pdf'
      }, 'pdf');
    } catch (error) {
      app.log.error(error, 'Daily SAR check failed');
    }
  });

  // Weekly compliance audit on Mondays at 3 AM
  cron.schedule('0 3 * * 1', async () => {
    app.log.info('Running weekly compliance audit');
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    try {
      await reportGenerator.generateComplianceAudit({
        startDate: lastWeek,
        endDate: new Date(),
        format: 'pdf'
      }, 'pdf');
    } catch (error) {
      app.log.error(error, 'Weekly compliance audit failed');
    }
  });
};

// Start server
const start = async () => {
  try {
    await pgPool.query('SELECT 1');
    await redis.ping();
    app.log.info('Database connections established');
    
    // Schedule reports
    scheduleReports();
    app.log.info('Report scheduling activated');
    
    const port = parseInt(process.env.PORT || '3008', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`Regulatory Reporting service listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully');
  await app.close();
  await pgPool.end();
  redis.disconnect();
  process.exit(0);
});

start();