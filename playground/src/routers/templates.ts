import { Router, Request, Response } from 'rnode-server';
export const templatesRouter = Router();

const initResult = templatesRouter.initTemplates('./templates/**/*.html', { autoescape: true });
const parsed = JSON.parse(initResult);

if (parsed.success) {
    console.log('✅ Templates initialized:', parsed.message);
} else {
    console.error('❌ Template initialization failed:', parsed.error);
    process.exit(1);
}

templatesRouter.get('/', (req, res) => {
    try {
        const result = templatesRouter.renderTemplate('index.html', {
            title: 'RNode Template Server - Welcome',
            message: 'Welcome to RNode Template Server! This demonstrates Tera template engine integration.',
            timestamp: new Date().toISOString(),
            user: {
                name: 'Guest User',
                email: 'guest@example.com'
            },
            items: ['RNode Server', 'Tera Templates', 'TypeScript', 'Rust Backend'],
            features: [
                'High Performance Rust Backend',
                'Tera Template Engine',
                'Express-like API',
                'TypeScript Support',
                'Static File Serving',
                'Authentication System'
            ]
        });

        const parsed = JSON.parse(result);

        if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
        } else {
            res.status(500).json({ error: parsed.error });
        }
    } catch (error) {
        res.status(500).json({ error: `Template rendering failed: ${error}` });
    }
});

// Route for rendering templates by name
templatesRouter.get('{name}', (req, res) => {
    const templateName = req.params.name;

    try {
        const result = templatesRouter.renderTemplate(templateName, {
            title: `Template: ${templateName}`,
            message: `Rendering template: ${templateName}`,
            timestamp: new Date().toISOString(),
            user: {
                name: 'Template User',
                email: 'template@example.com'
            },
            items: ['Template Item 1', 'Template Item 2', 'Template Item 3'],
            templateName: templateName
        });

        const parsed = JSON.parse(result);

        if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
        } else {
            res.status(500).json({ error: parsed.error });
        }
    } catch (error) {
        res.status(500).json({ error: `Template rendering failed: ${error}` });
    }
});

// Route for template with dynamic data
templatesRouter.get('/user/{id}', (req, res) => {
    const userId = req.params.id;

    // Simulate user data
    const user = {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        role: userId === '1' ? 'admin' : 'member'
    };

    try {
        const result = templatesRouter.renderTemplate('user_profile.html', {
            user,
            title: 'User Profile',
            isAdmin: user.role === 'admin',
            timestamp: new Date().toISOString()
        });

        const parsed = JSON.parse(result);

        if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
        } else {
            res.status(500).json({ error: parsed.error });
        }
    } catch (error) {
        res.status(500).json({ error: `Template rendering failed: ${error}` });
    }
});

// Route for demonstrating template features
templatesRouter.get('/demo', (req, res) => {
    try {
        const result = templatesRouter.renderTemplate('index.html', {
            title: 'Template Features Demo',
            message: 'This demonstrates various Tera template features',
            timestamp: new Date().toISOString(),
            user: {
                name: 'Demo User',
                email: 'demo@example.com'
            },
            items: ['Conditionals', 'Loops', 'Filters', 'Variables', 'Inheritance'],
            features: [
                'Conditional rendering with {% if %}',
                'Loop iteration with {% for %}',
                'Variable interpolation with {{ }}',
                'Filter application with |',
                'Default values with | default()',
                'Template inheritance'
            ],
            showFeatures: true,
            isDemo: true
        });

        const parsed = JSON.parse(result);

        if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
        } else {
            res.status(500).json({ error: parsed.error });
        }
    } catch (error) {
        res.status(500).json({ error: `Template rendering failed: ${error}` });
    }
});

// API route for template info
templatesRouter.get('/api/templates', (req, res) => {
    res.json({
        success: true,
        templates: [
            {
                name: 'index.html',
                description: 'Main template with dynamic content',
                path: '/'
            },
            {
                name: 'user_profile.html',
                description: 'User profile template with role-based content',
                path: '/user/{id}'
            }
        ],
        features: [
            'Auto-escaping for security',
            'Variable interpolation',
            'Conditional rendering',
            'Loop iteration',
            'Filter application',
            'Template inheritance'
        ]
    });
});

templatesRouter.get('/demo', (req, res) => {
    try {
        const result = templatesRouter.renderTemplate('index.html', {
            title: 'Template Features Demo',
            message: 'This demonstrates various Tera template features',
            timestamp: new Date().toISOString(),
            user: {
                name: 'Demo User',
                email: 'demo@example.com'
            },
            items: ['Conditionals', 'Loops', 'Filters', 'Variables', 'Inheritance'],
            features: [
                'Conditional rendering with {% if %}',
                'Loop iteration with {% for %}',
                'Variable interpolation with {{ }}',
                'Filter application with |',
                'Default values with | default()',
                'Template inheritance'
            ],
            showFeatures: true,
            isDemo: true
        });

        const parsed = JSON.parse(result);

        if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
        } else {
            res.status(500).json({ error: parsed.error });
        }
    } catch (error) {
        res.status(500).json({ error: `Template rendering failed: ${error}` });
    }
});
