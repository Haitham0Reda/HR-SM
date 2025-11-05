// Request Controller
import Request from '../models/request.model.js';
import { createPermissionNotification } from '../middleware/index.js';

export const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createRequest = async (req, res) => {
    try {
        const request = new Request(req.body);
        const savedRequest = await request.save();

        // Handle post-save notification if it's a permission request
        if (savedRequest.type === 'permission') {
            await createPermissionNotification(savedRequest, null);
        }

        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const oldRequest = await Request.findById(req.params.id);
        if (!oldRequest) return res.status(404).json({ error: 'Request not found' });

        const previousStatus = oldRequest.status;
        const request = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Handle notification if status changed and it's a permission request
        if (previousStatus !== request.status && request.type === 'permission') {
            await createPermissionNotification(request, previousStatus);
        }

        res.json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteRequest = async (req, res) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        res.json({ message: 'Request deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
