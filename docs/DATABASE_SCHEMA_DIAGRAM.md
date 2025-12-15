# HRMS - Database Schema & Relationships Diagram

## 🗄️ Complete Database Architecture

```mermaid
erDiagram
    %% Core Entities
    TENANT {
        ObjectId _id PK
        string name
        string subdomain
        string plan
        object settings
        boolean active
        Date createdAt
        Date updatedAt
    }
    
    USER {
        ObjectId _id PK
        ObjectId tenant_id FK
        string email
        string password
        string firstName
        string lastName
        string role
        ObjectId department_id FK
        ObjectId position_id FK
        boolean active
        Date createdAt
        Date updatedAt
    }
    
    DEPARTMENT {
        ObjectId _id PK
        ObjectId tenant_id FK
        string name
        string description
        ObjectId manager_id FK
        boolean active
        Date createdAt
        Date updatedAt
    }
    
    POSITION {
        ObjectId _id PK
        ObjectId tenant_id FK
        string title
        string description
        ObjectId department_id FK
        number salary_min
        number salary_max
        Date createdAt
        Date updatedAt
    }
    
    %% HR Core Module
    ATTENDANCE {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        Date check_in
        Date check_out
        string status
        string notes
        object location
        Date createdAt
        Date updatedAt
    }
    
    VACATION {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        Date start_date
        Date end_date
        string type
        string status
        string reason
        ObjectId approved_by FK
        Date approved_at
        Date createdAt
        Date updatedAt
    }
    
    HOLIDAY {
        ObjectId _id PK
        ObjectId tenant_id FK
        string name
        Date date
        string type
        boolean recurring
        string description
        Date createdAt
        Date updatedAt
    }
    
    MISSION {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        string title
        string description
        Date start_date
        Date end_date
        string location
        string status
        ObjectId approved_by FK
        Date createdAt
        Date updatedAt
    }
    
    OVERTIME {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        Date date
        number hours
        string reason
        string status
        ObjectId approved_by FK
        number rate_multiplier
        Date createdAt
        Date updatedAt
    }
    
    PERMISSION_REQUEST {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        string type
        Date start_time
        Date end_time
        string reason
        string status
        ObjectId approved_by FK
        Date approved_at
        Date createdAt
        Date updatedAt
    }
    
    %% Tasks Module
    TASK {
        ObjectId _id PK
        ObjectId tenant_id FK
        string title
        string description
        ObjectId assigned_to FK
        ObjectId created_by FK
        string priority
        string status
        Date due_date
        array tags
        Date createdAt
        Date updatedAt
    }
    
    TASK_REPORT {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId task_id FK
        ObjectId user_id FK
        string description
        array attachments
        number hours_worked
        string status
        ObjectId reviewed_by FK
        string review_comments
        Date submitted_at
        Date reviewed_at
        Date createdAt
        Date updatedAt
    }
    
    %% Payroll Module
    PAYROLL {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        number basic_salary
        number allowances
        number deductions
        number overtime_pay
        number gross_pay
        number tax_deduction
        number net_pay
        Date pay_period_start
        Date pay_period_end
        string status
        Date processed_at
        Date createdAt
        Date updatedAt
    }
    
    PAYSLIP {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId payroll_id FK
        ObjectId user_id FK
        string payslip_number
        object breakdown
        string file_path
        Date generated_at
        Date createdAt
        Date updatedAt
    }
    
    %% Clinic Module
    MEDICAL_RECORD {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        string record_type
        string diagnosis
        string treatment
        string medications
        ObjectId doctor_id FK
        Date visit_date
        array attachments
        Date createdAt
        Date updatedAt
    }
    
    APPOINTMENT {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        ObjectId doctor_id FK
        Date appointment_date
        string appointment_time
        string type
        string status
        string notes
        Date createdAt
        Date updatedAt
    }
    
    %% Documents Module
    DOCUMENT {
        ObjectId _id PK
        ObjectId tenant_id FK
        string name
        string type
        string file_path
        number file_size
        string mime_type
        ObjectId uploaded_by FK
        array tags
        object permissions
        Date createdAt
        Date updatedAt
    }
    
    DOCUMENT_TEMPLATE {
        ObjectId _id PK
        ObjectId tenant_id FK
        string name
        string type
        string template_path
        object variables
        boolean active
        ObjectId created_by FK
        Date createdAt
        Date updatedAt
    }
    
    %% Surveys Module
    SURVEY {
        ObjectId _id PK
        ObjectId tenant_id FK
        string title
        string description
        array questions
        Date start_date
        Date end_date
        boolean anonymous
        string status
        ObjectId created_by FK
        Date createdAt
        Date updatedAt
    }
    
    SURVEY_RESPONSE {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId survey_id FK
        ObjectId user_id FK
        object answers
        Date submitted_at
        Date createdAt
        Date updatedAt
    }
    
    %% Events Module
    EVENT {
        ObjectId _id PK
        ObjectId tenant_id FK
        string title
        string description
        Date start_date
        Date end_date
        string location
        string type
        array attendees
        ObjectId created_by FK
        Date createdAt
        Date updatedAt
    }
    
    %% Notifications Module
    NOTIFICATION {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        string title
        string message
        string type
        boolean read
        object data
        Date read_at
        Date createdAt
        Date updatedAt
    }
    
    %% Announcements Module
    ANNOUNCEMENT {
        ObjectId _id PK
        ObjectId tenant_id FK
        string title
        string content
        string type
        array target_roles
        array target_departments
        boolean active
        Date publish_date
        Date expire_date
        ObjectId created_by FK
        Date createdAt
        Date updatedAt
    }
    
    %% Platform Management
    SUBSCRIPTION {
        ObjectId _id PK
        ObjectId tenant_id FK
        string plan_name
        array enabled_modules
        Date start_date
        Date end_date
        string status
        object billing_info
        Date createdAt
        Date updatedAt
    }
    
    MODULE_ACCESS {
        ObjectId _id PK
        ObjectId tenant_id FK
        string module_name
        boolean enabled
        object configuration
        Date enabled_at
        Date disabled_at
        Date createdAt
        Date updatedAt
    }
    
    AUDIT_LOG {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId user_id FK
        string action
        string resource
        ObjectId resource_id
        object old_values
        object new_values
        string ip_address
        string user_agent
        Date createdAt
    }
    
    %% Relationships
    TENANT ||--o{ USER : "has many"
    TENANT ||--o{ DEPARTMENT : "has many"
    TENANT ||--o{ POSITION : "has many"
    TENANT ||--o{ ATTENDANCE : "has many"
    TENANT ||--o{ VACATION : "has many"
    TENANT ||--o{ HOLIDAY : "has many"
    TENANT ||--o{ MISSION : "has many"
    TENANT ||--o{ OVERTIME : "has many"
    TENANT ||--o{ PERMISSION_REQUEST : "has many"
    TENANT ||--o{ TASK : "has many"
    TENANT ||--o{ TASK_REPORT : "has many"
    TENANT ||--o{ PAYROLL : "has many"
    TENANT ||--o{ PAYSLIP : "has many"
    TENANT ||--o{ MEDICAL_RECORD : "has many"
    TENANT ||--o{ APPOINTMENT : "has many"
    TENANT ||--o{ DOCUMENT : "has many"
    TENANT ||--o{ DOCUMENT_TEMPLATE : "has many"
    TENANT ||--o{ SURVEY : "has many"
    TENANT ||--o{ SURVEY_RESPONSE : "has many"
    TENANT ||--o{ EVENT : "has many"
    TENANT ||--o{ NOTIFICATION : "has many"
    TENANT ||--o{ ANNOUNCEMENT : "has many"
    TENANT ||--o{ SUBSCRIPTION : "has one"
    TENANT ||--o{ MODULE_ACCESS : "has many"
    TENANT ||--o{ AUDIT_LOG : "has many"
    
    USER ||--o{ ATTENDANCE : "records"
    USER ||--o{ VACATION : "requests"
    USER ||--o{ MISSION : "assigned to"
    USER ||--o{ OVERTIME : "works"
    USER ||--o{ PERMISSION_REQUEST : "submits"
    USER ||--o{ TASK : "assigned"
    USER ||--o{ TASK_REPORT : "submits"
    USER ||--o{ PAYROLL : "receives"
    USER ||--o{ PAYSLIP : "gets"
    USER ||--o{ MEDICAL_RECORD : "has"
    USER ||--o{ APPOINTMENT : "books"
    USER ||--o{ SURVEY_RESPONSE : "submits"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "generates"
    
    DEPARTMENT ||--o{ USER : "employs"
    DEPARTMENT ||--o{ POSITION : "contains"
    
    POSITION ||--o{ USER : "assigned to"
    
    TASK ||--o{ TASK_REPORT : "has reports"
    
    PAYROLL ||--o{ PAYSLIP : "generates"
    
    SURVEY ||--o{ SURVEY_RESPONSE : "receives"
    
    USER ||--o{ DEPARTMENT : "manages"
    USER ||--o{ VACATION : "approves"
    USER ||--o{ MISSION : "approves"
    USER ||--o{ OVERTIME : "approves"
    USER ||--o{ PERMISSION_REQUEST : "approves"
    USER ||--o{ TASK_REPORT : "reviews"
```

