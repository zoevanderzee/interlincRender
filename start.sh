
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "Using nix-shell to get Node.js..."
  export PATH="$PATH:$(nix-shell -p nodejs_20 --run 'echo $PATH')"
fi

# Start the server
NODE_ENV=production node dist/index.js
