import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    MenuItem,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    InputAdornment,
    Switch,
    FormControlLabel,
    TablePagination,
    TableSortLabel,
    Tooltip,
    Divider,
} from '@mui/material';
import {
    BeachAccessOutlined as BeachIcon,
    Search as SearchIcon,
    Download as DownloadIcon,
    Info as InfoIcon,
    AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';
import Loading from '../../components/common/Loading';

const VacationManagementPage = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [balanceOverrides, setBalanceOverrides] = useState({});

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [autoSearch, setAutoSearch] = useState(true);

    // Pagination states
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting states
    const [orderBy, setOrderBy] = useState('employeeId');
    const [order, setOrder] = useState('asc');

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (autoSearch) {
            applyFilters();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, selectedDepartment, employees, autoSearch]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, deptData] = await Promise.all([
                userService.getAll(),
                departmentService.getAll()
            ]);

            // Debug: Log first employee to check data structure
            if (usersData.length > 0) {

            }

            setEmployees(usersData);
            setDepartments(deptData);
            setFilteredEmployees(usersData);
        } catch (error) {
            showNotification('Failed to fetch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateYearsOfService = (hireDate) => {
        if (!hireDate) return 0;
        const today = new Date();
        const hire = new Date(hireDate);
        const monthsOfService = (today - hire) / (1000 * 60 * 60 * 24 * 30);
        return monthsOfService / 12;
    };

    const getAnnualBalanceByPolicy = (yearsOfService) => {
        const monthsOfService = yearsOfService * 12;

        if (monthsOfService < 3) {
            return 0;
        } else if (monthsOfService < 6) {
            return 0;
        } else if (yearsOfService < 1) {
            return 8;
        } else if (yearsOfService < 10) {
            return 14;
        } else {
            return 23;
        }
    };

    const calculateVacationBalance = (employee) => {
        const yearsOfService = calculateYearsOfService(employee.employment?.hireDate);

        // Auto-calculate annual balance based on policy
        const annualBalance = getAnnualBalanceByPolicy(yearsOfService);
        const casualBalance = 7; // Fixed for all

        // Get used days from employee vacation data (if available)
        const annualUsed = employee.vacationBalance?.annualUsed || 0;
        const casualUsed = employee.vacationBalance?.casualUsed || 0;
        const flexibleUsed = employee.vacationBalance?.flexibleUsed || 0;

        // Check for overrides (only for casual and flexible, annual is auto-calculated)
        const override = balanceOverrides[employee._id] || {};
        const finalCasualTotal = override.casualTotal !== undefined ? override.casualTotal : casualBalance;
        const finalFlexibleTotal = override.flexibleTotal !== undefined ? override.flexibleTotal : 0;

        return {
            annual: {
                total: annualBalance, // Always auto-calculated from policy
                used: annualUsed,
                remaining: annualBalance - annualUsed
            },
            casual: {
                total: finalCasualTotal,
                used: casualUsed,
                remaining: finalCasualTotal - casualUsed
            },
            flexible: {
                total: finalFlexibleTotal,
                used: flexibleUsed,
                remaining: finalFlexibleTotal - flexibleUsed
            },
            yearsOfService: yearsOfService.toFixed(1)
        };
    };

    const handleBalanceChange = (employeeId, field, value) => {
        // Don't allow changing annualTotal as it's auto-calculated
        if (field === 'annualTotal') return;

        const numValue = parseInt(value) || 0;
        setBalanceOverrides(prev => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                [field]: numValue
            }
        }));
    };

    const handleSaveBalances = async () => {
        try {
            const updatedCount = Object.keys(balanceOverrides).length;
            if (updatedCount === 0) {
                showNotification('No changes to save', 'info');
                return;
            }

            setLoading(true);

            // Prepare updates array for bulk update (exclude annualTotal as it's auto-calculated)
            const updates = Object.entries(balanceOverrides).map(([userId, overrides]) => ({
                userId,
                casualTotal: overrides.casualTotal,
                flexibleTotal: overrides.flexibleTotal
            }));

            // Call bulk update API
            const response = await userService.bulkUpdateVacationBalances(updates);

            if (response.errors && response.errors.length > 0) {
                showNotification(
                    `Updated ${response.updated} balance(s), ${response.failed} failed`,
                    'warning'
                );
            } else {
                showNotification(
                    `Successfully updated vacation balances for ${response.updated} employee(s)`,
                    'success'
                );
            }

            // Clear overrides after successful save
            setBalanceOverrides({});

            // Refresh employee data to get updated values
            await fetchData();
        } catch (error) {

            showNotification('Failed to save vacation balances', 'error');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...employees];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(emp =>
                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.personalInfo?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.department?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Department filter
        if (selectedDepartment) {
            filtered = filtered.filter(emp =>
                emp.department?._id === selectedDepartment
            );
        }

        setFilteredEmployees(filtered);
        setPage(0); // Reset to first page
    };

    const handleSearch = () => {
        if (!autoSearch) {
            applyFilters();
        }
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedEmployees = React.useMemo(() => {
        const comparator = (a, b) => {
            let aValue, bValue;

            switch (orderBy) {
                case 'employeeId':
                    aValue = a.employeeId || '';
                    bValue = b.employeeId || '';
                    break;
                case 'fullName':
                    aValue = a.personalInfo?.fullName || '';
                    bValue = b.personalInfo?.fullName || '';
                    break;
                case 'department':
                    aValue = a.department?.name || '';
                    bValue = b.department?.name || '';
                    break;
                default:
                    return 0;
            }

            if (bValue < aValue) return order === 'asc' ? 1 : -1;
            if (bValue > aValue) return order === 'asc' ? -1 : 1;
            return 0;
        };

        return [...filteredEmployees].sort(comparator);
    }, [filteredEmployees, order, orderBy]);

    const paginatedEmployees = sortedEmployees.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const handleExportCSV = () => {
        const headers = ['Employee ID', 'Full Name', 'Department', 'Years of Service', 'Annual Total', 'Annual Used', 'Annual Remaining', 'Casual Total', 'Casual Used', 'Casual Remaining', 'Flexible Total', 'Flexible Used', 'Flexible Remaining'];
        const rows = filteredEmployees.map(emp => {
            const balance = calculateVacationBalance(emp);
            return [
                emp.employeeId || '',
                emp.personalInfo?.fullName || '',
                emp.department?.name || '',
                balance.yearsOfService,
                balance.annual.total,
                balance.annual.used,
                balance.annual.remaining,
                balance.casual.total,
                balance.casual.used,
                balance.casual.remaining,
                balance.flexible.total,
                balance.flexible.used,
                balance.flexible.remaining
            ];
        });

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vacation-balances-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification('CSV exported successfully', 'success');
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <BeachIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Vacation Management
                </Typography>
            </Box>

            {/* Vacation Policy Section */}
            <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <InfoIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Vacation Policy
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '250px' }}>
                            <Card sx={{ bgcolor: 'info.light', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="info.dark" sx={{ fontWeight: 600, mb: 1 }}>
                                        3-5 Months Service
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="0 Annual" size="small" color="default" />
                                        <Chip label="7 Casual" size="small" color="info" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                        <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '250px' }}>
                            <Card sx={{ bgcolor: 'warning.light', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="warning.dark" sx={{ fontWeight: 600, mb: 1 }}>
                                        6+ Months Service
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="8 Annual" size="small" color="warning" />
                                        <Chip label="7 Casual" size="small" color="info" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                        <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '250px' }}>
                            <Card sx={{ bgcolor: 'success.light', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="success.dark" sx={{ fontWeight: 600, mb: 1 }}>
                                        1+ Years Service
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="14 Annual" size="small" color="success" />
                                        <Chip label="7 Casual" size="small" color="info" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                        <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '250px' }}>
                            <Card sx={{ bgcolor: 'primary.light', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="primary.dark" sx={{ fontWeight: 600, mb: 1 }}>
                                        10+ Years Service
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="23 Annual" size="small" color="primary" />
                                        <Chip label="7 Casual" size="small" color="info" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                <strong>Flexible Hours:</strong> 8 hours = 1 day of vacation
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Filters Section */}
            <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                            <TextField
                                fullWidth
                                placeholder="Search by name, ID, or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
                            <TextField
                                select
                                fullWidth
                                label="Department"
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                            >
                                <MenuItem value="">All Departments</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box sx={{ flex: '0 1 150px', minWidth: '120px' }}>
                            <TextField
                                select
                                fullWidth
                                label="Entries per page"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value));
                                    setPage(0);
                                }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                                <MenuItem value={100}>100</MenuItem>
                            </TextField>
                        </Box>
                        <Box sx={{ flex: '0 1 auto' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoSearch}
                                            onChange={(e) => setAutoSearch(e.target.checked)}
                                        />
                                    }
                                    label="Auto-search"
                                />
                                {!autoSearch && (
                                    <Button variant="contained" onClick={handleSearch}>
                                        Search
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Table Section */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Employee Vacation Balances ({filteredEmployees.length})
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {Object.keys(balanceOverrides).length > 0 && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSaveBalances}
                                >
                                    Save Changes ({Object.keys(balanceOverrides).length})
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExportCSV}
                            >
                                Export CSV
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'employeeId'}
                                            direction={orderBy === 'employeeId' ? order : 'asc'}
                                            onClick={() => handleSort('employeeId')}
                                        >
                                            Employee ID
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'fullName'}
                                            direction={orderBy === 'fullName' ? order : 'asc'}
                                            onClick={() => handleSort('fullName')}
                                        >
                                            Full Name
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'department'}
                                            direction={orderBy === 'department' ? order : 'asc'}
                                            onClick={() => handleSort('department')}
                                        >
                                            Department
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center">Years of Service</TableCell>
                                    <TableCell align="center">Annual Balance (Auto)</TableCell>
                                    <TableCell align="center">Used Annual</TableCell>
                                    <TableCell align="center">Remaining Annual</TableCell>
                                    <TableCell align="center">Casual Balance</TableCell>
                                    <TableCell align="center">Used Casual</TableCell>
                                    <TableCell align="center">Remaining Casual</TableCell>
                                    <TableCell align="center">Flexible Hours Balance</TableCell>
                                    <TableCell align="center">Used Flexible</TableCell>
                                    <TableCell align="center">Remaining Flexible</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedEmployees.map((employee) => {
                                    const balance = calculateVacationBalance(employee);
                                    return (
                                        <TableRow
                                            key={employee._id}
                                            hover
                                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                        >
                                            <TableCell>{employee.employeeId || 'N/A'}</TableCell>
                                            <TableCell>{employee.personalInfo?.fullName || employee.username}</TableCell>
                                            <TableCell>{employee.department?.name || 'N/A'}</TableCell>

                                            {/* Years of Service */}
                                            <TableCell align="center">
                                                <Tooltip title={`Hire Date: ${employee.employment?.hireDate ? new Date(employee.employment.hireDate).toLocaleDateString() : 'N/A'}`}>
                                                    <Chip
                                                        label={`${balance.yearsOfService} years`}
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            </TableCell>

                                            {/* Annual Balance - Auto-calculated (Read-only) */}
                                            <TableCell align="center">
                                                <Tooltip title="Auto-calculated based on years of service">
                                                    <Box sx={{
                                                        display: 'inline-block',
                                                        px: 1.5,
                                                        py: 0.5,
                                                        bgcolor: 'primary.light',
                                                        color: 'primary.dark',
                                                        borderRadius: 1,
                                                        fontWeight: 600
                                                    }}>
                                                        {balance.annual.total}
                                                    </Box>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2">{balance.annual.used}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={balance.annual.remaining}
                                                    size="small"
                                                    color={balance.annual.remaining > 0 ? 'success' : 'default'}
                                                />
                                            </TableCell>

                                            {/* Casual Balance - Editable */}
                                            <TableCell align="center">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={balance.casual.total}
                                                    onChange={(e) => handleBalanceChange(employee._id, 'casualTotal', e.target.value)}
                                                    sx={{ width: 70 }}
                                                    inputProps={{ min: 0, style: { textAlign: 'center' } }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2">{balance.casual.used}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={balance.casual.remaining}
                                                    size="small"
                                                    color={balance.casual.remaining > 0 ? 'success' : 'default'}
                                                />
                                            </TableCell>

                                            {/* Flexible Hours - Editable */}
                                            <TableCell align="center">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={balance.flexible.total}
                                                    onChange={(e) => handleBalanceChange(employee._id, 'flexibleTotal', e.target.value)}
                                                    sx={{ width: 70 }}
                                                    inputProps={{ min: 0, style: { textAlign: 'center' } }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2">{balance.flexible.used}h</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2">{balance.flexible.remaining}h</Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {paginatedEmployees.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No employees found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={filteredEmployees.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </CardContent>
            </Card>
        </Box>
    );
};

export default VacationManagementPage;
