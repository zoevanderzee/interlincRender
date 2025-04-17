
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure we're using Node.js from nix
export PATH="/nix/store/$(ls -t /nix/store | grep nodejs | head -n1)/bin:$PATH"

# Start the production server
NODE_ENV=production node dist/index.js
