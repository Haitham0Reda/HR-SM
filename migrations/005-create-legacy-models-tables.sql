-- Migration: Create tables for legacy models (Department, Position, Task, TaskReport, AuditLog)
-- Date: 2026-04-06
-- Description: Creates PostgreSQL tables for the 5 models converted from Mongoose to Sequelize

-- ============================================================================
-- 1. DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    manager_id UUID,
    parent_department_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique Constraints
    CONSTRAINT uk_departments_code_tenant UNIQUE (code, tenant_id)
);

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- Comment
COMMENT ON TABLE departments IS 'Organizational departments with hierarchical structure';

-- ============================================================================
-- 2. POSITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    department_id UUID,
    level VARCHAR(20) NOT NULL DEFAULT 'entry' CHECK (level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_positions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_positions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique Constraints
    CONSTRAINT uk_positions_code_tenant UNIQUE (code, tenant_id)
);

-- Indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_tenant_id ON positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

-- Comment
COMMENT ON TABLE positions IS 'Job positions within the organization';

-- ============================================================================
-- 3. TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected')),
    assigned_to_id UUID NOT NULL,
    assigned_by_id UUID NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_tasks_due_date_after_start CHECK (due_date > start_date)
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status_tenant ON tasks(assigned_to_id, status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by_tenant ON tasks(assigned_by_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status_tenant ON tasks(due_date, status, tenant_id);

-- Comment
COMMENT ON TABLE tasks IS 'Tasks assigned to users with priority and status tracking';

-- ============================================================================
-- 4. TASK_REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    task_id UUID NOT NULL,
    submitted_by_id UUID NOT NULL,
    report_text TEXT NOT NULL,
    time_spent JSONB DEFAULT '{"hours": 0, "minutes": 0}'::jsonb,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_comments TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_task_reports_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_reports_submitted_by FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_reports_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_reports_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_reports_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_task_reports_text_length CHECK (char_length(report_text) >= 50)
);

-- Indexes for task_reports
CREATE INDEX IF NOT EXISTS idx_task_reports_tenant_id ON task_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_task_version_tenant ON task_reports(task_id, version, tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_submitted_by_status_tenant ON task_reports(submitted_by_id, status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_submitted_at_tenant ON task_reports(submitted_at, tenant_id);

-- Comment
COMMENT ON TABLE task_reports IS 'Reports submitted for tasks with versioning support';

-- ============================================================================
-- 5. AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import',
        'license_create', 'license_validate', 'license_renew', 'license_revoke',
        'license_activate', 'license_check', 'license_expire', 'license_update',
        'system_alert', 'system_health_check', 'backup_create', 'backup_restore',
        'module_enable', 'module_disable', 'tenant_create', 'tenant_suspend',
        'tenant_reactivate', 'security_event', 'performance_alert'
    )),
    resource VARCHAR(255) NOT NULL,
    resource_id UUID,
    user_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    module VARCHAR(100),
    category VARCHAR(50) NOT NULL DEFAULT 'data_modification' CHECK (category IN (
        'authentication', 'authorization', 'data_modification', 'system_operation',
        'license_management', 'tenant_management', 'security', 'performance',
        'backup_recovery', 'module_management', 'audit', 'compliance'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning', 'info')),
    error_message TEXT,
    error_code VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    license_info JSONB,
    system_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    performance JSONB,
    retention_policy VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'extended', 'permanent')),
    compliance_flags JSONB NOT NULL DEFAULT '{"gdpr": false, "sox": false, "hipaa": false}'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    correlation_id VARCHAR(100),
    parent_event_id UUID,
    hash VARCHAR(64),
    signature TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_parent_event FOREIGN KEY (parent_event_id) REFERENCES audit_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_resource_id ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_severity ON audit_logs(category, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_severity ON audit_logs(status, severity);

-- JSONB indexes for license info queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_info_license_number ON audit_logs((license_info->>'licenseNumber'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_info_tenant_id ON audit_logs((license_info->>'tenantId'));

-- Comment
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for system activities with integrity verification';

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your environment)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON positions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON task_reports TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO your_app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created:
--   1. departments (organizational structure)
--   2. positions (job positions)
--   3. tasks (task management)
--   4. task_reports (task completion reports)
--   5. audit_logs (comprehensive audit trail)
--
-- All tables include:
--   - UUID primary keys
--   - tenant_id for multi-tenancy
--   - Proper foreign key constraints
--   - Performance indexes
--   - Audit fields (created_by, updated_by, created_at, updated_at)
--   - JSONB fields for complex data structures