## 🔍 Database Indexes Strategy

```mermaid
graph TB
    subgraph "📊 Index Strategy by Collection"
        subgraph "🔍 Core Indexes"
            TENANT_IDX[tenant_id + createdAt<br/>Compound Index]
            USER_IDX[tenant_id + email<br/>Unique Compound]
            DEPT_IDX[tenant_id + name<br/>Compound Index]
        end
        
        subgraph "⏰ Time-based Indexes"
            ATTENDANCE_IDX[tenant_id + user_id + date<br/>Compound Index]
            VACATION_IDX[tenant_id + start_date + end_date<br/>Compound Index]
            PAYROLL_IDX[tenant_id + pay_period_start<br/>Compound Index]
        end
        
        subgraph "🔎 Search Indexes"
            TASK_IDX[tenant_id + status + priority<br/>Compound Index]
            DOC_IDX[tenant_id + tags + type<br/>Compound Index]
            AUDIT_IDX[tenant_id + action + createdAt<br/>Compound Index]
        end
        
        subgraph "🚀 Performance Indexes"
            NOTIFICATION_IDX[tenant_id + user_id + read<br/>Compound Index]
            EVENT_IDX[tenant_id + start_date + type<br/>Compound Index]
            SURVEY_IDX[tenant_id + status + end_date<br/>Compound Index]
        end
    end
    
    classDef coreClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef timeClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef searchClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef perfClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class TENANT_IDX,USER_IDX,DEPT_IDX coreClass
    class ATTENDANCE_IDX,VACATION_IDX,PAYROLL_IDX timeClass
    class TASK_IDX,DOC_IDX,AUDIT_IDX searchClass
    class NOTIFICATION_IDX,EVENT_IDX,SURVEY_IDX perfClass
```

