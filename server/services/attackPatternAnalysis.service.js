/**
 * Attack Pattern Analysis Engine
 * Implements brute force and credential stuffing detection
 * Tracks cross-session attack patterns and coordinated attacks across tenants
 * Requirements: 9.4, 11.5
 */

import platformLogger from '../utils/platformLogger.js';
import { SECURITY_EVENT_TYPES } from '../utils/companyLogger.js';

class AttackPatternAnalysisService {
    constructor() {
        this.isInitialized = false;
        this.analysisEnabled = true;
        
        // Attack pattern tracking
        this.bruteForcePatterns = new Map(); // IP -> brute force data
        this.credentialStuffingPatterns = new Map(); // IP -> credential stuffing data
        this.crossSessionPatterns = new Map(); // sessionId -> attack data
        this.coordinatedAttacks = new Map(); // attackId -> coordinated attack data
        
        // Thresholds for attack detection
        this.attackThresholds = {
            bruteForce: {
                failedAttempts: 10,
                timeWindow: 900000, // 15 minutes
                uniqueUsernames: 3,
                lockoutDuration: 3600000 // 1 hour
            },
            credentialStuffing: {
                failedAttempts: 50,
                timeWindow: 3600000, // 1 hour
                uniqueUsernames: 20,
                successRate: 0.05 // Less than 5% success rate indicates stuffing
            },
            coordinatedAttack: {
                minIPs: 3,
                timeWindow: 1800000, // 30 minutes
                minTargets: 5,
                similarityThreshold: 0.7
            }
        };
        
        // Pattern signatures for different attack types
        this.attackSignatures = {
            bruteForce: {
                patterns: [
                    'sequential_passwords', // password1, password2, etc.
                    'common_passwords', // admin, password, 123456, etc.
                    'dictionary_attack', // words from dictionary
                    'keyboard_walk' // qwerty, asdf, etc.
                ]
            },
            credentialStuffing: {
                patterns: [
                    'credential_pairs', // username:password combinations
                    'breach_data', // known compromised credentials
                    'high_volume_low_success', // many attempts, few successes
                    'distributed_sources' // multiple IPs, same credentials
                ]
            }
        };
        
        // Session tracking for cross-session analysis
        this.sessionTracking = new Map(); // sessionId -> session data
        this.ipTracking = new Map(); // IP -> cross-session data
        
        // Coordinated attack detection
        this.attackClusters = new Map(); // clusterId -> attack cluster data
        this.suspiciousIPs = new Set(); // IPs flagged for suspicious activity
        
        this.initialize();
    }

