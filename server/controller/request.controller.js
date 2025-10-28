// Request Controller
import Request from '../models/request.model.js';

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
        await request.save();
        res.status(201).json(request);
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
        const request = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!request) return res.status(404).json({ error: 'Request not found' });
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
