/**
 * Insurance Reporting Service
 * 
 * Provides comprehensive reporting functionality for life insurance module
 * Features:
 * - PDF report generation using PDFKit
 * - Excel export using XLSX
 * - Multiple report types (policies, claims, family members)
 * - Customizable date ranges and filters
 */

import PDFDocument from 'pdfkit';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import InsurancePolicy from '../models/InsurancePolicy.js';
import InsuranceClaim from '../models/InsuranceClaim.js';
import FamilyMember from '../models/FamilyMember.js';
import User from '../../hr-core/users/models/user.model.js';
import logger from '../../../utils/logger.js';

class InsuranceReportService {
    constructor() {
        this.reportsDir = 'uploads/insurance-reports';
        this.ensureReportsDirectory();
    }

    /**
     * Ensure reports directory exists
     */
    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Generate comprehensive insurance report (PDF)
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Report options
     * @returns {Promise<string>} - File path of generated report
     */
    async generateInsuranceReportPDF(tenantId, options = {}) {
        const {
            startDate,
            endDate,
            includeExpired = false,
            includeClaims = true,
            includeFamilyMembers = true,
            reportTitle = 'Insurance Report'
        } = options;

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Fetch data
        const [policies, claims, familyMembers, tenant] = await Promise.all([
            this.getPoliciesData(tenantId, dateFilter, includeExpired),
            includeClaims ? this.getClaimsData(tenantId, dateFilter) : [],
            includeFamilyMembers ? this.getFamilyMembersData(tenantId, dateFilter) : [],
            this.getTenantInfo(tenantId)
        ]);

        // Generate PDF
        const filename = `insurance-report-${tenantId}-${Date.now()}.pdf`;
        const filePath = path.join(this.reportsDir, filename);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(filePath));

        // Header
        this.addPDFHeader(doc, reportTitle, tenant);

        // Summary section
        this.addPDFSummary(doc, policies, claims, familyMembers);

        // Policies section
        this.addPDFPoliciesSection(doc, policies);

        if (includeClaims && claims.length > 0) {
            // Claims section
            this.addPDFClaimsSection(doc, claims);
        }

        if (includeFamilyMembers && familyMembers.length > 0) {
            // Family members section
            this.addPDFFamilyMembersSection(doc, familyMembers);
        }

        // Footer
        this.addPDFFooter(doc);

        doc.end();

        // Wait for PDF to be written
        await new Promise((resolve) => {
            doc.on('end', resolve);
        });

        logger.info('Insurance PDF report generated', {
            tenantId,
            filename,
            policiesCount: policies.length,
            claimsCount: claims.length,
            familyMembersCount: familyMembers.length
        });

