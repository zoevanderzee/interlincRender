
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure we're in the project root
cd "$(dirname "$0")"

# Source nix environment
if [ -f ~/.bashrc ]; then
  . ~/.bashrc
fi

# Ensure npm is available
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
hash -r

# Start the server
NODE_ENV=production node dist/index.js
