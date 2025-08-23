#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate
echo "🔐 Generating self-signed SSL certificate..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set proper permissions
chmod 600 ssl/server.key
chmod 644 ssl/server.crt

echo "✅ SSL certificate generated successfully!"
echo "📁 Files created:"
echo "   Certificate: ssl/server.crt"
echo "   Private Key: ssl/server.key"
echo ""
echo "🚀 You can now run the HTTPS example:"
echo "   pnpm run https"
echo ""
echo "⚠️  Note: This is a self-signed certificate for development only."
echo "   Browsers will show a security warning."