        return filePath;
    }

    /**
     * Generate insurance report in Excel format
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Report options
     * @returns {Promise<string>} - File path of generated report
     */
    async generateInsuranceReportExcel(tenantId, options = {}) {
        const {
            startDate,
            endDate,
            includeExpired = false,
            includeClaims = true,
            includeFamilyMembers = true
        } = options;

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Fetch data
        const [policies, claims, familyMembers] = await Promise.all([
            this.getPoliciesData(tenantId, dateFilter, includeExpired),
            includeClaims ? this.getClaimsData(tenantId, dateFilter) : [],
            includeFamilyMembers ? this.getFamilyMembersData(tenantId, dateFilter) : []
        ]);

        // Create workbook
        const workbook = xlsx.utils.book_new();

        // Policies worksheet
        const policiesData = this.formatPoliciesForExcel(policies);
        const policiesWS = xlsx.utils.json_to_sheet(policiesData);
        xlsx.utils.book_append_sheet(workbook, policiesWS, 'Policies');

        // Claims worksheet
        if (includeClaims && claims.length > 0) {
            const claimsData = this.formatClaimsForExcel(claims);
            const claimsWS = xlsx.utils.json_to_sheet(claimsData);
            xlsx.utils.book_append_sheet(workbook, claimsWS, 'Claims');
        }

        // Family members worksheet
        if (includeFamilyMembers && familyMembers.length > 0) {
            const familyData = this.formatFamilyMembersForExcel(familyMembers);
            const familyWS = xlsx.utils.json_to_sheet(familyData);
            xlsx.utils.book_append_sheet(workbook, familyWS, 'Family Members');
        }

        // Summary worksheet
        const summaryData = this.createSummaryData(policies, claims, familyMembers);
        const summaryWS = xlsx.utils.json_to_sheet(summaryData);
        xlsx.utils.book_append_sheet(workbook, summaryWS, 'Summary');

        // Save file
        const filename = `insurance-report-${tenantId}-${Date.now()}.xlsx`;
        const filePath = path.join(this.reportsDir, filename);
        xlsx.writeFile(workbook, filePath);

        logger.info('Insurance Excel report generated', {
            tenantId,
            filename,
            policiesCount: policies.length,
            claimsCount: claims.length,
            familyMembersCount: familyMembers.length
        });

        return filePath;
    }

    /**
     * Get policies data for reporting
     */
    async getPoliciesData(tenantId, dateFilter, includeExpired) {
        const query = { tenantId };
        
        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        if (!includeExpired) {
            query.status = { $ne: 'expired' };
        }

        return await InsurancePolicy.find(query)
            .populate('employeeId', 'firstName lastName email employeeId department')
            .populate('familyMembers')
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Get claims data for reporting
     */
    async getClaimsData(tenantId, dateFilter) {
        const query = { tenantId };
        
        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        return await InsuranceClaim.find(query)
            .populate('policyId', 'policyNumber policyType')
            .populate('employeeId', 'firstName lastName email employeeId')
            .populate('claimantId', 'firstName lastName relationship')
            .populate('reviewedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Get family members data for reporting
     */
    async getFamilyMembersData(tenantId, dateFilter) {
        const query = { tenantId, status: { $ne: 'removed' } };
        
        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        return await FamilyMember.find(query)
            .populate('employeeId', 'firstName lastName email employeeId')
            .populate('policyId', 'policyNumber policyType')
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Get tenant information
     */
    async getTenantInfo(tenantId) {
        // This would typically come from a Tenant model
        // For now, return basic info
        return {
            id: tenantId,
            name: 'Company Name', // Would be fetched from tenant data
            reportGeneratedAt: new Date()
        };
    }

    /**
     * Add PDF header
     */
    addPDFHeader(doc, title, tenant) {
        doc.fontSize(20).text(title, { align: 'center' });
        doc.fontSize(12).text(`Generated for: ${tenant.name}`, { align: 'center' });
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);
    }

    /**
     * Add PDF summary section
     */
    addPDFSummary(doc, policies, claims, familyMembers) {
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Total Policies: ${policies.length}`);
        doc.text(`Active Policies: ${policies.filter(p => p.status === 'active').length}`);
        doc.text(`Total Claims: ${claims.length}`);
        doc.text(`Pending Claims: ${claims.filter(c => c.status === 'pending').length}`);
        doc.text(`Approved Claims: ${claims.filter(c => c.status === 'approved').length}`);
        doc.text(`Total Family Members: ${familyMembers.length}`);

        const totalCoverage = policies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
        const totalClaims = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
        const totalApproved = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.approvedAmount || 0), 0);

        doc.text(`Total Coverage Amount: $${totalCoverage.toLocaleString()}`);
        doc.text(`Total Claims Amount: $${totalClaims.toLocaleString()}`);
        doc.text(`Total Approved Amount: $${totalApproved.toLocaleString()}`);

        doc.moveDown(2);
    }

    /**
     * Add PDF policies section
     */
    addPDFPoliciesSection(doc, policies) {
        doc.addPage();
        doc.fontSize(16).text('Insurance Policies', { underline: true });
        doc.moveDown();

        policies.forEach((policy, index) => {
            if (index > 0 && index % 3 === 0) {
                doc.addPage();
            }

            doc.fontSize(12);
            doc.text(`Policy #${policy.policyNumber}`);
            doc.text(`Employee: ${policy.employeeId?.firstName} ${policy.employeeId?.lastName}`);
            doc.text(`Type: ${policy.policyType}`);
            doc.text(`Coverage: $${policy.coverageAmount?.toLocaleString()}`);
            doc.text(`Premium: $${policy.premium?.toLocaleString()}`);
            doc.text(`Status: ${policy.status}`);
            doc.text(`Start Date: ${new Date(policy.startDate).toLocaleDateString()}`);
            doc.text(`End Date: ${new Date(policy.endDate).toLocaleDateString()}`);
            doc.moveDown();
        });
    }

    /**
     * Add PDF claims section
     */
    addPDFClaimsSection(doc, claims) {
        doc.addPage();
        doc.fontSize(16).text('Insurance Claims', { underline: true });
        doc.moveDown();

        claims.forEach((claim, index) => {
            if (index > 0 && index % 2 === 0) {
                doc.addPage();
            }

            doc.fontSize(12);
            doc.text(`Claim #${claim.claimNumber}`);
            doc.text(`Policy: ${claim.policyId?.policyNumber}`);
            doc.text(`Employee: ${claim.employeeId?.firstName} ${claim.employeeId?.lastName}`);
            doc.text(`Type: ${claim.claimType}`);
            doc.text(`Amount: $${claim.claimAmount?.toLocaleString()}`);
            doc.text(`Status: ${claim.status}`);
            doc.text(`Incident Date: ${new Date(claim.incidentDate).toLocaleDateString()}`);
            if (claim.approvedAmount) {
                doc.text(`Approved Amount: $${claim.approvedAmount.toLocaleString()}`);
            }
            doc.moveDown();
        });
    }

    /**
     * Add PDF family members section
     */
    addPDFFamilyMembersSection(doc, familyMembers) {
        doc.addPage();
        doc.fontSize(16).text('Family Members', { underline: true });
        doc.moveDown();

        familyMembers.forEach((member, index) => {
            if (index > 0 && index % 4 === 0) {
                doc.addPage();
            }

            doc.fontSize(12);
            doc.text(`Insurance #${member.insuranceNumber}`);
            doc.text(`Name: ${member.firstName} ${member.lastName}`);
            doc.text(`Relationship: ${member.relationship}`);
            doc.text(`Employee: ${member.employeeId?.firstName} ${member.employeeId?.lastName}`);
            doc.text(`Coverage: $${member.coverageAmount?.toLocaleString()}`);
            doc.text(`Status: ${member.status}`);
            doc.moveDown();
        });
    }

    /**
     * Add PDF footer
     */
    addPDFFooter(doc) {
        doc.fontSize(10);
        doc.text('This report is confidential and for internal use only.', 50, doc.page.height - 50, {
            align: 'center'
        });
    }

    /**
     * Format policies data for Excel export
     */
    formatPoliciesForExcel(policies) {
        return policies.map(policy => ({
            'Policy Number': policy.policyNumber,
            'Employee Name': `${policy.employeeId?.firstName || ''} ${policy.employeeId?.lastName || ''}`,
            'Employee ID': policy.employeeId?.employeeId,
            'Department': policy.employeeId?.department,
            'Policy Type': policy.policyType,
            'Coverage Amount': policy.coverageAmount,
            'Premium': policy.premium,
            'Deductible': policy.deductible,
            'Status': policy.status,
            'Start Date': new Date(policy.startDate).toLocaleDateString(),
            'End Date': new Date(policy.endDate).toLocaleDateString(),
            'Family Members Count': policy.familyMembers?.length || 0,
            'Created Date': new Date(policy.createdAt).toLocaleDateString()
        }));
    }

    /**
     * Format claims data for Excel export
     */
    formatClaimsForExcel(claims) {
        return claims.map(claim => ({
            'Claim Number': claim.claimNumber,
            'Policy Number': claim.policyId?.policyNumber,
            'Employee Name': `${claim.employeeId?.firstName || ''} ${claim.employeeId?.lastName || ''}`,
            'Claimant Type': claim.claimantType,
            'Claimant Name': claim.claimantId ? `${claim.claimantId.firstName || ''} ${claim.claimantId.lastName || ''}` : '',
            'Claim Type': claim.claimType,
            'Claim Amount': claim.claimAmount,
            'Approved Amount': claim.approvedAmount || 0,
            'Status': claim.status,
            'Priority': claim.priority,
            'Incident Date': new Date(claim.incidentDate).toLocaleDateString(),
            'Submitted Date': new Date(claim.createdAt).toLocaleDateString(),
            'Reviewed By': claim.reviewedBy ? `${claim.reviewedBy.firstName} ${claim.reviewedBy.lastName}` : '',
            'Review Date': claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : '',
            'Payment Method': claim.paymentMethod || '',
            'Payment Date': claim.paymentDate ? new Date(claim.paymentDate).toLocaleDateString() : '',
            'Documents Count': claim.documents?.length || 0
        }));
    }

    /**
     * Format family members data for Excel export
     */
    formatFamilyMembersForExcel(familyMembers) {
        return familyMembers.map(member => ({
            'Insurance Number': member.insuranceNumber,
            'First Name': member.firstName,
            'Last Name': member.lastName,
            'Relationship': member.relationship,
            'Date of Birth': new Date(member.dateOfBirth).toLocaleDateString(),
            'Gender': member.gender,
            'Employee Name': `${member.employeeId?.firstName || ''} ${member.employeeId?.lastName || ''}`,
            'Policy Number': member.policyId?.policyNumber,
            'Coverage Amount': member.coverageAmount,
            'Status': member.status,
            'Coverage Start': new Date(member.coverageStartDate).toLocaleDateString(),
            'Coverage End': new Date(member.coverageEndDate).toLocaleDateString(),
            'Phone': member.phone || '',
            'Email': member.email || ''
        }));
    }

    /**
     * Create summary data for Excel
     */
    createSummaryData(policies, claims, familyMembers) {
        const activePolicies = policies.filter(p => p.status === 'active');
        const pendingClaims = claims.filter(c => c.status === 'pending');
        const approvedClaims = claims.filter(c => c.status === 'approved');
        const paidClaims = claims.filter(c => c.status === 'paid');

        const totalCoverage = policies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
        const totalClaims = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
        const totalApproved = approvedClaims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
        const totalPaid = paidClaims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);

        return [
            { Metric: 'Total Policies', Value: policies.length },
            { Metric: 'Active Policies', Value: activePolicies.length },
            { Metric: 'Total Claims', Value: claims.length },
            { Metric: 'Pending Claims', Value: pendingClaims.length },
            { Metric: 'Approved Claims', Value: approvedClaims.length },
            { Metric: 'Paid Claims', Value: paidClaims.length },
            { Metric: 'Total Family Members', Value: familyMembers.length },
            { Metric: 'Total Coverage Amount', Value: totalCoverage },
            { Metric: 'Total Claims Amount', Value: totalClaims },
            { Metric: 'Total Approved Amount', Value: totalApproved },
            { Metric: 'Total Paid Amount', Value: totalPaid },
            { Metric: 'Claims Approval Rate', Value: claims.length > 0 ? `${((approvedClaims.length / claims.length) * 100).toFixed(2)}%` : '0%' }
        ];
    }

    /**
     * Clean up old report files
     * @param {number} maxAgeHours - Maximum age in hours
     */
    async cleanupOldReports(maxAgeHours = 24) {
        try {
            const files = fs.readdirSync(this.reportsDir);
            const now = Date.now();
            const maxAge = maxAgeHours * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(this.reportsDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    logger.info('Old report file cleaned up', { file });
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old reports', { error: error.message });
        }
    }
}

export default new InsuranceReportService();