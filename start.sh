#!/bin/bash
echo "🚀 Starting application in production mode..."

# Set production environment
export NODE_ENV=production

# Check for database existence and connection
echo "🔍 Checking database connection..."
if [[ ! -z "$DATABASE_URL" ]]; then
  echo "✅ Database URL found"
else
  echo "⚠️ Warning: DATABASE_URL not found, this may cause issues"
fi

# Start the application using the script in package.json
echo "🌐 Starting server..."
npm start