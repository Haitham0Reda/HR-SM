import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import TextField from './TextField';
import { Typography, Box } from '@mui/material';
import { Warning, CheckCircle, Info } from '@mui/icons-material';

export default {
  title: 'Base Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Basic modal
export const Basic = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Basic Modal"
        actions={
          <>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <Typography>
          This is a basic modal with a title, content, and action buttons.
        </Typography>
      </Modal>
    </>
  );
};

// Different sizes
export const Sizes = () => {
  const [size, setSize] = useState(null);

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Button onClick={() => setSize('small')}>Small Modal</Button>
        <Button onClick={() => setSize('medium')}>Medium Modal</Button>
        <Button onClick={() => setSize('large')}>Large Modal</Button>
        <Button onClick={() => setSize('xlarge')}>XLarge Modal</Button>
      </div>
      
      <Modal
        open={!!size}
        onClose={() => setSize(null)}
        title={`${size?.charAt(0).toUpperCase()}${size?.slice(1)} Modal`}
        size={size}
        actions={
          <Button onClick={() => setSize(null)}>Close</Button>
        }
      >
        <Typography>
          This is a {size} sized modal. The modal width adjusts based on the size prop.
        </Typography>
      </Modal>
    </>
  );
};

// Confirmation dialog
export const ConfirmationDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="error" onClick={() => setOpen(true)}>
        Delete Item
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm Deletion"
        size="small"
        actions={
          <>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="error" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Warning color="error" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this item?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone.
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

// Form modal
export const FormModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add User</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add New User"
        size="medium"
        actions={
          <>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="First Name"
            required
            fullWidth
            placeholder="John"
          />
          <TextField
            label="Last Name"
            required
            fullWidth
            placeholder="Doe"
          />
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            placeholder="john@example.com"
          />
          <TextField
            label="Phone"
            fullWidth
            placeholder="+1 (555) 123-4567"
          />
        </Box>
      </Modal>
    </>
  );
};

// Success message
export const SuccessMessage = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="success" onClick={() => setOpen(true)}>
        Show Success
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Success!"
        size="small"
        actions={
          <Button onClick={() => setOpen(false)}>
            OK
          </Button>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CheckCircle color="success" sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              Your changes have been saved successfully.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can now close this dialog.
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

// Info modal
export const InfoModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="info" onClick={() => setOpen(true)}>
        Show Info
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Information"
        size="medium"
        actions={
          <Button onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Info color="info" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              Important Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This is an informational modal that provides important details to the user.
              It can contain multiple paragraphs of text and other content.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Make sure to read all the information before proceeding.
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

// Without close button
export const WithoutCloseButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Modal Without Close Button"
        showCloseButton={false}
        actions={
          <>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <Typography>
          This modal doesn't have a close button in the header. Users must use the action buttons.
        </Typography>
      </Modal>
    </>
  );
};

// Long content
export const LongContent = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Terms and Conditions"
        size="large"
        actions={
          <>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Decline
            </Button>
            <Button onClick={() => setOpen(false)}>
              Accept
            </Button>
          </>
        }
      >
        <Typography paragraph>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </Typography>
        <Typography paragraph>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
          fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </Typography>
        <Typography paragraph>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
          laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
          architecto beatae vitae dicta sunt explicabo.
        </Typography>
        <Typography paragraph>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
          consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
        </Typography>
      </Modal>
    </>
  );
};
