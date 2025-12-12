import React from 'react';
import {
    Dialog,
    DialogContent,
    IconButton,
    Box,
    Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const DocumentViewer = ({ open, onClose, document }) => {
    if (!document) return null;

    const isPDF = document.fileUrl?.endsWith('.pdf');
    const isImage = document.fileUrl?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    height: '90vh',
                    bgcolor: '#2c3e50',
                    m: 2
                }
            }}
        >
            <DialogContent sx={{
                p: 0,
                height: '100%',
                bgcolor: '#2c3e50',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'white',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        zIndex: 1,
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.7)'
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {document.fileUrl && (
                    <>
                        {isPDF ? (
                            <iframe
                                src={document.fileUrl}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none'
                                }}
                                title={document.title}
                            />
                        ) : isImage ? (
                            <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src={document.fileUrl}
                                    alt={document.title}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>
                        ) : (
                            <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                color: 'white'
                            }}>
                                <Typography variant="h2">📄</Typography>
                                <Typography variant="h6">Preview not available</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    This file type cannot be previewed
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DocumentViewer;
