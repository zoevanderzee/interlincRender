
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure we're in the project root
cd "$(dirname "$0")"

# Source nix environment
if [ -f ~/.bashrc ]; then
  . ~/.bashrc
fi

# Ensure npm is available
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
hash -r

echo "📦 Installing dependencies..."
npm install

echo "🛠️ Building application..."
npm run build

echo "✅ Build completed!"
