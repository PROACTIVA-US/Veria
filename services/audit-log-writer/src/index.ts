import Fastify from 'fastify';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createPostgresPool, dbQueries } from '@veria/database';

const app = Fastify({ logger: true });
const db = createPostgresPool();

app.get('/health', async () => ({ status: 'ok', name: 'audit-log-writer', ts: new Date().toISOString() }));

app.post('/audit', async (req: any, reply: any) => {
  const payload = req.body ?? {};
  
  // Write to database
  try {
    await db.query(dbQueries.createAuditLog, [
      payload.eventType || 'general',
      payload.serviceName || 'unknown',
      payload.userId || null,
      payload.resourceId || null,
      payload.action || 'log',
      payload.details || payload,
      payload.ipAddress || req.ip,
      payload.userAgent || req.headers['user-agent']
    ]);
  } catch (error) {
    app.log.error(error, 'Failed to write to database');
  }
  
  // Also write to file for redundancy
  const dir = process.env.AUDIT_DIR || './.audit-data';
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, 'audit.log');
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n';
  writeFileSync(file, line, { flag: 'a' });
  
  return reply.code(201).send({ ok: true });
});

// GET /audit/items endpoint expected by Gateway
app.get('/audit/items', async (req: any, reply: any) => {
  try {
    const { limit = 100, offset = 0, filter } = req.query || {};
    const dir = process.env.AUDIT_DIR || './.audit-data';
    const file = join(dir, 'audit.log');
    
    // If audit file doesn't exist, return empty array
    if (!existsSync(file)) {
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          limit: Number(limit),
          offset: Number(offset)
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Read and parse audit log entries
    const content = readFileSync(file, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    
    let items = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(item => item !== null);
    
    // Apply filter if provided
    if (filter) {
      items = items.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
          return item[key] && item[key].toString().toLowerCase().includes(value.toString().toLowerCase());
        });
      });
    }
    
    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    
    const total = items.length;
    const startIndex = Number(offset);
    const endIndex = startIndex + Number(limit);
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        limit: Number(limit),
        offset: Number(offset)
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    app.log.error(error, 'Error reading audit items');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'READ_ERROR',
        message: 'Failed to read audit items'
      }]
    });
  }
});

// GET /audit/logs - Database-backed audit log retrieval
app.get('/audit/logs', async (req: any, reply: any) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      userId, 
      serviceName, 
      eventType,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query || {};
    
    // Build dynamic query
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    if (userId) {
      query += ` AND user_id = $${++paramCount}`;
      params.push(userId);
    }
    
    if (serviceName) {
      query += ` AND service_name = $${++paramCount}`;
      params.push(serviceName);
    }
    
    if (eventType) {
      query += ` AND event_type = $${++paramCount}`;
      params.push(eventType);
    }
    
    if (startDate) {
      query += ` AND created_at >= $${++paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND created_at <= $${++paramCount}`;
      params.push(endDate);
    }
    
    // Add sorting
    const allowedSortFields = ['created_at', 'event_type', 'service_name'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}`;
    
    // Add pagination
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset
    if (userId) countQuery += ' AND user_id = $1';
    if (serviceName) countQuery += ' AND service_name = $2';
    if (eventType) countQuery += ' AND event_type = $3';
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.count || 0);
    
    return {
      success: true,
      data: {
        logs: result.rows,
        total,
        limit: Number(limit),
        offset: Number(offset),
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        totalPages: Math.ceil(total / Number(limit))
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch audit logs');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch audit logs from database'
      }]
    });
  }
});

// GET /audit/logs/:id - Get specific audit log by ID
app.get('/audit/logs/:id', async (req: any, reply: any) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        errors: [{
          code: 'NOT_FOUND',
          message: `Audit log with ID ${id} not found`
        }]
      });
    }
    
    return {
      success: true,
      data: result.rows[0],
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to fetch audit log');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch audit log'
      }]
    });
  }
});

// GET /audit/search - Advanced search with aggregations
app.get('/audit/search', async (req: any, reply: any) => {
  try {
    const { 
      query: searchQuery,
      aggregateBy,
      groupBy,
      limit = 100
    } = req.query || {};
    
    if (aggregateBy) {
      // Aggregation query
      const allowedAggregations = ['event_type', 'service_name', 'user_id', 'action'];
      const field = allowedAggregations.includes(aggregateBy) ? aggregateBy : 'event_type';
      
      const result = await db.query(`
        SELECT ${field}, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ${field} 
        ORDER BY count DESC 
        LIMIT $1
      `, [limit]);
      
      return {
        success: true,
        data: {
          aggregation: aggregateBy,
          results: result.rows
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
    
    if (searchQuery) {
      // Full-text search in details JSONB field
      const result = await db.query(`
        SELECT * FROM audit_logs 
        WHERE details::text ILIKE $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [`%${searchQuery}%`, limit]);
      
      return {
        success: true,
        data: {
          query: searchQuery,
          results: result.rows,
          count: result.rows.length
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return reply.status(400).send({
      success: false,
      errors: [{
        code: 'INVALID_QUERY',
        message: 'Please provide either a search query or aggregation parameter'
      }]
    });
  } catch (error) {
    app.log.error(error, 'Search failed');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'SEARCH_ERROR',
        message: 'Failed to search audit logs'
      }]
    });
  }
});

// GET /audit/stats - Get audit statistics
app.get('/audit/stats', async (req: any, reply: any) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT service_name) as unique_services,
        COUNT(DISTINCT event_type) as unique_events,
        MIN(created_at) as first_log,
        MAX(created_at) as last_log
      FROM audit_logs
    `);
    
    const recentActivity = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    return {
      success: true,
      data: {
        overview: stats.rows[0],
        recentActivity: recentActivity.rows
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    app.log.error(error, 'Failed to get stats');
    return reply.status(500).send({
      success: false,
      errors: [{
        code: 'STATS_ERROR',
        message: 'Failed to generate statistics'
      }]
    });
  }
});

const port = Number(process.env.PORT || 3005);
const host = process.env.HOST || '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
