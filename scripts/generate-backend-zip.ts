import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

async function createBackendZip() {
  console.log('Packaging backend bundle...');
  const zip = new JSZip();

  // 1. Root configuration & server entry files
  const rootFilesToInclude = [
    'server.ts',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'metadata.json',
    'README.md',
  ];

  for (const filename of rootFilesToInclude) {
    const filePath = path.resolve(rootDir, filename);
    if (fs.existsSync(filePath)) {
      zip.file(filename, fs.readFileSync(filePath, 'utf-8'));
    }
  }

  // 2. Add src/server recursively
  function addDirRecursively(dirPath: string, zipFolder: JSZip) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFolder = zipFolder.folder(entry.name);
        if (subFolder) addDirRecursively(fullPath, subFolder);
      } else if (entry.isFile()) {
        zipFolder.file(entry.name, fs.readFileSync(fullPath));
      }
    }
  }

  const serverFolder = zip.folder('src/server');
  if (serverFolder) {
    addDirRecursively(path.resolve(rootDir, 'src/server'), serverFolder);
  }

  // Add supabase folder
  const supabaseFolder = zip.folder('supabase');
  if (supabaseFolder && fs.existsSync(path.resolve(rootDir, 'supabase'))) {
    addDirRecursively(path.resolve(rootDir, 'supabase'), supabaseFolder);
  }

  // 3. Add types & defaultCurriculum needed by backend
  const typesFolder = zip.folder('src/types');
  if (typesFolder) {
    addDirRecursively(path.resolve(rootDir, 'src/types'), typesFolder);
  }

  if (fs.existsSync(path.resolve(rootDir, 'src/types.ts'))) {
    zip.file('src/types.ts', fs.readFileSync(path.resolve(rootDir, 'src/types.ts'), 'utf-8'));
  }

  if (fs.existsSync(path.resolve(rootDir, 'src/defaultCurriculum.ts'))) {
    zip.file('src/defaultCurriculum.ts', fs.readFileSync(path.resolve(rootDir, 'src/defaultCurriculum.ts'), 'utf-8'));
  }

  // 4. Generate zip buffer
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const outputPath = path.resolve(publicDir, 'backend-source.zip');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully created backend zip at: ${outputPath} (${buffer.length} bytes)`);
}

createBackendZip().catch(console.error);
