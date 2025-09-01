
#!/bin/bash

# Rebrand script from Creativ Linc to Interlinc
echo "🔧 Starting comprehensive rebrand: Creativ Linc → Interlinc"

# Create backup
git add -A
git commit -m "chore: pre-rebrand snapshot" || echo "No changes to commit"

# Find all files that need updating (excluding binaries and build dirs)
echo "📋 Discovering files to update..."
rg -l --hidden -S "Creativ Linc|CreativLinc|creativlinc|CREATIV_LINC|creativlinc\.app|creativlinc\.co\.uk" \
  -g "!node_modules" -g "!dist" -g "!build" -g "!*.png" -g "!*.jpg" -g "!*.pdf" -g "!*.ico" -g "!*.woff*" -g "!*.ttf" > files_to_update.txt

echo "📝 Files to update:"
cat files_to_update.txt

# Show dry-run diff first
echo "🔍 Dry-run preview of changes..."
echo "Files that would be changed:"
while IFS= read -r file; do
  echo "  $file"
  # Show sample matches
  rg -n "Creativ Linc|CreativLinc|creativlinc|CREATIV_LINC|creativlinc\.app|creativlinc\.co\.uk" "$file" | head -3
done < files_to_update.txt

echo ""
echo "⚠️  Press ENTER to continue with rebrand or Ctrl+C to cancel..."
read -r

# Apply replacements systematically
echo "🔄 Applying brand replacements..."

# Names & identifiers (exact replacements)
sed -i 's/Creativ Linc/Interlinc/g' $(cat files_to_update.txt)
sed -i 's/CreativLinc/Interlinc/g' $(cat files_to_update.txt)
sed -i 's/CREATIV_LINC/INTERLINC/g' $(cat files_to_update.txt)

# Domains
sed -i 's/creativlinc\.app/interlinc.app/g' $(cat files_to_update.txt)
sed -i 's/www\.creativlinc\.co\.uk/www.interlinc.co/g' $(cat files_to_update.txt)
sed -i 's/creativlinc\.co\.uk/interlinc.co/g' $(cat files_to_update.txt)

# Lowercase identifiers (word boundaries)
sed -i 's/\bcreativlinc\b/interlinc/g' $(cat files_to_update.txt)

# Generate report
echo "📊 Generating rebrand report..."
cat > REBRAND_REPORT.md << 'EOF'
# Rebrand Report: Creativ Linc → Interlinc

## Overview
Comprehensive rebrand completed to change all references from "Creativ Linc" to "Interlinc" across codebase, UI, and configuration.

## Files Changed
EOF

# Add changed files to report
while IFS= read -r file; do
  echo "- \`$file\`" >> REBRAND_REPORT.md
done < files_to_update.txt

echo "" >> REBRAND_REPORT.md
echo "## Verification Commands" >> REBRAND_REPORT.md
echo "\`\`\`bash" >> REBRAND_REPORT.md
echo "# Check for remaining old references" >> REBRAND_REPORT.md
echo "rg -n 'Creativ Linc|CreativLinc|creativlinc'" >> REBRAND_REPORT.md
echo "" >> REBRAND_REPORT.md
echo "# Show git diff" >> REBRAND_REPORT.md
echo "git diff --stat" >> REBRAND_REPORT.md
echo "\`\`\`" >> REBRAND_REPORT.md

echo "✅ Rebrand completed!"
echo "📊 Report saved to REBRAND_REPORT.md"
echo "📊 Generate diff with: git diff --stat"
echo "🔍 Verify no old references: rg -n 'Creativ Linc|CreativLinc|creativlinc'"

# Clean up
rm files_to_update.txt
