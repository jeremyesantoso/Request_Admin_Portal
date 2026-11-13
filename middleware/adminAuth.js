const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="cakekue Admin Workspace"');
        return res.status(401).json({ error: 'Authentication required.' });
    }

    // Decode Base64 "username:password"
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    const validUser = process.env.ADMIN_USER || 'admin';
    const validPass = process.env.ADMIN_PASS;

    if (username === validUser && password === validPass) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="cakekue Admin Workspace"');
    return res.status(401).json({ error: 'Invalid admin credentials.' });
};

module.exports = adminAuth;