    /**
     * Initialize the attack pattern analysis service
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            // Start periodic analysis tasks
            this.startPeriodicAnalysis();
            
            // Initialize cleanup tasks
            this.startCleanupTasks();
            
            this.isInitialized = true;
            platformLogger.info('Attack Pattern Analysis Service initialized', {
                service: 'AttackPatternAnalysis',
                status: 'initialized',
                thresholds: this.attackThresholds
            });
        } catch (error) {
            platformLogger.error('Failed to initialize Attack Pattern Analysis Service', {
                service: 'AttackPatternAnalysis',
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Analyze authentication attempt for brute force patterns
     * Requirements: 9.4 - Brute force detection
     */
    analyzeBruteForcePattern(authData) {
        const {
            ipAddress,
            username,
            password,
            success,
            timestamp = Date.now(),
            userAgent,
            sessionId,
            tenantId
        } = authData;

        const patternKey = ipAddress;
        const currentTime = timestamp;

        // Initialize tracking for this IP
        if (!this.bruteForcePatterns.has(patternKey)) {
            this.bruteForcePatterns.set(patternKey, {
                attempts: [],
                firstAttempt: currentTime,
                totalAttempts: 0,
                failedAttempts: 0,
                successfulAttempts: 0,
                uniqueUsernames: new Set(),
                uniquePasswords: new Set(),
                attackPatterns: [],
                isBlocked: false,
                blockUntil: null
            });
        }

        const pattern = this.bruteForcePatterns.get(patternKey);
        
        // Check if IP is currently blocked
        if (pattern.isBlocked && currentTime < pattern.blockUntil) {
            return {
                type: 'brute_force_blocked',
                severity: 'high',
                description: 'Blocked IP attempting authentication during lockout period',
                details: {
                    ipAddress,
                    blockUntil: new Date(pattern.blockUntil).toISOString(),
                    remainingTime: pattern.blockUntil - currentTime
                }
            };
        }

        // Add attempt to tracking
        pattern.attempts.push({
            timestamp: currentTime,
            username,
            password: this.hashPassword(password), // Store hash for pattern analysis
            success,
            userAgent,
            sessionId,
            tenantId
        });
        
        pattern.totalAttempts++;
        pattern.uniqueUsernames.add(username);
        pattern.uniquePasswords.add(this.hashPassword(password));
        
        if (!success) {
            pattern.failedAttempts++;
        } else {
            pattern.successfulAttempts++;
        }

        // Analyze for brute force patterns
        const recentAttempts = pattern.attempts.filter(
            attempt => currentTime - attempt.timestamp < this.attackThresholds.bruteForce.timeWindow
        );

        const recentFailures = recentAttempts.filter(attempt => !attempt.success);
        const violations = [];

        // 1. High volume of failed attempts
        if (recentFailures.length >= this.attackThresholds.bruteForce.failedAttempts) {
            violations.push({
                type: 'brute_force_volume',
                severity: 'critical',
                description: 'High volume brute force attack detected',
                details: {
                    ipAddress,
                    failedAttempts: recentFailures.length,
                    timeWindow: this.attackThresholds.bruteForce.timeWindow,
                    uniqueUsernames: pattern.uniqueUsernames.size,
                    attackDuration: currentTime - pattern.firstAttempt
                }
            });

            // Block the IP
            pattern.isBlocked = true;
            pattern.blockUntil = currentTime + this.attackThresholds.bruteForce.lockoutDuration;
        }

        // 2. Multiple username targeting
        if (pattern.uniqueUsernames.size >= this.attackThresholds.bruteForce.uniqueUsernames) {
            violations.push({
                type: 'brute_force_multi_target',
                severity: 'high',
                description: 'Brute force attack targeting multiple usernames',
                details: {
                    ipAddress,
                    targetedUsernames: pattern.uniqueUsernames.size,
                    totalAttempts: pattern.totalAttempts,
                    usernames: Array.from(pattern.uniqueUsernames).slice(0, 10) // Limit for logging
                }
            });
        }

        // 3. Password pattern analysis
        const passwordPatterns = this.analyzePasswordPatterns(Array.from(pattern.uniquePasswords));
        if (passwordPatterns.length > 0) {
            violations.push({
                type: 'brute_force_pattern',
                severity: 'medium',
                description: 'Systematic password pattern detected in brute force attack',
                details: {
                    ipAddress,
                    detectedPatterns: passwordPatterns,
                    passwordVariations: pattern.uniquePasswords.size,
                    username
                }
            });
        }

        // Log violations
        violations.forEach(violation => {
            platformLogger.error(`Brute Force Attack: ${violation.type}`, {
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp: new Date(currentTime).toISOString(),
                forensicData: {
                    recentAttempts: recentAttempts.slice(-20), // Last 20 attempts
                    attackSignature: this.generateAttackSignature(recentAttempts),
                    threatLevel: this.calculateThreatLevel(pattern)
                }
            });
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Analyze for credential stuffing patterns
     * Requirements: 9.4 - Credential stuffing detection
     */
    analyzeCredentialStuffingPattern(authData) {
        const {
            ipAddress,
            username,
            password,
            success,
            timestamp = Date.now(),
            userAgent,
            sessionId,
            tenantId
        } = authData;

        const patternKey = ipAddress;
        const currentTime = timestamp;

        // Initialize tracking for credential stuffing
        if (!this.credentialStuffingPatterns.has(patternKey)) {
            this.credentialStuffingPatterns.set(patternKey, {
                attempts: [],
                firstAttempt: currentTime,
                totalAttempts: 0,
                successfulAttempts: 0,
                uniqueCredentialPairs: new Set(),
                uniqueUsernames: new Set(),
                successRate: 0,
                credentialSources: new Set(),
                distributedPattern: false
            });
        }

        const pattern = this.credentialStuffingPatterns.get(patternKey);
        const credentialPair = `${username}:${this.hashPassword(password)}`;

        // Add attempt to tracking
        pattern.attempts.push({
            timestamp: currentTime,
            username,
            credentialPair,
            success,
            userAgent,
            sessionId,
            tenantId
        });

        pattern.totalAttempts++;
        pattern.uniqueCredentialPairs.add(credentialPair);
        pattern.uniqueUsernames.add(username);
        
        if (success) {
            pattern.successfulAttempts++;
        }

        // Calculate success rate
        pattern.successRate = pattern.successfulAttempts / pattern.totalAttempts;

        // Analyze for credential stuffing patterns
        const recentAttempts = pattern.attempts.filter(
            attempt => currentTime - attempt.timestamp < this.attackThresholds.credentialStuffing.timeWindow
        );

        const violations = [];

        // 1. High volume with low success rate (classic credential stuffing)
        if (recentAttempts.length >= this.attackThresholds.credentialStuffing.failedAttempts &&
            pattern.successRate <= this.attackThresholds.credentialStuffing.successRate) {
            
            violations.push({
                type: 'credential_stuffing_volume',
                severity: 'critical',
                description: 'Credential stuffing attack detected (high volume, low success)',
                details: {
                    ipAddress,
                    totalAttempts: recentAttempts.length,
                    successRate: pattern.successRate,
                    uniqueCredentials: pattern.uniqueCredentialPairs.size,
                    uniqueUsernames: pattern.uniqueUsernames.size,
                    timeWindow: this.attackThresholds.credentialStuffing.timeWindow
                }
            });
        }

        // 2. Many unique credential pairs (indicates breach data usage)
        if (pattern.uniqueCredentialPairs.size >= this.attackThresholds.credentialStuffing.uniqueUsernames) {
            violations.push({
                type: 'credential_stuffing_breach_data',
                severity: 'high',
                description: 'Credential stuffing using breach data detected',
                details: {
                    ipAddress,
                    uniqueCredentialPairs: pattern.uniqueCredentialPairs.size,
                    uniqueUsernames: pattern.uniqueUsernames.size,
                    successRate: pattern.successRate,
                    potentialBreachSource: this.identifyBreachSource(pattern.uniqueCredentialPairs)
                }
            });
        }

        // 3. Cross-IP credential stuffing detection
        const crossIPPattern = this.detectCrossIPCredentialStuffing(credentialPair, ipAddress, currentTime);
        if (crossIPPattern) {
            violations.push({
                type: 'credential_stuffing_distributed',
                severity: 'critical',
                description: 'Distributed credential stuffing attack detected',
                details: {
                    primaryIP: ipAddress,
                    distributedIPs: crossIPPattern.ips,
                    sharedCredentials: crossIPPattern.sharedCredentials,
                    coordinationLevel: crossIPPattern.coordinationLevel
                }
            });
        }

        // Log violations
        violations.forEach(violation => {
            platformLogger.error(`Credential Stuffing Attack: ${violation.type}`, {
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp: new Date(currentTime).toISOString(),
                forensicData: {
                    recentAttempts: recentAttempts.slice(-50), // Last 50 attempts
                    credentialAnalysis: this.analyzeCredentialPatterns(pattern.uniqueCredentialPairs),
                    attackVector: 'credential_stuffing'
                }
            });
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Track cross-session attack patterns
     * Requirements: 9.4 - Cross-session attack pattern tracking
     */
    trackCrossSessionPatterns(sessionData) {
        const {
            sessionId,
            ipAddress,
            userId,
            userAgent,
            activities,
            timestamp = Date.now(),
            tenantId
        } = sessionData;

        // Track session data
        if (!this.sessionTracking.has(sessionId)) {
            this.sessionTracking.set(sessionId, {
                sessionId,
                ipAddress,
                userId,
                userAgent,
                startTime: timestamp,
                activities: [],
                suspiciousActivities: [],
                riskScore: 0,
                tenantId
            });
        }

        const session = this.sessionTracking.get(sessionId);
        session.activities.push(...(activities || []));

        // Track IP across sessions
        if (!this.ipTracking.has(ipAddress)) {
            this.ipTracking.set(ipAddress, {
                sessions: new Set(),
                users: new Set(),
                tenants: new Set(),
                firstSeen: timestamp,
                lastSeen: timestamp,
                totalSessions: 0,
                suspiciousPatterns: []
            });
        }

        const ipData = this.ipTracking.get(ipAddress);
        ipData.sessions.add(sessionId);
        ipData.users.add(userId);
        ipData.tenants.add(tenantId);
        ipData.lastSeen = timestamp;
        ipData.totalSessions = ipData.sessions.size;

        // Analyze cross-session patterns
        const violations = [];

        // 1. Session hijacking detection
        const hijackingPattern = this.detectSessionHijacking(sessionId, ipAddress, userAgent);
        if (hijackingPattern) {
            violations.push({
                type: 'session_hijacking',
                severity: 'critical',
                description: 'Potential session hijacking detected',
                details: {
                    sessionId,
                    suspiciousIP: ipAddress,
                    originalIP: hijackingPattern.originalIP,
                    userAgentMismatch: hijackingPattern.userAgentMismatch,
                    timeGap: hijackingPattern.timeGap
                }
            });
        }

        // 2. Multi-session abuse from same IP
        if (ipData.sessions.size > 10 && ipData.users.size > 5) {
            violations.push({
                type: 'multi_session_abuse',
                severity: 'high',
                description: 'Multiple session abuse from single IP detected',
                details: {
                    ipAddress,
                    sessionCount: ipData.sessions.size,
                    userCount: ipData.users.size,
                    tenantCount: ipData.tenants.size,
                    timeSpan: timestamp - ipData.firstSeen
                }
            });
        }

        // 3. Cross-tenant session patterns
        if (ipData.tenants.size > 3) {
            violations.push({
                type: 'cross_tenant_session_pattern',
                severity: 'medium',
                description: 'Cross-tenant session pattern detected',
                details: {
                    ipAddress,
                    affectedTenants: Array.from(ipData.tenants),
                    sessionCount: ipData.sessions.size,
                    potentialThreat: 'reconnaissance_or_data_harvesting'
                }
            });
        }

        // Log violations
        violations.forEach(violation => {
            platformLogger.error(`Cross-Session Attack: ${violation.type}`, {
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp: new Date(timestamp).toISOString(),
                forensicData: {
                    sessionData: session,
                    ipHistory: this.getIPHistory(ipAddress),
                    crossSessionAnalysis: this.analyzeCrossSessionBehavior(ipAddress)
                }
            });
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Detect coordinated attacks across tenants
     * Requirements: 11.5 - Coordinated attack detection across tenants
     */
    detectCoordinatedAttacks(attackData) {
        const {
            attackType,
            sourceIPs,
            targetTenants,
            timestamp = Date.now(),
            attackSignature,
            payload
        } = attackData;

        const currentTime = timestamp;
        const attackId = this.generateAttackId(attackType, sourceIPs, targetTenants);

        // Initialize coordinated attack tracking
        if (!this.coordinatedAttacks.has(attackId)) {
            this.coordinatedAttacks.set(attackId, {
                attackId,
                attackType,
                firstDetected: currentTime,
                lastActivity: currentTime,
                sourceIPs: new Set(),
                targetTenants: new Set(),
                attackEvents: [],
                coordinationLevel: 0,
                threatLevel: 'low'
            });
        }

        const attack = this.coordinatedAttacks.get(attackId);
        
        // Update attack data
        sourceIPs.forEach(ip => attack.sourceIPs.add(ip));
        targetTenants.forEach(tenant => attack.targetTenants.add(tenant));
        attack.lastActivity = currentTime;
        attack.attackEvents.push({
            timestamp: currentTime,
            sourceIPs,
            targetTenants,
            attackSignature,
            payload
        });

        // Calculate coordination level
        attack.coordinationLevel = this.calculateCoordinationLevel(attack);
        attack.threatLevel = this.calculateThreatLevel(attack);

        const violations = [];

        // 1. Multi-IP coordinated attack
        if (attack.sourceIPs.size >= this.attackThresholds.coordinatedAttack.minIPs) {
            violations.push({
                type: 'coordinated_multi_ip_attack',
                severity: 'critical',
                description: 'Coordinated attack from multiple IP addresses detected',
                details: {
                    attackId,
                    attackType,
                    sourceIPCount: attack.sourceIPs.size,
                    targetTenantCount: attack.targetTenants.size,
                    coordinationLevel: attack.coordinationLevel,
                    duration: currentTime - attack.firstDetected,
                    sourceIPs: Array.from(attack.sourceIPs).slice(0, 20) // Limit for logging
                }
            });
        }

        // 2. Multi-tenant targeting
        if (attack.targetTenants.size >= this.attackThresholds.coordinatedAttack.minTargets) {
            violations.push({
                type: 'coordinated_multi_tenant_attack',
                severity: 'critical',
                description: 'Coordinated attack targeting multiple tenants detected',
                details: {
                    attackId,
                    attackType,
                    targetTenantCount: attack.targetTenants.size,
                    sourceIPCount: attack.sourceIPs.size,
                    affectedTenants: Array.from(attack.targetTenants),
                    attackPattern: this.identifyAttackPattern(attack)
                }
            });
        }

        // 3. Synchronized attack timing
        const synchronization = this.analyzeSynchronization(attack.attackEvents);
        if (synchronization.isSynchronized) {
            violations.push({
                type: 'synchronized_coordinated_attack',
                severity: 'critical',
                description: 'Highly synchronized coordinated attack detected',
                details: {
                    attackId,
                    synchronizationLevel: synchronization.level,
                    timingVariance: synchronization.variance,
                    eventCount: attack.attackEvents.length,
                    coordinationEvidence: synchronization.evidence
                }
            });
        }

        // 4. Attack signature similarity (botnet detection)
        const signatureSimilarity = this.analyzeSignatureSimilarity(attack.attackEvents);
        if (signatureSimilarity > this.attackThresholds.coordinatedAttack.similarityThreshold) {
            violations.push({
                type: 'botnet_coordinated_attack',
                severity: 'critical',
                description: 'Botnet-style coordinated attack detected',
                details: {
                    attackId,
                    signatureSimilarity,
                    botnetIndicators: this.identifyBotnetIndicators(attack),
                    commandControlEvidence: this.detectCommandControl(attack)
                }
            });
        }

        // Log violations
        violations.forEach(violation => {
            platformLogger.threatIntelligence({
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp: new Date(currentTime).toISOString(),
                affectedTenants: Array.from(attack.targetTenants),
                attackingIPs: Array.from(attack.sourceIPs),
                forensicData: {
                    fullAttackData: attack,
                    threatIntelligence: this.generateThreatIntelligence(attack),
                    recommendedActions: this.generateRecommendedActions(attack)
                }
            });
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Analyze password patterns for brute force detection
     */
    analyzePasswordPatterns(passwordHashes) {
        const patterns = [];
        
        // This is a simplified analysis - in production, you'd use more sophisticated pattern detection
        if (passwordHashes.length > 10) {
            patterns.push('high_volume_variations');
        }
        
        return patterns;
    }

    /**
     * Generate attack signature for pattern analysis
     */
    generateAttackSignature(attempts) {
        return {
            attemptCount: attempts.length,
            timeSpan: attempts.length > 0 ? attempts[attempts.length - 1].timestamp - attempts[0].timestamp : 0,
            uniqueUsernames: new Set(attempts.map(a => a.username)).size,
            userAgentVariations: new Set(attempts.map(a => a.userAgent)).size,
            successRate: attempts.filter(a => a.success).length / attempts.length
        };
    }

    /**
     * Calculate threat level based on attack pattern
     */
    calculateThreatLevel(pattern) {
        let score = 0;
        
        if (pattern.totalAttempts > 100) score += 3;
        else if (pattern.totalAttempts > 50) score += 2;
        else if (pattern.totalAttempts > 10) score += 1;
        
        if (pattern.uniqueUsernames && pattern.uniqueUsernames.size > 10) score += 2;
        if (pattern.failedAttempts > pattern.successfulAttempts * 10) score += 2;
        
        if (score >= 5) return 'critical';
        if (score >= 3) return 'high';
        if (score >= 1) return 'medium';
        return 'low';
    }

    /**
     * Hash password for pattern analysis (simple hash for demo)
     */
    hashPassword(password) {
        // In production, use a proper hashing function
        return Buffer.from(password).toString('base64').substring(0, 10);
    }

    /**
     * Detect cross-IP credential stuffing
     */
    detectCrossIPCredentialStuffing(credentialPair, currentIP, timestamp) {
        const sharedCredentials = [];
        const relatedIPs = [];
        
        // Check other IPs for same credential pair
        for (const [ip, pattern] of this.credentialStuffingPatterns.entries()) {
            if (ip !== currentIP && pattern.uniqueCredentialPairs.has(credentialPair)) {
                relatedIPs.push(ip);
                sharedCredentials.push(credentialPair);
            }
        }
        
        if (relatedIPs.length >= 2) {
            return {
                ips: [currentIP, ...relatedIPs],
                sharedCredentials,
                coordinationLevel: relatedIPs.length / 10 // Simple coordination metric
            };
        }
        
        return null;
    }

    /**
     * Detect session hijacking patterns
     */
    detectSessionHijacking(sessionId, currentIP, currentUserAgent) {
        const session = this.sessionTracking.get(sessionId);
        if (!session) return null;
        
        // Check for IP changes
        if (session.ipAddress !== currentIP) {
            return {
                originalIP: session.ipAddress,
                userAgentMismatch: session.userAgent !== currentUserAgent,
                timeGap: Date.now() - session.startTime
            };
        }
        
        return null;
    }

    /**
     * Get IP history for forensic analysis
     */
    getIPHistory(ipAddress) {
        const ipData = this.ipTracking.get(ipAddress);
        if (!ipData) return null;
        
        return {
            totalSessions: ipData.totalSessions,
            uniqueUsers: ipData.users.size,
            uniqueTenants: ipData.tenants.size,
            firstSeen: ipData.firstSeen,
            lastSeen: ipData.lastSeen,
            timeSpan: ipData.lastSeen - ipData.firstSeen
        };
    }

    /**
     * Analyze cross-session behavior
     */
    analyzeCrossSessionBehavior(ipAddress) {
        const ipData = this.ipTracking.get(ipAddress);
        if (!ipData) return null;
        
        return {
            sessionPattern: ipData.sessions.size > 5 ? 'high_activity' : 'normal',
            userPattern: ipData.users.size > 3 ? 'multi_user' : 'single_user',
            tenantPattern: ipData.tenants.size > 1 ? 'cross_tenant' : 'single_tenant',
            riskIndicators: this.calculateRiskIndicators(ipData)
        };
    }

    /**
     * Calculate risk indicators for IP
     */
    calculateRiskIndicators(ipData) {
        const indicators = [];
        
        if (ipData.sessions.size > 10) indicators.push('high_session_count');
        if (ipData.users.size > 5) indicators.push('multiple_users');
        if (ipData.tenants.size > 2) indicators.push('cross_tenant_access');
        
        return indicators;
    }

    /**
     * Generate attack ID for coordinated attacks
     */
    generateAttackId(attackType, sourceIPs, targetTenants) {
        const ipHash = sourceIPs.sort().join(',').substring(0, 10);
        const tenantHash = targetTenants.sort().join(',').substring(0, 10);
        return `${attackType}_${ipHash}_${tenantHash}_${Date.now()}`;
    }

    /**
     * Calculate coordination level for attacks
     */
    calculateCoordinationLevel(attack) {
        let level = 0;
        
        // More IPs = higher coordination
        level += Math.min(attack.sourceIPs.size / 10, 1) * 0.3;
        
        // More targets = higher coordination
        level += Math.min(attack.targetTenants.size / 5, 1) * 0.3;
        
        // Event frequency
        const timeSpan = attack.lastActivity - attack.firstDetected;
        const eventFrequency = attack.attackEvents.length / (timeSpan / 60000); // events per minute
        level += Math.min(eventFrequency / 10, 1) * 0.4;
        
        return Math.min(level, 1);
    }

    /**
     * Identify attack pattern
     */
    identifyAttackPattern(attack) {
        const patterns = [];
        
        if (attack.sourceIPs.size > 10) patterns.push('distributed');
        if (attack.targetTenants.size > 5) patterns.push('multi_target');
        if (attack.coordinationLevel > 0.7) patterns.push('highly_coordinated');
        
        return patterns;
    }

    /**
     * Analyze synchronization of attack events
     */
    analyzeSynchronization(events) {
        if (events.length < 3) return { isSynchronized: false };
        
        const timestamps = events.map(e => e.timestamp);
        const intervals = [];
        
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        return {
            isSynchronized: variance < avgInterval * 0.1, // Low variance indicates synchronization
            level: 1 - (variance / avgInterval),
            variance,
            evidence: {
                avgInterval,
                variance,
                eventCount: events.length
            }
        };
    }

    /**
     * Analyze signature similarity between attack events
     */
    analyzeSignatureSimilarity(events) {
        if (events.length < 2) return 0;
        
        // Simplified similarity analysis
        const signatures = events.map(e => e.attackSignature);
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < signatures.length - 1; i++) {
            for (let j = i + 1; j < signatures.length; j++) {
                totalSimilarity += this.calculateSignatureSimilarity(signatures[i], signatures[j]);
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    /**
     * Calculate similarity between two attack signatures
     */
    calculateSignatureSimilarity(sig1, sig2) {
        if (!sig1 || !sig2) return 0;
        
        // Simple similarity based on payload characteristics
        let similarity = 0;
        let factors = 0;
        
        // Compare payload sizes
        if (sig1.payloadSize && sig2.payloadSize) {
            const sizeDiff = Math.abs(sig1.payloadSize - sig2.payloadSize);
            similarity += Math.max(0, 1 - sizeDiff / Math.max(sig1.payloadSize, sig2.payloadSize));
            factors++;
        }
        
        // Compare timing patterns
        if (sig1.timing && sig2.timing) {
            const timingDiff = Math.abs(sig1.timing - sig2.timing);
            similarity += Math.max(0, 1 - timingDiff / Math.max(sig1.timing, sig2.timing));
            factors++;
        }
        
        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * Identify botnet indicators
     */
    identifyBotnetIndicators(attack) {
        const indicators = [];
        
        if (attack.sourceIPs.size > 20) indicators.push('large_ip_pool');
        if (attack.coordinationLevel > 0.8) indicators.push('high_coordination');
        
        return indicators;
    }

    /**
     * Detect command and control evidence
     */
    detectCommandControl(attack) {
        // Simplified C&C detection
        return {
            synchronizedTiming: attack.coordinationLevel > 0.7,
            similarPayloads: true, // Would analyze actual payloads
            distributedSources: attack.sourceIPs.size > 10
        };
    }

    /**
     * Generate threat intelligence report
     */
    generateThreatIntelligence(attack) {
        return {
            attackType: attack.attackType,
            threatLevel: attack.threatLevel,
            coordinationLevel: attack.coordinationLevel,
            sourceCount: attack.sourceIPs.size,
            targetCount: attack.targetTenants.size,
            duration: attack.lastActivity - attack.firstDetected,
            indicators: this.identifyBotnetIndicators(attack),
            attribution: this.analyzeAttribution(attack)
        };
    }

    /**
     * Analyze attack attribution
     */
    analyzeAttribution(attack) {
        return {
            likelyAutomated: attack.coordinationLevel > 0.6,
            sophisticationLevel: attack.coordinationLevel > 0.8 ? 'high' : 'medium',
            resourceLevel: attack.sourceIPs.size > 50 ? 'high' : 'medium'
        };
    }

    /**
     * Generate recommended actions
     */
    generateRecommendedActions(attack) {
        const actions = [];
        
        if (attack.sourceIPs.size > 10) {
            actions.push('block_source_ips');
            actions.push('implement_rate_limiting');
        }
        
        if (attack.targetTenants.size > 5) {
            actions.push('notify_affected_tenants');
            actions.push('increase_monitoring');
        }
        
        if (attack.coordinationLevel > 0.7) {
            actions.push('escalate_to_security_team');
            actions.push('implement_advanced_blocking');
        }
        
        return actions;
    }

    /**
     * Identify breach source for credential stuffing
     */
    identifyBreachSource(credentialPairs) {
        // Simplified breach source identification
        if (credentialPairs.size > 1000) return 'large_breach_database';
        if (credentialPairs.size > 100) return 'medium_breach_database';
        return 'small_breach_or_targeted';
    }

    /**
     * Analyze credential patterns
     */
    analyzeCredentialPatterns(credentialPairs) {
        return {
            totalPairs: credentialPairs.size,
            estimatedSource: this.identifyBreachSource(credentialPairs),
            patternType: credentialPairs.size > 100 ? 'automated' : 'manual'
        };
    }

    /**
     * Start periodic analysis tasks
     */
    startPeriodicAnalysis() {
        // Analyze coordinated attacks every 5 minutes
        setInterval(() => {
            if (this.analysisEnabled) {
                this.analyzeGlobalAttackPatterns();
            }
        }, 300000);

        // Generate threat intelligence reports every 15 minutes
        setInterval(() => {
            if (this.analysisEnabled) {
                this.generateThreatIntelligenceReports();
            }
        }, 900000);
    }

    /**
     * Analyze global attack patterns
     */
    analyzeGlobalAttackPatterns() {
        const currentTime = Date.now();
        const timeWindow = 3600000; // 1 hour
        
        // Analyze patterns across all tracked attacks
        const recentAttacks = [];
        
        for (const [attackId, attack] of this.coordinatedAttacks.entries()) {
            if (currentTime - attack.lastActivity < timeWindow) {
                recentAttacks.push(attack);
            }
        }
        
        if (recentAttacks.length > 0) {
            platformLogger.info('Global Attack Pattern Analysis', {
                service: 'AttackPatternAnalysis',
                recentAttackCount: recentAttacks.length,
                totalSourceIPs: new Set(recentAttacks.flatMap(a => Array.from(a.sourceIPs))).size,
                totalTargetTenants: new Set(recentAttacks.flatMap(a => Array.from(a.targetTenants))).size,
                averageCoordination: recentAttacks.reduce((sum, a) => sum + a.coordinationLevel, 0) / recentAttacks.length
            });
        }
    }

    /**
     * Generate threat intelligence reports
     */
    generateThreatIntelligenceReports() {
        const reports = [];
        
        for (const [attackId, attack] of this.coordinatedAttacks.entries()) {
            if (attack.threatLevel === 'critical' || attack.coordinationLevel > 0.7) {
                reports.push(this.generateThreatIntelligence(attack));
            }
        }
        
        if (reports.length > 0) {
            platformLogger.threatIntelligence({
                reportType: 'periodic_threat_intelligence',
                reportCount: reports.length,
                reports: reports.slice(0, 10), // Limit for logging
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Start cleanup tasks
     */
    startCleanupTasks() {
        // Clean up old data every hour
        setInterval(() => {
            const currentTime = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            // Clean up brute force patterns
            for (const [key, pattern] of this.bruteForcePatterns.entries()) {
                pattern.attempts = pattern.attempts.filter(
                    attempt => currentTime - attempt.timestamp < maxAge
                );
                if (pattern.attempts.length === 0) {
                    this.bruteForcePatterns.delete(key);
                }
            }
            
            // Clean up credential stuffing patterns
            for (const [key, pattern] of this.credentialStuffingPatterns.entries()) {
                pattern.attempts = pattern.attempts.filter(
                    attempt => currentTime - attempt.timestamp < maxAge
                );
                if (pattern.attempts.length === 0) {
                    this.credentialStuffingPatterns.delete(key);
                }
            }
            
            // Clean up session tracking
            for (const [sessionId, session] of this.sessionTracking.entries()) {
                if (currentTime - session.startTime > maxAge) {
                    this.sessionTracking.delete(sessionId);
                }
            }
            
            // Clean up coordinated attacks
            for (const [attackId, attack] of this.coordinatedAttacks.entries()) {
                if (currentTime - attack.lastActivity > maxAge) {
                    this.coordinatedAttacks.delete(attackId);
                }
            }
        }, 3600000); // Run every hour
    }

    /**
     * Enable or disable analysis
     */
    setAnalysisEnabled(enabled) {
        this.analysisEnabled = enabled;
        platformLogger.info(`Attack pattern analysis ${enabled ? 'enabled' : 'disabled'}`, {
            service: 'AttackPatternAnalysis',
            analysisEnabled: enabled
        });
    }

    /**
     * Get analysis statistics
     */
    getAnalysisStats() {
        return {
            isInitialized: this.isInitialized,
            analysisEnabled: this.analysisEnabled,
            bruteForcePatterns: this.bruteForcePatterns.size,
            credentialStuffingPatterns: this.credentialStuffingPatterns.size,
            trackedSessions: this.sessionTracking.size,
            coordinatedAttacks: this.coordinatedAttacks.size,
            suspiciousIPs: this.suspiciousIPs.size,
            thresholds: this.attackThresholds
        };
    }

    /**
     * Export attack pattern data
     */
    exportAttackPatternData() {
        return {
            bruteForcePatterns: Object.fromEntries(this.bruteForcePatterns),
            credentialStuffingPatterns: Object.fromEntries(this.credentialStuffingPatterns),
            sessionTracking: Object.fromEntries(this.sessionTracking),
            coordinatedAttacks: Object.fromEntries(this.coordinatedAttacks),
            ipTracking: Object.fromEntries(this.ipTracking),
            stats: this.getAnalysisStats()
        };
    }
}

// Create singleton instance
const attackPatternAnalysisService = new AttackPatternAnalysisService();

export default attackPatternAnalysisService;