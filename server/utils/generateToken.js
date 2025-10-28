import jwt from 'jsonwebtoken';

const generateToken = (res, uerId) => {
    const token = jwt.sign({ userId: uerId }, process.env.JWT_SECRET, {
        expiresIn: '2d',
    });
    // Set token in HTTP-only cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'production',
        sameSite: 'strict',
        maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
    });
}

export default generateToken;