
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            doctor: user.doctor
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function requireAuth(requiredRole) {
    return function (req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    message: 'Invalid or expired token'
                });
            }

            if (requiredRole && user.role !== requiredRole) {
                return res.status(403).json({
                    message: 'Access denied'
                });
            }

            req.user = user;
            next();
        });
    };
}

module.exports = {
    signToken,
    requireAuth,
    authenticateToken: requireAuth
};
