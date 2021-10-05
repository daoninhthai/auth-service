module.exports = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-me',
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  issuer: 'auth-service',
  audience: 'auth-service-clients',
};
