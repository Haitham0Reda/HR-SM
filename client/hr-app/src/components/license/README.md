# License Components

This directory contains components for displaying locked features and upgrade prompts in the HRMS application.

## Components

### LockedFeature

An overlay component that displays when a user attempts to access a feature that is not included in their current license.

**Usage:**

```jsx
import { LockedFeature } from "../components/license";

<LockedFeature
  moduleKey="attendance"
  featureName="Biometric Device Integration"
  description="Connect and manage biometric attendance devices for automated time tracking"
  startingPrice={8}
  onUpgradeClick={() => console.log("Upgrade clicked")}
/>;
```

**Props:**

- `moduleKey` (string, required): Module key for routing to pricing page
- `featureName` (string, required): Name of the locked feature
- `description` (string): Description of the feature
- `startingPrice` (number): Starting price for the feature
- `onUpgradeClick` (function): Custom upgrade click handler
- `sx` (object): Custom styles

### LockedPage

A full-page component that displays when a user navigates to a page for a module that is not included in their license.

**Usage:**

```jsx
import { LockedPage } from "../components/license";

<LockedPage
  moduleKey="payroll"
  moduleName="Payroll Management"
  description="Automate payroll processing, tax calculations, and salary disbursements"
  features={[
    "Automated salary calculations",
    "Tax compliance and reporting",
    "Direct deposit integration",
    "Payslip generation",
  ]}
  startingPrice={12}
  onUpgradeClick={() => console.log("Upgrade clicked")}
/>;
```

**Props:**

- `moduleKey` (string, required): Module key for routing to pricing page
- `moduleName` (string, required): Name of the locked module
- `description` (string): Description of the module
- `features` (array of strings): List of key features
- `startingPrice` (number): Starting price for the module
- `onUpgradeClick` (function): Custom upgrade click handler

### UpgradeModal

A modal dialog that displays when a user attempts to access a locked feature. Shows feature information and provides upgrade options.

**Usage:**

```jsx
import { UpgradeModal } from "../components/license";

const [modalOpen, setModalOpen] = useState(false);

<UpgradeModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  moduleKey="documents"
  featureName="Document Templates"
  description="Create and manage custom document templates for automated generation"
  currentTier="starter"
  requiredTier="business"
  pricingTiers={[
    {
      name: "Business",
      price: 8,
      features: [
        "All Starter features",
        "Custom templates",
        "Advanced reporting",
        "Priority support",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "All Business features",
        "Unlimited templates",
        "Dedicated support",
        "SLA guarantee",
      ],
    },
  ]}
  onUpgradeClick={(tier) => console.log("Upgrade to", tier)}
/>;
```

**Props:**

- `open` (boolean, required): Modal open state
- `onClose` (function, required): Close handler
- `moduleKey` (string, required): Module key for routing
- `featureName` (string, required): Name of the locked feature
- `description` (string): Description of the feature
- `currentTier` (string): Current pricing tier (default: 'starter')
- `requiredTier` (string): Required pricing tier for the feature (default: 'business')
- `pricingTiers` (array of objects): Array of pricing tier objects
- `onUpgradeClick` (function): Custom upgrade click handler

## Accessibility

All components meet WCAG 2.1 AA accessibility standards:

- Proper ARIA labels and roles
- Keyboard navigation support
- Sufficient color contrast (4.5:1 for normal text, 3:1 for large text)
- Focus indicators
- Screen reader friendly

## Theme Support

All components support both light and dark themes:

- Automatically adapt to the current theme mode
- Use theme-aware colors from the design tokens
- Maintain proper contrast in both modes

## Design Tokens

Components use the centralized design tokens for consistent styling:

- Spacing: `designTokens.spacing.*`
- Typography: `designTokens.typography.*`
- Colors: Theme palette colors
- Border Radius: `designTokens.borderRadius.*`
- Shadows: `designTokens.shadows.*`

## Integration with License Context

These components are designed to work with the License Context (to be implemented in task 11):

```jsx
import { useLicense } from "../contexts/LicenseContext";

const MyComponent = () => {
  const { isModuleEnabled, getModuleLicense } = useLicense();

  if (!isModuleEnabled("attendance")) {
    return (
      <LockedPage
        moduleKey="attendance"
        moduleName="Attendance & Time Tracking"
        description="Track employee attendance and working hours"
        startingPrice={5}
      />
    );
  }

  return <AttendanceContent />;
};
```

## Examples

### Inline Feature Lock

```jsx
// Lock a specific feature within a page
<Box>
  <Typography variant="h5">Advanced Features</Typography>
  {isFeatureEnabled("biometric-devices") ? (
    <BiometricDeviceSettings />
  ) : (
    <LockedFeature
      moduleKey="attendance"
      featureName="Biometric Device Integration"
      description="Connect biometric devices for automated attendance"
      startingPrice={8}
    />
  )}
</Box>
```

### Full Page Lock

```jsx
// Lock an entire page/module
const PayrollPage = () => {
  const { isModuleEnabled } = useLicense();

  if (!isModuleEnabled("payroll")) {
    return (
      <LockedPage
        moduleKey="payroll"
        moduleName="Payroll Management"
        description="Comprehensive payroll processing and management"
        features={[
          "Automated salary calculations",
          "Tax compliance",
          "Direct deposit",
          "Payslip generation",
        ]}
        startingPrice={12}
      />
    );
  }

  return <PayrollContent />;
};
```

### Modal Upgrade Prompt

