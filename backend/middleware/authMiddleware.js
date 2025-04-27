const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log(`Auth middleware checking path: ${req.path}`);
  
  // Skip authentication for specific endpoints
  if (req.path === '/api/auth/login' || 
      req.path === '/api/auth/register' || 
      req.path === '/api/auth/refresh-token') {
    console.log('Skipping auth check for:', req.path);
    return next();
  }

  // Check for token in cookies first (primary method)
  const cookieToken = req.cookies?.token;
  
  // Fallback to checking Authorization header
  const headerAuth = req.header('Authorization');
  const headerToken = headerAuth ? headerAuth.split(' ')[1] : null;
  
  // Use cookie token if available, otherwise use header token
  const token = cookieToken || headerToken;
  
  console.log('Cookie token exists:', !!cookieToken);
  console.log('Header token exists:', !!headerToken);
  
  // If no token found, return unauthorized
  if (!token) {
    console.log('No authentication token found');
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully for user:', decoded.username);
    
    // Add user data to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
};