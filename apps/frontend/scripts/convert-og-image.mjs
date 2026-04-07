import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, '../public/og-image.svg');
const pngPath = path.join(__dirname, '../public/og-image.png');

// Validate source file exists
if (!fs.existsSync(svgPath)) {
  console.error(`Error: Source file not found: ${svgPath}`);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(svgPath);

sharp(svgBuffer)
  .resize(1200, 630, { fit: 'fill' })
  .png()
  .toFile(pngPath)
  .then(() => console.log('og-image.png created successfully'))
  .catch((err) => {
    console.error('Error converting SVG to PNG:', err);
    process.exit(1);
  });
