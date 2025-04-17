#!/bin/bash

# Run the deployment preparation script
echo "Running deployment preparation script..."
npx tsx scripts/prepare-for-deploy.js

# Check if the script ran successfully
if [ $? -eq 0 ]; then
  echo "✅ Application is ready for deployment!"
  echo "You can now use the Replit 'Deploy' button to deploy your application."
else
  echo "❌ Deployment preparation failed. Please check the logs and fix any issues."
  exit 1
fi