## 📈 Data Volume Estimates

| Collection | Small Tenant | Medium Tenant | Large Tenant | Enterprise |
|------------|--------------|---------------|--------------|------------|
| **Users** | 10-50 | 50-500 | 500-5K | 5K+ |
| **Attendance** | 500/month | 5K/month | 50K/month | 500K+/month |
| **Tasks** | 100/month | 1K/month | 10K/month | 100K+/month |
| **Documents** | 50/month | 500/month | 5K/month | 50K+/month |
| **Notifications** | 1K/month | 10K/month | 100K/month | 1M+/month |
| **Audit Logs** | 5K/month | 50K/month | 500K/month | 5M+/month |

## 🔒 Data Security & Isolation

```mermaid
graph TB
    subgraph "🛡️ Multi-Tenant Data Isolation"
        subgraph "🔐 Tenant Scoping"
            TENANT_FILTER[Automatic tenant_id filtering<br/>in all queries]
            MIDDLEWARE_SCOPE[Middleware enforces<br/>tenant context]
            QUERY_VALIDATION[Query validation prevents<br/>cross-tenant access]
        end
        
        subgraph "🔒 Data Encryption"
            FIELD_ENCRYPTION[Sensitive field encryption<br/>passwords, SSN, etc.]
            FILE_ENCRYPTION[File encryption for<br/>documents and attachments]
            BACKUP_ENCRYPTION[Encrypted backups<br/>with rotation keys]
        end
        
        subgraph "📋 Audit & Compliance"
            AUDIT_TRAIL[Complete audit trail<br/>for all data changes]
            GDPR_COMPLIANCE[GDPR compliance<br/>data export/deletion]
            RETENTION_POLICY[Data retention policies<br/>automatic cleanup]
        end
    end
    
    TENANT_FILTER --> MIDDLEWARE_SCOPE
    MIDDLEWARE_SCOPE --> QUERY_VALIDATION
    FIELD_ENCRYPTION --> FILE_ENCRYPTION
    FILE_ENCRYPTION --> BACKUP_ENCRYPTION
    AUDIT_TRAIL --> GDPR_COMPLIANCE
    GDPR_COMPLIANCE --> RETENTION_POLICY
    
    classDef securityClass fill:#ffebee,stroke:#c62828,stroke-width:2px
    class TENANT_FILTER,MIDDLEWARE_SCOPE,QUERY_VALIDATION,FIELD_ENCRYPTION,FILE_ENCRYPTION,BACKUP_ENCRYPTION,AUDIT_TRAIL,GDPR_COMPLIANCE,RETENTION_POLICY securityClass
```

## 🚀 Database Performance Optimization

### Query Optimization Patterns

1. **Tenant-First Queries**: Always include `tenant_id` as the first field in compound indexes
2. **Time-Range Queries**: Use compound indexes with date fields for time-based filtering
3. **Status Filtering**: Include status fields in indexes for workflow-based queries
4. **Aggregation Pipelines**: Use MongoDB aggregation for complex reporting queries

### Scaling Strategy

1. **Horizontal Scaling**: MongoDB sharding by `tenant_id` for large deployments
2. **Read Replicas**: Separate read replicas for reporting and analytics
3. **Caching Layer**: Redis caching for frequently accessed data
4. **Archive Strategy**: Move old data to separate collections or cold storage

This database design ensures optimal performance, security, and scalability for the multi-tenant HRMS platform.