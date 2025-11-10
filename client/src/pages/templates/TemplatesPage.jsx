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
    MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, FileCopy } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import templateService from '../../services/template.service';

const TemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'letter',
        content: '',
        variables: '',
        isActive: true
    });
    const { showNotification } = useNotification();

    const templateTypes = ['letter', 'certificate', 'contract', 'report', 'form', 'email', 'other'];

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateService.getAll();
            setTemplates(data);
        } catch (error) {
            showNotification('Failed to fetch templates', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (template = null) => {
        if (template) {
            setSelectedTemplate(template);
            setFormData({
                name: template.name || '',
                type: template.type || 'letter',
                content: template.content || '',
                variables: template.variables?.join(', ') || '',
                isActive: template.isActive !== false
            });
        } else {
            setSelectedTemplate(null);
            setFormData({
                name: '',
                type: 'letter',
                content: '',
                variables: '',
                isActive: true
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedTemplate(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                variables: formData.variables.split(',').map(v => v.trim()).filter(v => v)
            };

            if (selectedTemplate) {
                await templateService.update(selectedTemplate._id, submitData);
                showNotification('Template updated successfully', 'success');
            } else {
                await templateService.create(submitData);
                showNotification('Template created successfully', 'success');
            }
            handleCloseDialog();
            fetchTemplates();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await templateService.delete(selectedTemplate._id);
            showNotification('Template deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedTemplate(null);
            fetchTemplates();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleDuplicate = async (template) => {
        try {
            const duplicateData = {
                name: `${template.name} (Copy)`,
                type: template.type,
                content: template.content,
                variables: template.variables,
                isActive: true
            };
            await templateService.create(duplicateData);
            showNotification('Template duplicated successfully', 'success');
            fetchTemplates();
        } catch (error) {
            showNotification('Failed to duplicate template', 'error');
        }
    };

    const columns = [
        { field: 'name', headerName: 'Template Name', width: 250 },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        {
            field: 'variables',
            headerName: 'Variables',
            width: 200,
            renderCell: (params) => params.row.variables?.join(', ') || 'None'
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.isActive ? 'Active' : 'Inactive'}
                    color={params.row.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            renderCell: (params) => new Date(params.row.createdAt).toLocaleDateString()
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleDuplicate(params.row)}
                        color="primary"
                        title="Duplicate"
                    >
                        <FileCopy fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedTemplate(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Document Templates</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Template
                </Button>
            </Box>

            <DataTable
                rows={templates}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Template Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Template Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {templateTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            multiline
                            rows={10}
                            required
                            fullWidth
                            helperText="Use {{variable_name}} for dynamic content"
                        />
                        <TextField
                            label="Variables"
                            name="variables"
                            value={formData.variables}
                            onChange={handleChange}
                            fullWidth
                            placeholder="employee_name, date, position"
                            helperText="Comma-separated list of variable names"
                        />
                        <TextField
                            select
                            label="Status"
                            name="isActive"
                            value={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Active</MenuItem>
                            <MenuItem value="false">Inactive</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedTemplate ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Template"
                message={`Are you sure you want to delete "${selectedTemplate?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedTemplate(null);
                }}
            />
        </Box>
    );
};

export default TemplatesPage;
