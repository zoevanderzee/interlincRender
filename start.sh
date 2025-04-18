
#!/bin/bash
echo "🚀 Starting production server..."

# Set production environment
export NODE_ENV=production
node dist/index.js
