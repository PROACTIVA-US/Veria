import { Pool } from 'pg';
import Redis from 'ioredis';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs/promises';
import * as path from 'path';

export enum ReportType {
  SAR = 'SAR', // Suspicious Activity Report
  CTR = 'CTR', // Currency Transaction Report
  KYC_STATUS = 'KYC_STATUS',
  AML_ALERT = 'AML_ALERT',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  REGULATORY_FILING = 'REGULATORY_FILING',
  AUDIT_TRAIL = 'AUDIT_TRAIL',
  COMPLIANCE_SUMMARY = 'COMPLIANCE_SUMMARY'
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml'
}

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  startDate: Date;
  endDate: Date;
  filters?: Record<string, any>;
  includeDetails?: boolean;
  recipientEmail?: string;
}

export interface ReportMetadata {
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  recordCount: number;
  fileSize?: number;
  filePath?: string;
}

export class ComplianceReporter {
  private db: Pool;
  private redis: Redis;
  private reportsDir: string;
  
  constructor(db: Pool, redis: Redis, reportsDir: string = './reports') {
    this.db = db;
    this.redis = redis;
    this.reportsDir = reportsDir;
    this.ensureReportsDirectory();
  }
  
  private async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }
  
  async generateReport(request: ReportRequest, userId: string): Promise<ReportMetadata> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track report generation
    await this.trackReportGeneration(reportId, request, userId);
    
    let data: any;
    let metadata: ReportMetadata;
    
    switch (request.type) {
      case ReportType.SAR:
        data = await this.generateSAR(request);
        break;
      case ReportType.CTR:
        data = await this.generateCTR(request);
        break;
      case ReportType.KYC_STATUS:
        data = await this.generateKYCStatusReport(request);
        break;
      case ReportType.AML_ALERT:
        data = await this.generateAMLAlertReport(request);
        break;
      case ReportType.RISK_ASSESSMENT:
        data = await this.generateRiskAssessmentReport(request);
        break;
      case ReportType.REGULATORY_FILING:
        data = await this.generateRegulatoryFiling(request);
        break;
      case ReportType.AUDIT_TRAIL:
        data = await this.generateAuditTrailReport(request);
        break;
      case ReportType.COMPLIANCE_SUMMARY:
        data = await this.generateComplianceSummary(request);
        break;
      default:
        throw new Error(`Unsupported report type: ${request.type}`);
    }
    
    // Format and save report
    const filePath = await this.formatAndSaveReport(reportId, data, request);
    
    // Get file size
    const stats = await fs.stat(filePath);
    
    metadata = {
      id: reportId,
      type: request.type,
      format: request.format,
      generatedAt: new Date(),
      generatedBy: userId,
      period: {
        start: request.startDate,
        end: request.endDate
      },
      recordCount: Array.isArray(data) ? data.length : 1,
      fileSize: stats.size,
      filePath
    };
    
    // Store metadata
    await this.storeReportMetadata(metadata);
    
    // Send notification if requested
    if (request.recipientEmail) {
      await this.sendReportNotification(metadata, request.recipientEmail);
    }
    
    return metadata;
  }
  
  private async generateSAR(request: ReportRequest): Promise<any> {
    const query = `
      SELECT 
        a.id as alert_id,
        a.user_id,
        u.first_name,
        u.last_name,
        u.email,
        a.alert_type,
        a.severity,
        a.description,
        a.transaction_ids,
        a.score,
        a.indicators,
        a.created_at,
        a.status,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_amount
      FROM aml_alerts a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN transactions t ON t.id = ANY(a.transaction_ids::uuid[])
      WHERE a.created_at BETWEEN $1 AND $2
        AND a.severity IN ('high', 'critical')
        AND a.status != 'false_positive'
      GROUP BY a.id, u.id
      ORDER BY a.created_at DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate]);
    
    return {
      reportType: 'Suspicious Activity Report',
      filingDate: new Date(),
      reportingInstitution: {
        name: 'Veria Platform',
        ein: process.env.COMPANY_EIN || 'XX-XXXXXXX',
        address: process.env.COMPANY_ADDRESS || '123 Main St, City, ST 12345'
      },
      activities: result.rows.map(row => ({
        subjectInformation: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          userId: row.user_id
        },
        suspiciousActivity: {
          alertId: row.alert_id,
          type: row.alert_type,
          severity: row.severity,
          description: row.description,
          indicators: JSON.parse(row.indicators),
          detectedAt: row.created_at
        },
        financialInformation: {
          transactionCount: row.transaction_count,
          totalAmount: row.total_amount,
          transactionIds: JSON.parse(row.transaction_ids)
        },
        status: row.status,
        riskScore: row.score
      })),
      summary: {
        totalAlerts: result.rows.length,
        totalAmount: result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0),
        criticalAlerts: result.rows.filter(row => row.severity === 'critical').length,
        highAlerts: result.rows.filter(row => row.severity === 'high').length
      }
    };
  }
  
  private async generateCTR(request: ReportRequest): Promise<any> {
    const threshold = request.filters?.threshold || 10000;
    
    const query = `
      SELECT 
        t.id as transaction_id,
        t.user_id,
        u.first_name,
        u.last_name,
        u.ssn,
        u.date_of_birth,
        u.address,
        t.amount,
        t.currency,
        t.type,
        t.source,
        t.destination,
        t.timestamp,
        t.metadata
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.timestamp BETWEEN $1 AND $2
        AND t.amount >= $3
      ORDER BY t.timestamp DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate, threshold]);
    
    return {
      reportType: 'Currency Transaction Report',
      filingDate: new Date(),
      reportingInstitution: {
        name: 'Veria Platform',
        ein: process.env.COMPANY_EIN || 'XX-XXXXXXX'
      },
      transactions: result.rows.map(row => ({
        person: {
          firstName: row.first_name,
          lastName: row.last_name,
          ssn: row.ssn ? `XXX-XX-${row.ssn.slice(-4)}` : 'Not Available',
          dateOfBirth: row.date_of_birth,
          address: row.address
        },
        transaction: {
          id: row.transaction_id,
          amount: row.amount,
          currency: row.currency,
          type: row.type,
          date: row.timestamp,
          source: row.source,
          destination: row.destination
        }
      })),
      summary: {
        totalTransactions: result.rows.length,
        totalAmount: result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0),
        uniqueIndividuals: new Set(result.rows.map(row => row.user_id)).size
      }
    };
  }
  
  private async generateKYCStatusReport(request: ReportRequest): Promise<any> {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at as user_created,
        u.kyc_status,
        u.kyc_verified_at,
        k.provider,
        k.status as session_status,
        k.required_level,
        k.created_at as kyc_initiated,
        k.updated_at as kyc_updated,
        COUNT(DISTINCT kd.id) as documents_count
      FROM users u
      LEFT JOIN kyc_sessions k ON u.id = k.user_id
      LEFT JOIN kyc_documents kd ON k.session_id = kd.session_id
      WHERE u.created_at BETWEEN $1 AND $2
      GROUP BY u.id, k.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate]);
    
    const statusCounts = {
      approved: 0,
      pending: 0,
      rejected: 0,
      not_started: 0
    };
    
    result.rows.forEach(row => {
      const status = row.kyc_status || 'not_started';
      statusCounts[status as keyof typeof statusCounts] = 
        (statusCounts[status as keyof typeof statusCounts] || 0) + 1;
    });
    
    return {
      reportType: 'KYC Status Report',
      generatedAt: new Date(),
      period: {
        start: request.startDate,
        end: request.endDate
      },
      users: result.rows.map(row => ({
        userId: row.id,
        email: row.email,
        name: `${row.first_name} ${row.last_name}`,
        registeredAt: row.user_created,
        kycStatus: row.kyc_status || 'not_started',
        kycVerifiedAt: row.kyc_verified_at,
        provider: row.provider,
        sessionStatus: row.session_status,
        requiredLevel: row.required_level,
        documentsSubmitted: row.documents_count,
        lastUpdated: row.kyc_updated || row.user_created
      })),
      summary: {
        totalUsers: result.rows.length,
        statusBreakdown: statusCounts,
        verificationRate: (statusCounts.approved / result.rows.length * 100).toFixed(2) + '%',
        averageVerificationTime: this.calculateAverageVerificationTime(result.rows)
      }
    };
  }
  
  private async generateAMLAlertReport(request: ReportRequest): Promise<any> {
    const query = `
      SELECT 
        a.*,
        u.email,
        u.first_name,
        u.last_name,
        p.risk_score as user_risk_score,
        p.risk_level as user_risk_level
      FROM aml_alerts a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN user_risk_profiles p ON u.id = p.user_id
      WHERE a.created_at BETWEEN $1 AND $2
      ORDER BY a.severity DESC, a.created_at DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate]);
    
    return {
      reportType: 'AML Alert Report',
      generatedAt: new Date(),
      period: {
        start: request.startDate,
        end: request.endDate
      },
      alerts: result.rows.map(row => ({
        alertId: row.id,
        user: {
          id: row.user_id,
          email: row.email,
          name: `${row.first_name} ${row.last_name}`,
          riskScore: row.user_risk_score,
          riskLevel: row.user_risk_level
        },
        alert: {
          type: row.alert_type,
          severity: row.severity,
          description: row.description,
          score: row.score,
          indicators: JSON.parse(row.indicators),
          transactionIds: JSON.parse(row.transaction_ids),
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      })),
      summary: {
        totalAlerts: result.rows.length,
        bySeverity: this.groupBySeverity(result.rows),
        byStatus: this.groupByStatus(result.rows),
        averageScore: this.calculateAverageScore(result.rows)
      }
    };
  }
  
  private async generateRiskAssessmentReport(request: ReportRequest): Promise<any> {
    const query = `
      SELECT 
        p.*,
        u.email,
        u.first_name,
        u.last_name,
        u.kyc_status,
        COUNT(DISTINCT a.id) as alert_count,
        COUNT(DISTINCT t.id) as transaction_count
      FROM user_risk_profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN aml_alerts a ON u.id = a.user_id
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE p.last_updated BETWEEN $1 AND $2
      GROUP BY p.user_id, u.id
      ORDER BY p.risk_score DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate]);
    
    return {
      reportType: 'Risk Assessment Report',
      generatedAt: new Date(),
      period: {
        start: request.startDate,
        end: request.endDate
      },
      assessments: result.rows.map(row => ({
        user: {
          id: row.user_id,
          email: row.email,
          name: `${row.first_name} ${row.last_name}`,
          kycStatus: row.kyc_status
        },
        riskProfile: {
          score: row.risk_score,
          level: row.risk_level,
          transactionCount: row.transaction_count,
          totalVolume: row.total_volume,
          averageTransactionSize: row.average_transaction_size,
          largestTransaction: row.largest_transaction,
          unusualPatterns: JSON.parse(row.unusual_patterns || '[]'),
          alertCount: row.alert_count,
          lastUpdated: row.last_updated
        }
      })),
      summary: {
        totalAssessments: result.rows.length,
        riskDistribution: this.calculateRiskDistribution(result.rows),
        averageRiskScore: this.calculateAverageRiskScore(result.rows),
        highRiskUsers: result.rows.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length
      }
    };
  }
  
  private async generateRegulatoryFiling(request: ReportRequest): Promise<any> {
    // Aggregate data for regulatory filing
    const [sars, ctrs, kyc, aml] = await Promise.all([
      this.db.query(
        'SELECT COUNT(*) as count FROM aml_alerts WHERE severity IN ($1, $2) AND created_at BETWEEN $3 AND $4',
        ['high', 'critical', request.startDate, request.endDate]
      ),
      this.db.query(
        'SELECT COUNT(*) as count FROM transactions WHERE amount >= $1 AND timestamp BETWEEN $2 AND $3',
        [10000, request.startDate, request.endDate]
      ),
      this.db.query(
        'SELECT kyc_status, COUNT(*) as count FROM users WHERE created_at BETWEEN $1 AND $2 GROUP BY kyc_status',
        [request.startDate, request.endDate]
      ),
      this.db.query(
        'SELECT risk_level, COUNT(*) as count FROM user_risk_profiles GROUP BY risk_level'
      )
    ]);
    
    return {
      reportType: 'Regulatory Filing',
      filingPeriod: {
        start: request.startDate,
        end: request.endDate
      },
      institution: {
        name: 'Veria Platform',
        licenseNumber: process.env.LICENSE_NUMBER || 'PENDING',
        jurisdiction: process.env.JURISDICTION || 'United States'
      },
      statistics: {
        suspiciousActivityReports: sars.rows[0].count,
        currencyTransactionReports: ctrs.rows[0].count,
        kycCompliance: kyc.rows,
        riskDistribution: aml.rows
      },
      certifications: {
        amlProgramInPlace: true,
        complianceOfficerAppointed: true,
        trainingConducted: true,
        independentTestingCompleted: false
      },
      attestation: {
        certifiedBy: 'Compliance Officer',
        date: new Date(),
        statement: 'The information provided in this filing is accurate and complete to the best of my knowledge.'
      }
    };
  }
  
  private async generateAuditTrailReport(request: ReportRequest): Promise<any> {
    const query = `
      SELECT 
        a.id,
        a.timestamp,
        a.user_id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.ip_address,
        a.user_agent,
        a.metadata,
        u.email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.timestamp BETWEEN $1 AND $2
      ORDER BY a.timestamp DESC
    `;
    
    const result = await this.db.query(query, [request.startDate, request.endDate]);
    
    return {
      reportType: 'Audit Trail Report',
      generatedAt: new Date(),
      period: {
        start: request.startDate,
        end: request.endDate
      },
      entries: result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        user: {
          id: row.user_id,
          email: row.email || 'System'
        },
        action: row.action,
        resource: {
          type: row.resource_type,
          id: row.resource_id
        },
        context: {
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          metadata: row.metadata
        }
      })),
      summary: {
        totalEntries: result.rows.length,
        uniqueUsers: new Set(result.rows.map(r => r.user_id)).size,
        actionTypes: this.groupByAction(result.rows)
      }
    };
  }
  
  private async generateComplianceSummary(request: ReportRequest): Promise<any> {
    // Comprehensive compliance summary
    const metrics = await Promise.all([
      this.getKYCMetrics(request.startDate, request.endDate),
      this.getAMLMetrics(request.startDate, request.endDate),
      this.getTransactionMetrics(request.startDate, request.endDate),
      this.getRiskMetrics(request.startDate, request.endDate)
    ]);
    
    return {
      reportType: 'Compliance Summary',
      generatedAt: new Date(),
      period: {
        start: request.startDate,
        end: request.endDate
      },
      kyc: metrics[0],
      aml: metrics[1],
      transactions: metrics[2],
      risk: metrics[3],
      recommendations: await this.generateRecommendations(metrics)
    };
  }
  
  private async formatAndSaveReport(reportId: string, data: any, request: ReportRequest): Promise<string> {
    let filePath: string;
    let content: Buffer | string;
    
    switch (request.format) {
      case ReportFormat.PDF:
        content = await this.generatePDF(data, request.type);
        filePath = path.join(this.reportsDir, `${reportId}.pdf`);
        break;
        
      case ReportFormat.CSV:
        content = this.generateCSV(data);
        filePath = path.join(this.reportsDir, `${reportId}.csv`);
        break;
        
      case ReportFormat.JSON:
        content = JSON.stringify(data, null, 2);
        filePath = path.join(this.reportsDir, `${reportId}.json`);
        break;
        
      case ReportFormat.XML:
        content = this.generateXML(data);
        filePath = path.join(this.reportsDir, `${reportId}.xml`);
        break;
        
      default:
        throw new Error(`Unsupported format: ${request.format}`);
    }
    
    await fs.writeFile(filePath, content);
    return filePath;
  }
  
  private async generatePDF(data: any, reportType: ReportType): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Add content based on report type
      doc.fontSize(20).text(`${reportType} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown();
      
      // Add report-specific content
      this.addPDFContent(doc, data, reportType);
      
      doc.end();
    });
  }
  
  private addPDFContent(doc: any, data: any, reportType: ReportType) {
    // Add content based on report type
    if (data.summary) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10);
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      doc.moveDown();
    }
    
    // Add detailed records if available
    if (Array.isArray(data.activities) || Array.isArray(data.transactions) || Array.isArray(data.alerts)) {
      const records = data.activities || data.transactions || data.alerts;
      doc.fontSize(14).text('Details', { underline: true });
      doc.fontSize(8);
      
      records.slice(0, 100).forEach((record: any, index: number) => {
        doc.text(`Record ${index + 1}: ${JSON.stringify(record, null, 2)}`);
        doc.moveDown(0.5);
      });
    }
  }
  
  private generateCSV(data: any): string {
    // Extract flat data for CSV
    let records: any[] = [];
    
    if (Array.isArray(data)) {
      records = data;
    } else if (data.activities) {
      records = data.activities;
    } else if (data.transactions) {
      records = data.transactions;
    } else if (data.alerts) {
      records = data.alerts;
    } else if (data.users) {
      records = data.users;
    }
    
    if (records.length === 0) {
      return '';
    }
    
    // Flatten nested objects
    const flatRecords = records.map(record => this.flattenObject(record));
    
    return stringify(flatRecords, {
      header: true,
      columns: Object.keys(flatRecords[0])
    });
  }
  
  private generateXML(data: any): string {
    // Simple XML generation
    const convert = (obj: any, rootName: string = 'report'): string => {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>`;
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          xml += `<${key}/>`;
        } else if (typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(item => {
              xml += convert(item, key);
            });
          } else {
            xml += convert(value, key);
          }
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }
      
      xml += `</${rootName}>`;
      return xml;
    };
    
    return convert(data);
  }
  
  private flattenObject(obj: any, prefix: string = ''): any {
    const flattened: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
  
  private async trackReportGeneration(reportId: string, request: ReportRequest, userId: string) {
    await this.db.query(
      `INSERT INTO report_generation_log 
      (report_id, report_type, format, requested_by, requested_at, filters)
      VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [reportId, request.type, request.format, userId, JSON.stringify(request.filters)]
    );
  }
  
  private async storeReportMetadata(metadata: ReportMetadata) {
    await this.db.query(
      `INSERT INTO report_metadata 
      (id, type, format, generated_at, generated_by, period_start, period_end, 
       record_count, file_size, file_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        metadata.id,
        metadata.type,
        metadata.format,
        metadata.generatedAt,
        metadata.generatedBy,
        metadata.period.start,
        metadata.period.end,
        metadata.recordCount,
        metadata.fileSize,
        metadata.filePath
      ]
    );
    
    // Cache metadata for quick access
    await this.redis.setex(
      `report:${metadata.id}`,
      86400, // 24 hours
      JSON.stringify(metadata)
    );
  }
  
  private async sendReportNotification(metadata: ReportMetadata, email: string) {
    // Implement email notification
    console.log(`Report ${metadata.id} generated and ready for ${email}`);
    // In production, integrate with email service
  }
  
  // Helper methods
  private calculateAverageVerificationTime(rows: any[]): string {
    const times = rows
      .filter(r => r.kyc_verified_at && r.user_created)
      .map(r => new Date(r.kyc_verified_at).getTime() - new Date(r.user_created).getTime());
    
    if (times.length === 0) return 'N/A';
    
    const avgMs = times.reduce((sum, time) => sum + time, 0) / times.length;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    
    return `${avgHours} hours`;
  }
  
  private groupBySeverity(rows: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    rows.forEach(row => {
      grouped[row.severity] = (grouped[row.severity] || 0) + 1;
    });
    return grouped;
  }
  
  private groupByStatus(rows: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    rows.forEach(row => {
      grouped[row.status] = (grouped[row.status] || 0) + 1;
    });
    return grouped;
  }
  
  private groupByAction(rows: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    rows.forEach(row => {
      grouped[row.action] = (grouped[row.action] || 0) + 1;
    });
    return grouped;
  }
  
  private calculateAverageScore(rows: any[]): number {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, row) => acc + (row.score || 0), 0);
    return Math.round(sum / rows.length);
  }
  
  private calculateAverageRiskScore(rows: any[]): number {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, row) => acc + (row.risk_score || 0), 0);
    return Math.round(sum / rows.length);
  }
  
  private calculateRiskDistribution(rows: any[]): Record<string, number> {
    const distribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    rows.forEach(row => {
      const level = row.risk_level || 'low';
      distribution[level] = (distribution[level] || 0) + 1;
    });
    
    return distribution;
  }
  
  private async getKYCMetrics(startDate: Date, endDate: Date): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN kyc_status = 'approved' THEN 1 END) as verified,
        COUNT(CASE WHEN kyc_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN kyc_status = 'rejected' THEN 1 END) as rejected
      FROM users
      WHERE created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    return result.rows[0];
  }
  
  private async getAMLMetrics(startDate: Date, endDate: Date): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM aml_alerts
      WHERE created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    return result.rows[0];
  }
  
  private async getTransactionMetrics(startDate: Date, endDate: Date): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_volume,
        AVG(amount) as average_amount,
        MAX(amount) as largest_transaction
      FROM transactions
      WHERE timestamp BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    return result.rows[0];
  }
  
  private async getRiskMetrics(startDate: Date, endDate: Date): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        AVG(risk_score) as average_risk_score,
        COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as high_risk_users
      FROM user_risk_profiles
      WHERE last_updated BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    return result.rows[0];
  }
  
  private async generateRecommendations(metrics: any[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    const [kyc, aml, transactions, risk] = metrics;
    
    // KYC recommendations
    const verificationRate = kyc.verified / kyc.total_users;
    if (verificationRate < 0.8) {
      recommendations.push('Improve KYC verification rate - currently below 80%');
    }
    
    // AML recommendations
    if (aml.critical > 0) {
      recommendations.push(`Address ${aml.critical} critical AML alerts immediately`);
    }
    
    const resolutionRate = aml.resolved / aml.total_alerts;
    if (resolutionRate < 0.9) {
      recommendations.push('Improve AML alert resolution rate');
    }
    
    // Risk recommendations
    if (risk.high_risk_users > 10) {
      recommendations.push(`Review ${risk.high_risk_users} high-risk users for enhanced monitoring`);
    }
    
    return recommendations;
  }
}