-- Initial Roles
INSERT INTO roles (name, description) VALUES 
('admin', 'System administrator with full access'),
('user', 'Regular user with restricted access')
ON CONFLICT (name) DO NOTHING;

-- Initial OAuth Providers
INSERT INTO oauth_providers (id, name) VALUES 
('google', 'Google OAuth'),
('microsoft', 'Microsoft OAuth')
ON CONFLICT (id) DO NOTHING;

-- Initial Subscription Plans
INSERT INTO subscription_plans (tier, name, monthly_price, yearly_price, monthly_max_messages, yearly_max_messages) VALUES
('Basic', 'Basic Bundle', 10, 108, 10, 120),
('Pro', 'Pro Bundle', 50, 540, 100, 1200),
('Enterprise', 'Enterprise Bundle', 200, 2160, -1, -1)
ON CONFLICT (tier) DO NOTHING;

-- Initial Rate Limiting Configs
INSERT INTO rate_limiting_configs (apply_to, points, duration, max_request_size) VALUES
('chat', 10, 60, '10kb')
ON CONFLICT (apply_to) DO NOTHING;

-- Initial Permissions
INSERT INTO permissions (name, description) VALUES 
('POST:/api/chat', 'Allow posting questions to chat'),
('GET:/api/chat/my', 'Allow viewing own chats'),
('GET:/api/chat/:id', 'Allow viewing specific chat info'),
('POST:/api/subscriptions', 'Allow creating subscriptions'),
('GET:/api/subscriptions/my', 'Allow viewing own subscriptions'),
('POST:/api/subscriptions/:id/cancel', 'Allow cancelling subscriptions'),
('GET:/api/admin/metrics', 'Allow viewing system metrics'),
('POST:/api/auth/signup', 'Allow signup'),
('POST:/api/auth/login', 'Allow login'),
('POST:/api/auth/google', 'Allow google login')
ON CONFLICT (name) DO NOTHING;

-- Map Permissions to Roles (Admin gets all, User gets some)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'POST:/api/chat', 
    'GET:/api/chat/my', 
    'GET:/api/chat/:id', 
    'POST:/api/subscriptions', 
    'GET:/api/subscriptions/my', 
    'POST:/api/subscriptions/:id/cancel', 
    'POST:/api/auth/signup', 
    'POST:/api/auth/login', 
    'POST:/api/auth/google'
)
ON CONFLICT DO NOTHING;

INSERT INTO users (email, password_hash, name, role_id)
VALUES ('admin@example.com',
        '$2b$10$sx4F7L9qqWrwd076wHGLdefixvhicE5k21qdLYYE.4qUJhnVJG8iG',
        'Admin',
        (SELECT id FROM roles WHERE name = 'admin'))
ON CONFLICT (email) DO NOTHING;


