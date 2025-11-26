import User from '../models/user.model.js';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test endpoint to verify route is working
 */
export const testPhotoDownload = async (req, res) => {
    res.json({ 
        message: 'Photo download endpoint is working',
        timestamp: new Date().toISOString()
    });
};

/**
 * Bulk download user photos as ZIP
 */
export const bulkDownloadPhotos = async (req, res) => {
    try {
        console.log('Bulk download photos request received');
        console.log('Method:', req.method);
        console.log('Query:', req.query);
        console.log('Body:', req.body);
        
        // Handle both POST (JSON body) and GET (query parameters)
        let userIds;
        let token;
        
        if (req.method === 'GET') {
            // GET request - parse from query parameters
            userIds = req.query.userIds;
            token = req.query.token;
            
            if (typeof userIds === 'string') {
                try {
                    userIds = JSON.parse(userIds);
                } catch (e) {
                    console.error('Failed to parse userIds from query:', e);
                    return res.status(400).json({ message: 'Invalid userIds format' });
                }
            }
            
            // Verify token for GET requests
            if (token) {
                try {
                    const jwt = await import('jsonwebtoken');
                    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
                    req.user = decoded;
                    console.log('Token verified for user:', decoded.id);
                } catch (error) {
                    console.error('Token verification failed:', error);
                    return res.status(401).json({ message: 'Invalid or expired token' });
                }
            } else {
                return res.status(401).json({ message: 'Authentication required' });
            }
        } else {
            // POST request - use body
            userIds = req.body.userIds;
        }

        // Get users
        let users;
        if (userIds && userIds.length > 0) {
            users = await User.find({ _id: { $in: userIds } });
            console.log(`Found ${users.length} users from ${userIds.length} IDs`);
        } else {
            users = await User.find({});
            console.log(`Found ${users.length} total users`);
        }

        // Filter users with photos and log what we find
        const usersWithPhotos = users.filter(user => {
            const hasPhoto = user.personalInfo?.profilePicture || user.profilePicture;
            if (hasPhoto) {
                console.log(`User ${user.username} has photo: ${user.personalInfo?.profilePicture || user.profilePicture}`);
            }
            return hasPhoto;
        });

        console.log(`${usersWithPhotos.length} users have profile pictures`);

        if (usersWithPhotos.length === 0) {
            return res.status(404).json({ 
                message: 'No users with profile pictures found. Profile pictures may be stored as base64 or external URLs.' 
            });
        }

        // Check if photos are base64 encoded
        const firstPhoto = usersWithPhotos[0].personalInfo?.profilePicture || usersWithPhotos[0].profilePicture;
        const isBase64 = firstPhoto && firstPhoto.startsWith('data:image');
        console.log(`Photos are ${isBase64 ? 'base64 encoded' : 'file paths'}`);

        // Set response headers for ZIP download BEFORE creating archive
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=user_photos_${new Date().toISOString().split('T')[0]}.zip`);

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 6 }
        });

        let addedCount = 0;
        const errors = [];

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    message: 'Archive creation error',
                    error: err.message 
                });
            }
        });

        // Pipe archive to response immediately
        archive.pipe(res);

        // Add each photo to archive
        for (const user of usersWithPhotos) {
            try {
                const photoData = user.personalInfo?.profilePicture || user.profilePicture;
                console.log(`Processing photo for ${user.username}: ${photoData.substring(0, 50)}...`);
                
                // Handle base64 encoded images
                if (photoData.startsWith('data:image')) {
                    console.log(`Converting base64 image for ${user.username}`);
                    
                    // Extract base64 data and mime type
                    const matches = photoData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                    if (!matches) {
                        console.log(`Invalid base64 format for ${user.username}`);
                        errors.push(`${user.username}: Invalid base64 format`);
                        continue;
                    }
                    
                    const imageType = matches[1]; // png, jpeg, jpg, etc.
                    const base64Data = matches[2];
                    
                    // Convert base64 to buffer
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    
                    // Create filename
                    const sanitizedName = (user.personalInfo?.fullName || user.username)
                        .replace(/[^a-zA-Z0-9\s]/g, '')
                        .replace(/\s+/g, '_');
                    const fileName = `${user.employeeId || user._id}_${sanitizedName}.${imageType}`;
                    
                    // Add buffer to archive
                    archive.append(imageBuffer, { name: fileName });
                    addedCount++;
                    console.log(`Added ${fileName} to archive (base64 converted)`);
                    continue;
                }
                
                // Handle different path formats (for file-based storage)
                let fullPath;
                if (photoData.startsWith('http')) {
                    // Skip external URLs for now
                    console.log(`Skipping external URL for ${user.username}: ${photoData}`);
                    errors.push(`${user.username}: External URL not supported`);
                    continue;
                }
                
                // Remove leading slash if present
                const cleanPath = photoData.startsWith('/') ? photoData.substring(1) : photoData;
                
                // Try multiple possible locations
                const possiblePaths = [
                    path.join(__dirname, '..', '..', cleanPath),
                    path.join(__dirname, '..', '..', 'uploads', cleanPath),
                    path.join(__dirname, '..', '..', 'public', cleanPath),
                    path.join(process.cwd(), cleanPath),
                    path.join(process.cwd(), 'uploads', cleanPath),
                    path.join(process.cwd(), 'public', cleanPath)
                ];
                
                fullPath = possiblePaths.find(p => fs.existsSync(p));
                
                if (!fullPath) {
                    console.log(`File not found for ${user.username}. Tried paths:`);
                    possiblePaths.forEach(p => console.log(`  - ${p}`));
                    errors.push(`${user.username}: File not found`);
                    continue;
                }

                console.log(`Found file at: ${fullPath}`);

                // Get file extension
                const extension = path.extname(photoData) || '.jpg';
                
                // Create filename
                const sanitizedName = (user.personalInfo?.fullName || user.username)
                    .replace(/[^a-zA-Z0-9\s]/g, '')
                    .replace(/\s+/g, '_');
                const fileName = `${user.employeeId || user._id}_${sanitizedName}${extension}`;

                // Add file to archive
                archive.file(fullPath, { name: fileName });
                addedCount++;
                console.log(`Added ${fileName} to archive`);
            } catch (error) {
                console.error(`Error adding photo for ${user.username}:`, error);
                errors.push(`${user.username}: ${error.message}`);
            }
        }

        console.log(`Finalizing archive with ${addedCount} photos`);
        if (errors.length > 0) {
            console.log('Errors encountered:', errors);
        }

        if (addedCount === 0) {
            console.error('No photos could be added to archive');
            console.error('Errors:', errors);
            // Archive already piped, just finalize with empty content
            archive.append('No photos found', { name: 'README.txt' });
        }

        // Finalize archive
        await archive.finalize();

        console.log(`ZIP archive created successfully with ${addedCount} photos`);
    } catch (error) {
        console.error('Bulk download photos error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: 'Failed to create photo archive',
                error: error.message 
            });
        }
    }
};
