
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure we're using Node.js from nix
export PATH="/nix/store/$(ls -t /nix/store | grep nodejs | head -n1)/bin:$PATH"

# Set production environment
export NODE_ENV=production 

# Start the production server
node dist/index.js
