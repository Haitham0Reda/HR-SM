import React, { useState } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Devices as DevicesIcon,
    CloudUpload as CloudUploadIcon,
    Person as PersonIcon,
    Group as GroupIcon,
} from '@mui/icons-material';
import AttendanceDashboard from './AttendanceDashboard';
import DeviceManagement from './DeviceManagement';
import AttendanceImport from './AttendanceImport';
import AttendancePage from './AttendancePage';
import { useAuth } from '../../contexts/AuthContext';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`attendance-tabpanel-${index}`}
            aria-labelledby={`attendance-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const AttendanceManagementPage = () => {
    const { isHR, isAdmin } = useAuth();
    const canManage = isHR || isAdmin;
    const [mainTab, setMainTab] = useState(0);
    const [attendanceSubTab, setAttendanceSubTab] = useState(0);

    const handleMainTabChange = (event, newValue) => {
        setMainTab(newValue);
    };

    const handleAttendanceSubTabChange = (event, newValue) => {
        setAttendanceSubTab(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Attendance Management
            </Typography>
            
            <Box sx={{ width: '100%' }}>
                {/* Main Tabs */}
                <Paper sx={{ mb: 2 }}>
                    <Tabs
                        value={mainTab}
                        onChange={handleMainTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                            },
                        }}
                    >
                        <Tab
                            icon={<DashboardIcon />}
                            iconPosition="start"
                            label="Dashboard"
                        />
                        <Tab
                            icon={<PersonIcon />}
                            iconPosition="start"
                            label="Attendance Records"
                        />
                        <Tab
                            icon={<DevicesIcon />}
                            iconPosition="start"
                            label="Device Management"
                            sx={{ display: canManage ? 'flex' : 'none' }}
                        />
                        <Tab
                            icon={<CloudUploadIcon />}
                            iconPosition="start"
                            label="Import Attendance"
                            sx={{ display: canManage ? 'flex' : 'none' }}
                        />
                    </Tabs>
                </Paper>

                {/* Dashboard Tab */}
                <TabPanel value={mainTab} index={0}>
                    <AttendanceDashboard />
                </TabPanel>

                {/* Attendance Records Tab with Sub-tabs */}
                <TabPanel value={mainTab} index={1}>
                    <Paper sx={{ mb: 2 }}>
                        <Tabs
                            value={attendanceSubTab}
                            onChange={handleAttendanceSubTabChange}
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    minHeight: 48,
                                    textTransform: 'none',
                                },
                            }}
                        >
                            <Tab
                                icon={<PersonIcon fontSize="small" />}
                                iconPosition="start"
                                label="My Attendance"
                            />
                            <Tab
                                icon={<GroupIcon fontSize="small" />}
                                iconPosition="start"
                                label="All Users Attendance"
                                sx={{ display: canManage ? 'flex' : 'none' }}
                            />
                        </Tabs>
                    </Paper>

                    {/* My Attendance Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 0 ? 'block' : 'none' }}>
                        <AttendancePage viewMode="my" />
                    </Box>

                    {/* All Users Attendance Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 1 ? 'block' : 'none' }}>
                        {canManage ? <AttendancePage viewMode="all" /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                    </Box>
                </TabPanel>

                {/* Device Management Tab (HR/Admin only) */}
                <TabPanel value={mainTab} index={2}>
                    {canManage ? <DeviceManagement /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                </TabPanel>

                {/* Import Attendance Tab (HR/Admin only) */}
                <TabPanel value={mainTab} index={3}>
                    {canManage ? <AttendanceImport /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                </TabPanel>
            </Box>
        </Box>
    );
};

export default AttendanceManagementPage;
