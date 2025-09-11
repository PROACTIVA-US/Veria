import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { createHash } from 'crypto';

export interface SanctionsList {
  id: string;
  name: string;
  source: 'OFAC' | 'UN' | 'EU' | 'UK' | 'CUSTOM';
  lastUpdated: Date;
  active: boolean;
  entries: SanctionEntry[];
}

export interface SanctionEntry {
  id: string;
  type: 'individual' | 'entity' | 'vessel' | 'aircraft';
  names: string[];
  aliases?: string[];
  identifiers?: {
    type: string;
    value: string;
  }[];
  addresses?: string[];
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string[];
  programs?: string[];
  remarks?: string;
  score?: number;
}

export interface ScreeningRequest {
  requestId: string;
  subjectType: 'individual' | 'entity';
  name: string;
  alternateNames?: string[];
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  identifiers?: {
    type: string;
    value: string;
  }[];
  metadata?: Record<string, any>;
}

export interface ScreeningResult {
  requestId: string;
  status: 'clear' | 'potential_match' | 'confirmed_match' | 'error';
  matches: ScreeningMatch[];
  listsChecked: string[];
  screeningTime: number;
  timestamp: string;
}

export interface ScreeningMatch {
  listId: string;
  listName: string;
  entryId: string;
  matchScore: number;
  matchedFields: string[];
  entry: SanctionEntry;
  requiresReview: boolean;
}

export class SanctionsScreener {
  private db: Pool;
  private redis: Redis;
  private lists: Map<string, SanctionsList> = new Map();
  private lastUpdateCheck: Date = new Date();

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  async initialize(): Promise<void> {
    await this.loadSanctionsList();
    // Schedule periodic updates
    setInterval(() => this.checkForUpdates(), 6 * 60 * 60 * 1000); // Check every 6 hours
  }

