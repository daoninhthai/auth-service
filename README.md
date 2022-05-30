# Auth Service

A comprehensive authentication microservice built with Node.js, Express.js, and PostgreSQL. Provides JWT authentication, OAuth2 social login, two-factor authentication, API key management, session management, and audit logging.

## Features

- **JWT Authentication** - Access tokens (15min) and refresh tokens (7 days) with automatic rotation
- **OAuth2 Social Login** - Google and GitHub OAuth2 integration via Passport.js
- **Two-Factor Authentication (2FA)** - TOTP-based 2FA compatible with Google Authenticator
- **API Key Authentication** - Generate and manage API keys for programmatic access
- **Rate Limiting** - Configurable rate limits for auth endpoints and general API access
- **Session Management** - Redis-backed session tracking with multi-device support
- **Audit Logging** - Comprehensive logging of all authentication events
- **Email Verification** - Token-based email verification flow
- **Password Reset** - Secure password reset with expiring tokens
- **Role-Based Access Control** - User, moderator, and admin roles
- **Admin Dashboard API** - User management, statistics, ban/unban functionality

## Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js 16** | Runtime |
| **Express.js** | Web framework |
| **PostgreSQL** | Primary database |
| **Redis** | Session store & caching |
| **JSON Web Tokens** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Passport.js** | OAuth2 strategies |
| **Joi** | Request validation |
| **Helmet** | Security headers |
| **Jest** | Testing framework |
| **Docker** | Containerization |
| **Swagger** | API documentation |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh-token` | Refresh access token |

### Password
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/password/forgot-password` | Request password reset |
| POST | `/api/password/reset-password` | Reset password with token |

### OAuth2
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/oauth/google` | Initiate Google OAuth |
| GET | `/api/oauth/google/callback` | Google OAuth callback |
| GET | `/api/oauth/github` | Initiate GitHub OAuth |
| GET | `/api/oauth/github/callback` | GitHub OAuth callback |
| GET | `/api/oauth/providers` | List linked providers |
| POST | `/api/oauth/link` | Link OAuth provider |
| DELETE | `/api/oauth/unlink/:provider` | Unlink OAuth provider |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get current user profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/change-password` | Change password |
| DELETE | `/api/users/account` | Deactivate account |

### Email Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/send-verification` | Send verification email |
| GET | `/api/verification/verify/:token` | Verify email |

### Two-Factor Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/2fa/status` | Get 2FA status |
| POST | `/api/2fa/setup` | Setup 2FA |
| POST | `/api/2fa/verify` | Verify and enable 2FA |
| POST | `/api/2fa/disable` | Disable 2FA |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/api-keys` | Create API key |
| GET | `/api/api-keys` | List API keys |
| PUT | `/api/api-keys/:id/revoke` | Revoke API key |
| DELETE | `/api/api-keys/:id` | Delete API key |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get active sessions |
| DELETE | `/api/sessions` | Revoke all sessions |
| DELETE | `/api/sessions/:id` | Revoke specific session |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users (paginated) |
| GET | `/api/admin/users/:id` | Get user by ID |
| PUT | `/api/admin/users/:id/role` | Update user role |
| PUT | `/api/admin/users/:id/ban` | Ban user |
| PUT | `/api/admin/users/:id/unban` | Unban user |
| GET | `/api/admin/stats` | Get user statistics |

### Documentation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | Swagger UI |
| GET | `/api/docs/json` | OpenAPI spec (JSON) |

## Setup

### Prerequisites

- Node.js 16+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/daoninhthai/auth-service.git
cd auth-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# ... update database credentials, JWT secrets, OAuth keys, etc.

# Run database migrations
node src/db/init.js

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start all services (app + postgres + redis)
docker-compose up -d

# Start only database and Redis (for local development)
docker-compose -f docker-compose.dev.yml up -d
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `auth_service` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_ACCESS_SECRET` | Access token secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | - |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

## Project Structure

```
auth-service/
├── src/
│   ├── app.js                  # Express app setup
│   ├── config/
│   │   ├── database.js         # PostgreSQL connection
│   │   ├── jwt.js              # JWT configuration
│   │   ├── passport.js         # OAuth2 strategies
│   │   ├── redis.js            # Redis connection
│   │   └── swagger.js          # Swagger configuration
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── apiKeyController.js
│   │   ├── authController.js
│   │   ├── oauthController.js
│   │   ├── passwordController.js
│   │   ├── sessionController.js
│   │   ├── twoFactorController.js
│   │   └── userController.js
│   ├── db/
│   │   ├── init.js             # Migration runner
│   │   └── migrations/         # SQL migration files
│   ├── middleware/
│   │   ├── apiKeyAuth.js
│   │   ├── auth.js
│   │   ├── auditMiddleware.js
│   │   ├── authorize.js
│   │   ├── pagination.js
│   │   ├── rateLimiter.js
│   │   ├── security.js
│   │   └── validation.js
│   ├── models/
│   │   ├── ApiKey.js
│   │   ├── AuditLog.js
│   │   ├── OAuthProvider.js
│   │   ├── RefreshToken.js
│   │   └── User.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── apiKeys.js
│   │   ├── auth.js
│   │   ├── docs.js
│   │   ├── oauth.js
│   │   ├── password.js
│   │   ├── sessions.js
│   │   ├── twoFactor.js
│   │   ├── users.js
│   │   └── verification.js
│   └── services/
│       ├── auditService.js
│       ├── emailService.js
│       ├── emailVerificationService.js
│       ├── sessionService.js
│       ├── tokenService.js
│       └── twoFactorService.js
├── tests/
│   ├── auth.test.js
│   ├── middleware.test.js
│   └── user.test.js
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── jest.config.js
├── package.json
└── README.md
```

## Author

**daoninhthai** - [GitHub](https://github.com/daoninhthai)

## License

This project is licensed under the MIT License.
