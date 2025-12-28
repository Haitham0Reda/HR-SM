import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem,
    Card,
    CardContent,
    CardActions,
    Grid,
    CircularProgress,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import holidayService from '../../services/holiday.service';

const HolidaysPage = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    const { showNotification } = useNotification();
    const [holidaySettings, setHolidaySettings] = useState(null);
    const [egyptHolidays, setEgyptHolidays] = useState([]);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importYear, setImportYear] = useState(new Date().getFullYear().toString());
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchHolidays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const response = await holidayService.getSettings();
            // API interceptor already extracts response.data
            const settings = response.settings || response;
            setHolidaySettings(settings);
            setHolidays(settings.officialHolidays || []);
        } catch (error) {
            showNotification('Failed to fetch holidays', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (holiday = null) => {
        if (holiday) {
            setSelectedHoliday(holiday);
            setFormData({
                name: holiday.name || '',
                date: holiday.date ? new Date(holiday.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: holiday.description || ''
            });
        } else {
            setSelectedHoliday(null);
            setFormData({
                name: '',
                date: new Date().toISOString().split('T')[0],
                description: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedHoliday(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            // Format data for the API
            const holidayData = {
                dates: formData.date,
                name: formData.name,
                description: formData.description
            };
            
            await holidayService.addHolidays(holidayData);
            showNotification('Holiday created successfully', 'success');
            handleCloseDialog();
            fetchHolidays();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await holidayService.removeHoliday(selectedHoliday._id);
            showNotification('Holiday deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedHoliday(null);
            fetchHolidays();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleImportDialogOpen = () => {
        setShowImportDialog(true);
    };

    const handleImportDialogClose = () => {
        setShowImportDialog(false);
    };

    const handleImportYearChange = (e) => {
        setImportYear(e.target.value);
    };

    const handleFetchEgyptHolidays = async () => {
        try {
            const response = await holidayService.getEgyptHolidays({ year: importYear });
            setEgyptHolidays(response.holidays || []);
        } catch (error) {
            showNotification('Failed to fetch Egypt holidays: ' + error.message, 'error');
        }
    };

    const handleImportEgyptHolidays = async () => {
        try {
            setImporting(true);
            const response = await holidayService.importEgyptHolidays({ year: importYear });
            showNotification(response.message || 'Holidays imported successfully', 'success');
            handleImportDialogClose();
            fetchHolidays();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Import failed: ' + error.message, 'error');
        } finally {
            setImporting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return '-';
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Holidays Calendar</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleImportDialogOpen}
                        sx={{ mr: 2 }}
                    >
                        Import Egypt Holidays
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add Holiday
                    </Button>
                </Box>
            </Box>

            {holidays.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        No holidays found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Add your first holiday to get started or import official Egypt holidays
                    </Typography>
                </Box>
            ) : (
                <Grid 
                    container 
                    spacing={3}
                    sx={{
                        justifyContent: 'space-around',
                        alignItems: 'stretch'
                    }}
                >
                    {holidays.map((holiday) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} 
                            key={holiday._id}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center'
                            }}
                        >
                            <Card 
                                sx={{ 
                                    width: 280,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: 3,
                                    '&:hover': {
                                        boxShadow: 6,
                                    }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                            {holiday.name || '-'}
                                        </Typography>
                                        <Chip 
                                            label={holiday.isWeekend ? 'Weekend' : 'Regular'} 
                                            size="small" 
                                            color={holiday.isWeekend ? 'warning' : 'primary'} 
                                        />
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                            Date:
                                        </Typography>
                                        <Typography variant="body2">
                                            {formatDate(holiday.date)}
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                            Day:
                                        </Typography>
                                        <Typography variant="body2">
                                            {holiday.dayOfWeek || '-'}
                                        </Typography>
                                    </Box>
                                    
                                    {holiday.description && (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Description:
                                            </Typography>
                                            <Typography variant="body2" sx={{ 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical'
                                            }}>
                                                {holiday.description}
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                                
                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleOpenDialog(holiday)}
                                        color="primary"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => {
                                            setSelectedHoliday(holiday);
                                            setOpenConfirm(true);
                                        }}
                                        color="error"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Holiday Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            type="date"
                            label="Date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedHoliday ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showImportDialog} onClose={handleImportDialogClose} maxWidth="sm" fullWidth>
                <DialogTitle>Import Egypt Holidays</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Year</InputLabel>
                            <Select
                                value={importYear}
                                label="Year"
                                onChange={handleImportYearChange}
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2).map(year => (
                                    <MenuItem key={year} value={year.toString()}>
                                        {year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button 
                                variant="outlined" 
                                onClick={handleFetchEgyptHolidays}
                                disabled={importing}
                            >
                                Preview Holidays
                            </Button>
                        </Box>
                        
                        {egyptHolidays.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                    Found {egyptHolidays.length} holidays for {importYear}:
                                </Typography>
                                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                    {egyptHolidays.map((holiday, index) => (
                                        <Box key={index} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                                            <Typography variant="body2">
                                                {formatDate(holiday.date)} - {holiday.name}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleImportDialogClose}>Cancel</Button>
                    <Button 
                        onClick={handleImportEgyptHolidays} 
                        variant="contained"
                        disabled={importing}
                        startIcon={importing ? <CircularProgress size={20} /> : null}
                    >
                        {importing ? 'Importing...' : 'Import Holidays'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Holiday"
                message={`Are you sure you want to delete "${selectedHoliday?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedHoliday(null);
                }}
            />
        </Box>
    );
};

export default HolidaysPage;