  private async loadSanctionsList(): Promise<void> {
    try {
      // Load from database
      const result = await this.db.query(`
        SELECT * FROM sanctions_lists 
        WHERE active = true
      `);

      for (const row of result.rows) {
        const entries = await this.loadListEntries(row.id);
        const list: SanctionsList = {
          id: row.id,
          name: row.name,
          source: row.source,
          lastUpdated: row.last_updated,
          active: row.active,
          entries
        };
        this.lists.set(list.id, list);
      }

      // Cache in Redis
      await this.redis.set(
        'sanctions:lists:loaded',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          count: this.lists.size
        }),
        'EX',
        3600 // 1 hour TTL
      );
    } catch (error) {
      console.error('Failed to load sanctions lists:', error);
    }
  }

  private async loadListEntries(listId: string): Promise<SanctionEntry[]> {
    const result = await this.db.query(`
      SELECT * FROM sanctions_entries 
      WHERE list_id = $1
    `, [listId]);

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      names: JSON.parse(row.names || '[]'),
      aliases: JSON.parse(row.aliases || '[]'),
      identifiers: JSON.parse(row.identifiers || '[]'),
      addresses: JSON.parse(row.addresses || '[]'),
      dateOfBirth: row.date_of_birth,
      placeOfBirth: row.place_of_birth,
      nationality: JSON.parse(row.nationality || '[]'),
      programs: JSON.parse(row.programs || '[]'),
      remarks: row.remarks,
      score: row.risk_score
    }));
  }

  async screen(request: ScreeningRequest): Promise<ScreeningResult> {
    const startTime = Date.now();
    const matches: ScreeningMatch[] = [];
    const listsChecked: string[] = [];

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.redis.get(`sanctions:screening:${cacheKey}`);
      
      if (cached) {
        const cachedResult = JSON.parse(cached);
        if (this.isCacheValid(cachedResult)) {
          return cachedResult;
        }
      }

      // Perform screening against all active lists
      for (const [listId, list] of this.lists) {
        listsChecked.push(list.name);
        const listMatches = await this.screenAgainstList(request, list);
        matches.push(...listMatches);
      }

      // Determine overall status
      const status = this.determineStatus(matches);

      const result: ScreeningResult = {
        requestId: request.requestId,
        status,
        matches: matches.sort((a, b) => b.matchScore - a.matchScore),
        listsChecked,
        screeningTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Cache result
      await this.redis.set(
        `sanctions:screening:${cacheKey}`,
        JSON.stringify(result),
        'EX',
        300 // 5 minutes TTL
      );

      // Log screening
      await this.logScreening(request, result);

      return result;
    } catch (error) {
      console.error('Screening error:', error);
      return {
        requestId: request.requestId,
        status: 'error',
        matches: [],
        listsChecked,
        screeningTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async screenAgainstList(request: ScreeningRequest, list: SanctionsList): Promise<ScreeningMatch[]> {
    const matches: ScreeningMatch[] = [];

    for (const entry of list.entries) {
      // Skip if type doesn't match
      if (request.subjectType !== entry.type && entry.type !== 'entity') {
        continue;
      }

      const matchResult = this.calculateMatch(request, entry);
      
      if (matchResult.score > 0.5) { // Threshold for potential match
        matches.push({
          listId: list.id,
          listName: list.name,
          entryId: entry.id,
          matchScore: matchResult.score,
          matchedFields: matchResult.matchedFields,
          entry,
          requiresReview: matchResult.score < 0.95 // High confidence threshold
        });
      }
    }

    return matches;
  }

  private calculateMatch(request: ScreeningRequest, entry: SanctionEntry): { score: number; matchedFields: string[] } {
    let totalScore = 0;
    let weightSum = 0;
    const matchedFields: string[] = [];

    // Name matching (highest weight)
    const nameScore = this.calculateNameMatch(request.name, entry.names.concat(entry.aliases || []));
    if (nameScore > 0.7) {
      totalScore += nameScore * 0.5;
      weightSum += 0.5;
      matchedFields.push('name');
    }

    // Date of birth matching
    if (request.dateOfBirth && entry.dateOfBirth) {
      const dobMatch = request.dateOfBirth === entry.dateOfBirth ? 1 : 0;
      if (dobMatch) {
        totalScore += dobMatch * 0.2;
        weightSum += 0.2;
        matchedFields.push('dateOfBirth');
      }
    }

    // Nationality matching
    if (request.nationality && entry.nationality) {
      const nationalityMatch = entry.nationality.includes(request.nationality) ? 1 : 0;
      if (nationalityMatch) {
        totalScore += nationalityMatch * 0.15;
        weightSum += 0.15;
        matchedFields.push('nationality');
      }
    }

    // Address matching
    if (request.address && entry.addresses) {
      const addressScore = this.calculateAddressMatch(request.address, entry.addresses);
      if (addressScore > 0.6) {
        totalScore += addressScore * 0.15;
        weightSum += 0.15;
        matchedFields.push('address');
      }
    }

    // Identifier matching
    if (request.identifiers && entry.identifiers) {
      for (const reqId of request.identifiers) {
        for (const entryId of entry.identifiers) {
          if (reqId.type === entryId.type && reqId.value === entryId.value) {
            totalScore += 0.3;
            weightSum += 0.3;
            matchedFields.push(`identifier:${reqId.type}`);
            break;
          }
        }
      }
    }

    const finalScore = weightSum > 0 ? totalScore / weightSum : 0;
    return { score: finalScore, matchedFields };
  }

  private calculateNameMatch(name: string, targetNames: string[]): number {
    const normalized = this.normalizeName(name);
    let maxScore = 0;

    for (const targetName of targetNames) {
      const targetNormalized = this.normalizeName(targetName);
      
      // Exact match
      if (normalized === targetNormalized) {
        return 1.0;
      }

      // Fuzzy matching using Levenshtein distance
      const distance = this.levenshteinDistance(normalized, targetNormalized);
      const maxLength = Math.max(normalized.length, targetNormalized.length);
      const similarity = 1 - (distance / maxLength);
      
      // Token-based matching
      const tokenScore = this.tokenMatch(normalized, targetNormalized);
      
      // Combine scores
      const score = Math.max(similarity, tokenScore);
      maxScore = Math.max(maxScore, score);
    }

    return maxScore;
  }

  private calculateAddressMatch(address: string, targetAddresses: string[]): number {
    const normalized = this.normalizeAddress(address);
    let maxScore = 0;

    for (const targetAddress of targetAddresses) {
      const targetNormalized = this.normalizeAddress(targetAddress);
      
      // Token-based matching for addresses
      const tokens1 = normalized.split(/\s+/);
      const tokens2 = targetNormalized.split(/\s+/);
      
      let matchCount = 0;
      for (const token1 of tokens1) {
        if (tokens2.some(token2 => token1 === token2 || this.levenshteinDistance(token1, token2) <= 1)) {
          matchCount++;
        }
      }
      
      const score = matchCount / Math.max(tokens1.length, tokens2.length);
      maxScore = Math.max(maxScore, score);
    }

    return maxScore;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenMatch(str1: string, str2: string): number {
    const tokens1 = new Set(str1.split(/\s+/));
    const tokens2 = new Set(str2.split(/\s+/));
    
    let matchCount = 0;
    for (const token of tokens1) {
      if (tokens2.has(token)) {
        matchCount++;
      }
    }
    
    return matchCount / Math.max(tokens1.size, tokens2.size);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private determineStatus(matches: ScreeningMatch[]): 'clear' | 'potential_match' | 'confirmed_match' {
    if (matches.length === 0) {
      return 'clear';
    }
    
    const highConfidenceMatch = matches.find(m => m.matchScore >= 0.95);
    if (highConfidenceMatch) {
      return 'confirmed_match';
    }
    
    return 'potential_match';
  }

  private generateCacheKey(request: ScreeningRequest): string {
    const data = {
      name: request.name,
      dob: request.dateOfBirth,
      nationality: request.nationality
    };
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private isCacheValid(cachedResult: any): boolean {
    const cacheTime = new Date(cachedResult.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - cacheTime.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Cache valid for 5 minutes
  }

  private async logScreening(request: ScreeningRequest, result: ScreeningResult): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO sanctions_screening_log 
        (request_id, request_data, result_status, matches_count, screening_time_ms, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        request.requestId,
        JSON.stringify(request),
        result.status,
        result.matches.length,
        result.screeningTime,
        new Date()
      ]);
    } catch (error) {
      console.error('Failed to log screening:', error);
    }
  }

  private async checkForUpdates(): Promise<void> {
    // This would connect to external sanctions list providers
    // and update the local database with new entries
    console.log('Checking for sanctions list updates...');
    this.lastUpdateCheck = new Date();
  }

  async addToCustomList(entry: SanctionEntry, listName: string = 'CUSTOM'): Promise<void> {
    // Add entry to custom sanctions list
    let list = Array.from(this.lists.values()).find(l => l.name === listName && l.source === 'CUSTOM');
    
    if (!list) {
      // Create custom list if it doesn't exist
      const listId = `custom-${Date.now()}`;
      list = {
        id: listId,
        name: listName,
        source: 'CUSTOM',
        lastUpdated: new Date(),
        active: true,
        entries: []
      };
      
      await this.db.query(`
        INSERT INTO sanctions_lists (id, name, source, last_updated, active)
        VALUES ($1, $2, $3, $4, $5)
      `, [list.id, list.name, list.source, list.lastUpdated, list.active]);
      
      this.lists.set(list.id, list);
    }
    
    // Add entry
    entry.id = `${list.id}-${Date.now()}`;
    await this.db.query(`
      INSERT INTO sanctions_entries 
      (id, list_id, type, names, aliases, identifiers, addresses, date_of_birth, place_of_birth, nationality, programs, remarks, risk_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      entry.id,
      list.id,
      entry.type,
      JSON.stringify(entry.names),
      JSON.stringify(entry.aliases || []),
      JSON.stringify(entry.identifiers || []),
      JSON.stringify(entry.addresses || []),
      entry.dateOfBirth,
      entry.placeOfBirth,
      JSON.stringify(entry.nationality || []),
      JSON.stringify(entry.programs || []),
      entry.remarks,
      entry.score || 100
    ]);
    
    list.entries.push(entry);
    
    // Invalidate cache
    await this.redis.del('sanctions:lists:loaded');
  }

  async removeFromCustomList(entryId: string): Promise<void> {
    await this.db.query('DELETE FROM sanctions_entries WHERE id = $1', [entryId]);
    
    // Remove from in-memory lists
    for (const list of this.lists.values()) {
      const index = list.entries.findIndex(e => e.id === entryId);
      if (index >= 0) {
        list.entries.splice(index, 1);
        break;
      }
    }
    
    // Invalidate cache
    await this.redis.del('sanctions:lists:loaded');
  }
}