```jsx
// Show modal when user clicks a locked feature
const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

const handleFeatureClick = () => {
  if (!isFeatureEnabled("custom-reports")) {
    setUpgradeModalOpen(true);
  } else {
    // Open feature
  }
};

<>
  <Button onClick={handleFeatureClick}>Custom Reports</Button>

  <UpgradeModal
    open={upgradeModalOpen}
    onClose={() => setUpgradeModalOpen(false)}
    moduleKey="reporting"
    featureName="Custom Reports"
    description="Create custom reports with advanced filtering"
    currentTier="starter"
    requiredTier="business"
  />
</>;
```

## Testing

Components should be tested for:

1. Rendering with all required props
2. Theme switching (light/dark)
3. Accessibility (ARIA labels, keyboard navigation)
4. Click handlers
5. Responsive layout
6. Color contrast

Example test:

```jsx
import { render, screen } from "@testing-library/react";
import { LockedFeature } from "./index";

test("renders locked feature with correct content", () => {
  render(
    <LockedFeature
      moduleKey="test"
      featureName="Test Feature"
      description="Test description"
      startingPrice={10}
    />
  );

  expect(screen.getByText("Test Feature")).toBeInTheDocument();
  expect(screen.getByText("Test description")).toBeInTheDocument();
  expect(screen.getByText(/\$10/)).toBeInTheDocument();
});
```

### UsageWarningBanner

A banner component that displays usage warnings when a module approaches or exceeds its limits. Supports warning (80-94%) and critical (95%+) severity levels.

**Usage:**

```jsx
import { UsageWarningBanner } from "../components/license";

<UsageWarningBanner
  moduleKey="attendance"
  moduleName="Attendance & Time Tracking"
  limitType="employees"
  usage={{
    current: 42,
    limit: 50,
    percentage: 84,
  }}
  dismissible={true}
  showUpgradeButton={true}
  onDismiss={() => console.log("Banner dismissed")}
/>;
```

**Props:**

- `moduleKey` (string, required): Module key for routing and identification
- `moduleName` (string): Display name of the module
- `limitType` (string, required): Type of limit being tracked ('employees', 'storage', 'apiCalls')
- `usage` (object): Usage data object with current, limit, and percentage
  - `current` (number, required): Current usage value
  - `limit` (number, required): Maximum allowed value
  - `percentage` (number, required): Usage percentage (0-100)
- `onDismiss` (function): Callback when banner is dismissed
- `dismissible` (boolean): Whether the banner can be dismissed (default: true)
- `showUpgradeButton` (boolean): Whether to show the upgrade button (default: true)
- `sx` (object): Custom styles

**Features:**

- Automatically determines severity based on percentage:
  - Warning (yellow): 80-94% usage
  - Critical (red): 95%+ usage
- Dismissible with localStorage persistence (24-hour expiration)
- Real-time usage updates (polls every 30 seconds)
- Formats values based on limit type:
  - Storage: Displays in GB
  - API Calls: Displays with locale formatting
  - Employees: Displays as plain number
- Progress bar visualization
- Upgrade button with navigation to pricing page
- WCAG 2.1 AA accessible with proper ARIA attributes

**Examples:**

```jsx
// Warning level (80-94%)
<UsageWarningBanner
  moduleKey="attendance"
  moduleName="Attendance & Time Tracking"
  limitType="employees"
  usage={{ current: 42, limit: 50, percentage: 84 }}
/>

// Critical level (95%+)
<UsageWarningBanner
  moduleKey="payroll"
  moduleName="Payroll Management"
  limitType="employees"
  usage={{ current: 190, limit: 200, percentage: 95 }}
  dismissible={false}
/>

// Storage limit
<UsageWarningBanner
  moduleKey="documents"
  moduleName="Document Management"
  limitType="storage"
  usage={{
    current: 8589934592, // 8 GB in bytes
    limit: 10737418240, // 10 GB in bytes
    percentage: 80,
  }}
/>

// API calls limit
<UsageWarningBanner
  moduleKey="reporting"
  moduleName="Advanced Reporting"
  limitType="apiCalls"
  usage={{ current: 8500, limit: 10000, percentage: 85 }}
/>

// Without upgrade button
<UsageWarningBanner
  moduleKey="leave"
  moduleName="Leave Management"
  limitType="employees"
  usage={{ current: 165, limit: 200, percentage: 82 }}
  showUpgradeButton={false}
/>
```

**Integration with License Context:**

The component can automatically fetch and update usage data from the License Context:

```jsx
import { useLicense } from "../contexts/LicenseContext";
import { UsageWarningBanner } from "../components/license";

const MyComponent = () => {
  const { getModuleUsage, isApproachingLimit } = useLicense();

  // Check if any limit is being approached
  if (isApproachingLimit("attendance", "employees")) {
    return (
      <UsageWarningBanner
        moduleKey="attendance"
        moduleName="Attendance & Time Tracking"
        limitType="employees"
        // Usage will be fetched automatically from context
      />
    );
  }

  return <AttendanceContent />;
};
```

**Real-time Updates:**

The component automatically polls for usage updates every 30 seconds when integrated with the License Context. This ensures users see current usage information without manual refresh.

**Dismissal Behavior:**

- When dismissed, the banner stores a flag in localStorage
- The dismissal expires after 24 hours
- Each banner has a unique dismissal key based on moduleKey and limitType
- Non-dismissible banners (dismissible={false}) cannot be closed by users
