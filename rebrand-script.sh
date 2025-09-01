
#!/bin/bash

# Rebrand script from Interlinc to Interlinc
echo "🔧 Starting comprehensive rebrand: Interlinc → Interlinc"

# Create backup
git add -A
git commit -m "chore: pre-rebrand snapshot" || echo "No changes to commit"

# Find all files that need updating (excluding binaries and build dirs)
echo "📋 Discovering files to update..."
rg -l --hidden -S "Interlinc|CreativLinc|creativlinc|CREATIV_LINC|creativlinc\.app|creativlinc\.co\.uk" \
  -g "!node_modules" -g "!dist" -g "!build" -g "!*.png" -g "!*.jpg" -g "!*.pdf" -g "!*.ico" -g "!*.woff*" -g "!*.ttf" > files_to_update.txt

echo "📝 Files to update:"
cat files_to_update.txt

# Apply replacements systematically
echo "🔄 Applying brand replacements..."

# Names & identifiers - fix the replacement direction
sed -i 's/Interlinc/Interlinc/g' $(cat files_to_update.txt)
sed -i 's/CreativLinc/Interlinc/g' $(cat files_to_update.txt)
sed -i 's/CREATIV_LINC/INTERLINC/g' $(cat files_to_update.txt)

# Domains
sed -i 's/creativlinc\.app/interlinc.app/g' $(cat files_to_update.txt)
sed -i 's/www\.creativlinc\.co\.uk/www.interlinc.co/g' $(cat files_to_update.txt)
sed -i 's/creativlinc\.co\.uk/interlinc.co/g' $(cat files_to_update.txt)

# Lowercase identifiers (word boundaries)
sed -i 's/\bcreativlinc\b/interlinc/g' $(cat files_to_update.txt)

echo "✅ Rebrand completed!"
echo "📊 Generate diff with: git diff --stat"
echo "🔍 Verify no old references: rg -n 'Interlinc|CreativLinc|creativlinc'"

# Clean up
rm files_to_update.txt
