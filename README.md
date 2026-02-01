# HAMMAD_HASSAN_GGI

## Architecture Decisions
- **Data-Driven Configuration:** Security parameters (rate limits, request size) are managed via database tables, allowing real time adjustments without code deployment.
- **Observability:** Centralized logging with rotation and structured error handling for production readiness.
- **UTC Timezone:** Enforced across the system to avoid synchronization issues.

## Security
- **Authentication:** Token-based authentication using JWT. Designed to integrate with external OAuth2/OIDC providers (e.g., Google).
  - Validates `issuer`, `audience`, and `expiry`.
  - **Real Session-Bound Checks:** Mandatory `sid` (Session ID) claim in the JWT is verified against the `user_sessions` table in the database to ensure the token belongs to an active, unexpired session.
- **Security Headers (Timestamp & Nonce):** Mandatory `x-request-timestamp` and `x-request-nonce` headers for all protected endpoints.
- **Authorization:** Role-Based Access Control (RBAC) enforced at both the controller and domain levels. Permissions are dynamically mapped in the database `role_permissions`.
- **Input Validation & Sanitization:** 
  - Strict schema-based validation using `Zod` (rejects unknown fields).
  - Custom XSS protection via `xssSanitizer` middleware (replaces `xss-clean` for Express 5 compatibility).
  - SQL Injection protection: Handled by ORM's parameterized queries and strict `Zod` schema validation.
- **Rate Limiting:** Per-IP and per-user rate limiting. Different limits are applied to Chat, Subscription, and Auth endpoints, configured via database `rate_limiting_configs` table.
- **Password Hashing:** `bcrypt` for password storage and verification.
- **Middleware Protections:** `helmet` for secure HTTP headers, restricted CORS, and request size limits.

## Database Design & ERD
The system uses a PostgreSQL database. I used psql because of its balance between read and write heaviness. Below is the Entity Relationship Diagram (ERD):

```mermaid
erDiagram
    users ||--o{ user_subscriptions : has
    users ||--o{ chat_sessions : has
    users ||--o{ user_sessions : has
    users ||--o{ user_oauths : has
    roles ||--o{ users : assigns
    roles ||--o{ role_permissions : has
    permissions ||--o{ role_permissions : defines
    subscription_plans ||--o{ user_subscriptions : defines
    subscription_plans ||--o{ user_subscriptions_history : defines
    users ||--o{ user_subscriptions_history : logs
    chat_sessions ||--o{ chat_messages : contains
    oauth_providers ||--o{ user_oauths : provides

    users {
        uuid id PK
        string email
        string password_hash
        string name
        uuid role_id FK
        boolean is_active
        boolean is_locked
        integer last_bad_tries
        timestamp last_logged_in
        string last_location_access
        integer free_messages_used_this_month
        timestamp last_quota_reset_date
        timestamp created_at
    }

    user_subscriptions {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        timestamp start_date
        timestamp end_date
        timestamp renewal_date
        boolean is_active
        boolean auto_renew
        integer max_messages
        integer used_messages
        decimal price
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK
        integer tokens_used
        jsonb metadata
        timestamp created_at
    }

    chat_messages {
        uuid id PK
        uuid chat_session_id FK
        string role
        text content
        timestamp created_at
    }

    subscription_plans {
        uuid id PK
        string tier
        string name
        decimal monthly_price
        decimal yearly_price
        integer monthly_max_messages
        integer yearly_max_messages
    }
    
    rate_limiting_configs {
        uuid id PK
        string apply_to
        boolean is_ip_based
        boolean is_per_user
        integer points
        integer duration
        string max_request_size
    }
```

## Setup Instructions
1. **Prerequisites:** Node.js (v18+), PostgreSQL.
2. **Installation:**
   ```bash
   npm install
   ```
3. **Environment Configuration:**
   Create a `.env` file based on the provided requirements:
   ```env
    PORT=3000
    NODE_ENV=development
    
    IS_SYNCHRONIZE=TRUE
    IS_LOGGING=TRUE
    
    DATABASE_URL=postgresql://user:password@localhost:5432/db
    
    OPENAI_MOCK_DELAY=500
    
    ALLOWED_ORIGINS=
    
    JWT_SECRET=
    JWT_ISSUER=
    JWT_AUDIENCE=
    
    CRYPTO_ALGORITHM=sha256
    CRYPTO_DIGEST='hex'
    
    // Required for Google OAuth2
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

   ```
4. **Database Initialization:**
   There are two scripts have been provided in `sql` folder that will be used to initialize the database test setup. Execute ddl.sql and dml.sql in order.
5. **Running the App:**
   ```bash
   npm run build
   npm start
   ```
6. **Testing:**
   ```bash
   npm test
   ```

## API Usage
The system provides a comprehensive Postman collection for testing all endpoints.

### Postman Setup
1. Import `postman_collection.json` into Postman.
2. Configure Collection Variables:
   - `baseUrl`: The URL where your server is running (default: `http://localhost:3000`).
3. Authentication Flow:
   - Use the **Sign Up** or **Login** requests first.
   - Successful login automatically updates the `token` and `sid` collection variables.
4. Security:
   - Protected endpoints automatically include `x-request-timestamp` and `x-request-nonce` headers via a Collection-level Pre-request Script.
   - **Note:** These headers are added dynamically at runtime and will not be visible in the static 'Headers' tab of individual requests. You can verify they are being sent by checking the **Postman Console** (`Ctrl+Alt+C`).

### Endpoints
- **Auth:**
  - `POST /api/auth/signup`: Create a new user account.
  - `POST /api/auth/login`: Authenticate and receive a JWT and Session ID.
  - `POST /api/auth/google`: OAuth2 login using a Google ID Token.
  - `GET /api/users/me`: Get current user profile.
- **Chat:**
  - `POST /api/chat`: Submit a question to the AI.
  - `GET /api/chat/my`: Get current user's chat sessions.
  - `GET /api/chat/:id`: Get detailed info for a specific chat session (includes all messages).
- **Subscriptions:**
  - `POST /api/subscriptions`: Purchase a new subscription bundle (Basic, Pro, Enterprise).
  - `GET /api/subscriptions/my`: Get current user's subscriptions.
  - `POST /api/subscriptions/:id/cancel`: Cancel an active subscription.
- **Admin:**
  - `GET /api/admin/metrics`: Retrieve system-wide metrics (Admin only).
  - Admin users can be created by setting the `role` to `admin` in the database. For testing, use the `Login as Admin` request in Postman (pre-configured with `admin@example.com`).
- **Health:**
  - `GET /health`: Basic system status check.
