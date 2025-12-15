import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    CheckCircle as CheckCircleIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import attendanceDeviceService from '../../services/attendanceDevice.service';
import PageContainer from '../../components/PageContainer';

const AttendanceImport = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const [activeStep, setActiveStep] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState(null);

    const steps = ['Select File', 'Preview Data', 'Import'];

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
            
            // Read and preview file
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        setError('File must contain at least a header row and one data row');
                        return;
                    }
                    
                    const headers = lines[0].split(',').map(h => h.trim());
                    const preview = lines.slice(1, 11).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        return row;
                    });
                    
                    setPreviewData(preview);
                    setActiveStep(1);
                } catch (err) {
                    setError('Failed to parse CSV file');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setError('Please select a file');
            return;
        }

        try {
            setImporting(true);
            setError(null);
            const response = await attendanceDeviceService.importCSV(selectedFile);
            setImportResult(response.data);
            setActiveStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to import CSV');
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setActiveStep(0);
        setSelectedFile(null);
        setPreviewData([]);
        setImportResult(null);
        setError(null);
    };

    return (
        <PageContainer title="Import Attendance">
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(getCompanyRoute('/attendance'))}
                        sx={{ 
                            minWidth: 'auto',
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3,
                            py: 1
                        }}
                    >
                        Back to Attendance
                    </Button>
                </Box>
                <Typography variant="h5" gutterBottom>
                    Import Attendance from CSV
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Upload a CSV file with attendance records. Required columns: employeeId, date, timestamp, type
                </Typography>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Step 1: File Selection */}
            {activeStep === 0 && (
                <Card>
                    <CardContent>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                py: 4
                            }}
                        >
                            <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                            <Typography variant="h6">Select CSV File</Typography>
                            <Button variant="contained" component="label">
                                Choose File
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    hidden
                                    onChange={handleFileSelect}
                                />
                            </Button>
                            {selectedFile && (
                                <Typography variant="body2" color="textSecondary">
                                    Selected: {selectedFile.name}
                                </Typography>
                            )}
                        </Box>

                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                CSV Format Example:
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography 
                                    variant="body2" 
                                    component="pre" 
                                    sx={{ 
                                        fontFamily: 'monospace',
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                >
                                    {`employeeId,date,timestamp,type
EMP001,2024-01-15,2024-01-15 09:00:00,checkin
EMP001,2024-01-15,2024-01-15 17:30:00,checkout
EMP002,2024-01-15,2024-01-15 08:55:00,checkin`}
                                </Typography>
                            </Paper>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Preview Data */}
            {activeStep === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Preview Data (First 10 rows)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {previewData.length > 0 &&
                                            Object.keys(previewData[0]).map((header) => (
                                                <TableCell key={header}>{header}</TableCell>
                                            ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row, index) => (
                                        <TableRow key={index}>
                                            {Object.values(row).map((value, i) => (
                                                <TableCell key={i}>{value}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {importing && <LinearProgress sx={{ mb: 2 }} />}

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button onClick={handleReset}>Cancel</Button>
                            <Button
                                variant="contained"
                                onClick={handleImport}
                                disabled={importing}
                            >
                                {importing ? 'Importing...' : 'Import Data'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Import Results */}
            {activeStep === 2 && importResult && (
                <Card>
                    <CardContent>
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom>
                                Import Completed
                            </Typography>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 4 }}>
                                <Box>
                                    <Typography variant="h4" color="success.main">
                                        {importResult.processed}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Records Processed
                                    </Typography>
                                </Box>
                                {importResult.errors > 0 && (
                                    <Box>
                                        <Typography variant="h4" color="error.main">
                                            {importResult.errors}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Errors
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {importResult.errors > 0 && importResult.details?.errors && (
                                <Box sx={{ mt: 3 }}>
                                    <Alert severity="warning">
                                        <Typography variant="subtitle2" gutterBottom>
                                            Some records failed to import:
                                        </Typography>
                                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                            {importResult.details.errors.slice(0, 10).map((err, index) => (
                                                <Typography key={index} variant="body2">
                                                    • {err.error}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Alert>
                                </Box>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleReset}
                                sx={{ mt: 3 }}
                            >
                                Import Another File
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}
        </PageContainer>
    );
};

export default AttendanceImport;
