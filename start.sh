
#!/bin/bash
echo "🚀 Starting production server..."

# Set production environment
export NODE_ENV=production 

# Start the production server
node dist/index.js
