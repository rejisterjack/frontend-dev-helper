#!/bin/bash
#
# Build and package FrontendDevHelper for Chrome Web Store and Firefox
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 FrontendDevHelper Release Builder${NC}"
echo "========================================"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Version: $VERSION${NC}"

# Clean and build
echo -e "\n${YELLOW}📦 Building extension...${NC}"
rm -rf dist
npm run build

# Create releases directory
mkdir -p releases

# ============================================
# Chrome Build
# ============================================
echo -e "\n${YELLOW}🔵 Packaging for Chrome Web Store...${NC}"

# Chrome uses the default dist folder
CHROME_ZIP="releases/frontend-dev-helper-chrome-v$VERSION.zip"
cd dist
zip -r "../$CHROME_ZIP" . -x "*.map" -x "**/*.map" -x "*.DS_Store"
cd ..

echo -e "${GREEN}✓ Chrome package created: $CHROME_ZIP${NC}"

# ============================================
# Firefox Build
# ============================================
echo -e "\n${YELLOW}🟠 Packaging for Firefox...${NC}"

# Firefox build directory
FIREFOX_DIR="dist-firefox"
rm -rf "$FIREFOX_DIR"
cp -r dist "$FIREFOX_DIR"

# Firefox-specific manifest adjustments
# Firefox supports MV3 but needs some tweaks
node scripts/prepare-firefox-manifest.js

FIREFOX_ZIP="releases/frontend-dev-helper-firefox-v$VERSION.zip"
cd "$FIREFOX_DIR"
zip -r "../$FIREFOX_ZIP" . -x "*.map" -x "**/*.map" -x "*.DS_Store"
cd ..

# Cleanup
rm -rf "$FIREFOX_DIR"

echo -e "${GREEN}✓ Firefox package created: $FIREFOX_ZIP${NC}"

# ============================================
# Source Code (for stores)
# ============================================
echo -e "\n${YELLOW}📄 Creating source code archive...${NC}"

SOURCE_ZIP="releases/frontend-dev-helper-source-v$VERSION.zip"
zip -r "$SOURCE_ZIP" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "releases/*" \
  -x "*.DS_Store" \
  -x ".git/*" \
  -x "*.zip"

echo -e "${GREEN}✓ Source code archive: $SOURCE_ZIP${NC}"

# ============================================
# Summary
# ============================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Build complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Packages created:${NC}"
echo -e "  🔵 Chrome:  ${YELLOW}$CHROME_ZIP${NC} ($(du -h "$CHROME_ZIP" | cut -f1))"
echo -e "  🟠 Firefox: ${YELLOW}$FIREFOX_ZIP${NC} ($(du -h "$FIREFOX_ZIP" | cut -f1))"
echo -e "  📄 Source:  ${YELLOW}$SOURCE_ZIP${NC} ($(du -h "$SOURCE_ZIP" | cut -f1))"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Upload ${YELLOW}$CHROME_ZIP${NC} to Chrome Web Store Developer Dashboard"
echo -e "     → https://chrome.google.com/webstore/devconsole"
echo -e "  2. Upload ${YELLOW}$FIREFOX_ZIP${NC} to Firefox Add-ons"
echo -e "     → https://addons.mozilla.org/en-US/developers/"
echo -e "  3. Upload ${YELLOW}$SOURCE_ZIP${NC} as source code (if required)"
echo ""
