#!/bin/bash

# Fix HTML file locations and paths after Vite build

echo "Fixing build output..."

# Move HTML files to correct locations
if [ -d "dist/src/devtools" ]; then
  mv dist/src/devtools/*.html dist/devtools/ 2>/dev/null || true
  rm -rf dist/src
fi

# Fix paths in devtools.html
if [ -f "dist/devtools/devtools.html" ]; then
  sed -i '' 's|src="/devtools/|src="./|g' dist/devtools/devtools.html
  sed -i '' 's|href="/chunks/|href="../chunks/|g' dist/devtools/devtools.html
fi

# Fix paths in panel.html
if [ -f "dist/devtools/panel.html" ]; then
  sed -i '' 's|src="/devtools/|src="./|g' dist/devtools/panel.html
  sed -i '' 's|href="/chunks/|href="../chunks/|g' dist/devtools/panel.html
  sed -i '' 's|href="/assets/|href="../assets/|g' dist/devtools/panel.html
  sed -i '' 's|href="/devtools/|href="./|g' dist/devtools/panel.html
fi

# Remove icon references from manifest if icons don't exist
if [ ! -f "dist/assets/icon-16.png" ]; then
  # Remove icons section from manifest.json
  if [ -f "dist/manifest.json" ]; then
    # Use perl for more complex JSON manipulation
    perl -i -pe 'BEGIN{undef $/;} s/,\n\n  "icons": \{[^}]+\}//smg' dist/manifest.json
  fi
fi

echo "Build fixes applied!"
