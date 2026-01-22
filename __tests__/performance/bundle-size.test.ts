/**
 * Bundle Size Tests
 * Validates bundle sizes, code splitting, and tree shaking effectiveness
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Bundle Size Tests', () => {
  const BUILD_DIR = path.join(process.cwd(), '.next');
  const STATIC_DIR = path.join(BUILD_DIR, 'static');
  const CHUNKS_DIR = path.join(STATIC_DIR, 'chunks');

  beforeAll(() => {
    // Ensure build exists
    if (!fs.existsSync(BUILD_DIR)) {
      console.log('Build directory not found, skipping bundle tests');
    }
  });

  const getFileSize = (filePath: string): number => {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  };

  const getTotalDirSize = (dirPath: string): number => {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += getTotalDirSize(filePath);
      } else {
        totalSize += getFileSize(filePath);
      }
    }

    return totalSize;
  };

  const getJsFiles = (dirPath: string): string[] => {
    if (!fs.existsSync(dirPath)) return [];
    
    const jsFiles: string[] = [];
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        jsFiles.push(...getJsFiles(filePath));
      } else if (file.name.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    }

    return jsFiles;
  };

  describe('Total Bundle Size', () => {
    test('Total client-side JavaScript bundle should be < 500KB', () => {
      if (!fs.existsSync(STATIC_DIR)) {
        console.log('Static directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(STATIC_DIR);
      const totalSize = jsFiles.reduce((acc, file) => acc + getFileSize(file), 0);
      const totalKB = totalSize / 1024;

      console.log(`Total bundle size: ${totalKB.toFixed(2)} KB`);
      expect(totalKB).toBeLessThan(500);
    });

    test('All chunks directory size should be reasonable', () => {
      if (!fs.existsSync(CHUNKS_DIR)) {
        console.log('Chunks directory not found, skipping test');
        return;
      }

      const totalSize = getTotalDirSize(CHUNKS_DIR);
      const totalKB = totalSize / 1024;

      console.log(`Total chunks size: ${totalKB.toFixed(2)} KB`);
      expect(totalKB).toBeLessThan(600);
    });
  });

  describe('Individual Page Bundles', () => {
    test('Homepage bundle should be < 150KB', () => {
      const pagesDir = path.join(BUILD_DIR, 'static', 'chunks', 'pages');
      if (!fs.existsSync(pagesDir)) {
        console.log('Pages directory not found, skipping test');
        return;
      }

      const indexFiles = fs.readdirSync(pagesDir)
        .filter(f => f.startsWith('index') && f.endsWith('.js'));
      
      if (indexFiles.length === 0) {
        console.log('No index files found');
        return;
      }

      const totalSize = indexFiles.reduce((acc, file) => {
        return acc + getFileSize(path.join(pagesDir, file));
      }, 0);

      const totalKB = totalSize / 1024;
      console.log(`Homepage bundle size: ${totalKB.toFixed(2)} KB`);
      expect(totalKB).toBeLessThan(150);
    });

    test('Wallet page bundle should be < 200KB', () => {
      const pagesDir = path.join(BUILD_DIR, 'static', 'chunks', 'pages');
      if (!fs.existsSync(pagesDir)) {
        console.log('Pages directory not found, skipping test');
        return;
      }

      const walletFiles = fs.readdirSync(pagesDir)
        .filter(f => f.includes('wallet') && f.endsWith('.js'));
      
      if (walletFiles.length === 0) {
        console.log('No wallet files found');
        return;
      }

      const totalSize = walletFiles.reduce((acc, file) => {
        return acc + getFileSize(path.join(pagesDir, file));
      }, 0);

      const totalKB = totalSize / 1024;
      console.log(`Wallet bundle size: ${totalKB.toFixed(2)} KB`);
      expect(totalKB).toBeLessThan(200);
    });

    test('Dashboard page bundle should be < 180KB', () => {
      const pagesDir = path.join(BUILD_DIR, 'static', 'chunks', 'pages');
      if (!fs.existsSync(pagesDir)) {
        console.log('Pages directory not found, skipping test');
        return;
      }

      const dashboardFiles = fs.readdirSync(pagesDir)
        .filter(f => f.includes('dashboard') && f.endsWith('.js'));
      
      if (dashboardFiles.length === 0) {
        console.log('No dashboard files found');
        return;
      }

      const totalSize = dashboardFiles.reduce((acc, file) => {
        return acc + getFileSize(path.join(pagesDir, file));
      }, 0);

      const totalKB = totalSize / 1024;
      console.log(`Dashboard bundle size: ${totalKB.toFixed(2)} KB`);
      expect(totalKB).toBeLessThan(180);
    });
  });

  describe('Code Splitting Effectiveness', () => {
    test('Should have multiple chunks (code splitting enabled)', () => {
      if (!fs.existsSync(CHUNKS_DIR)) {
        console.log('Chunks directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(CHUNKS_DIR);
      console.log(`Number of chunks: ${jsFiles.length}`);
      
      expect(jsFiles.length).toBeGreaterThan(5); // Should have multiple chunks
    });

    test('No single chunk should be excessively large', () => {
      if (!fs.existsSync(CHUNKS_DIR)) {
        console.log('Chunks directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(CHUNKS_DIR);
      const largeChunks = jsFiles.filter(file => {
        const size = getFileSize(file);
        return size > 250 * 1024; // 250KB
      });

      if (largeChunks.length > 0) {
        console.log('Large chunks found:', largeChunks.map(f => ({
          name: path.basename(f),
          size: `${(getFileSize(f) / 1024).toFixed(2)} KB`
        })));
      }

      expect(largeChunks.length).toBe(0);
    });

    test('Common vendor chunks should be properly split', () => {
      if (!fs.existsSync(CHUNKS_DIR)) {
        console.log('Chunks directory not found, skipping test');
        return;
      }

      const vendorChunks = fs.readdirSync(CHUNKS_DIR)
        .filter(f => f.includes('vendors') || f.includes('framework'));
      
      console.log(`Vendor chunks found: ${vendorChunks.length}`);
      expect(vendorChunks.length).toBeGreaterThan(0);
    });
  });

  describe('Tree Shaking Verification', () => {
    test('Should not include development-only code', () => {
      if (!fs.existsSync(STATIC_DIR)) {
        console.log('Static directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(STATIC_DIR);
      const devCodePatterns = [
        'console.log',
        'debugger',
        'development mode',
      ];

      const filesWithDevCode: { file: string; pattern: string }[] = [];

      for (const file of jsFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of devCodePatterns) {
          // Simple check - production builds should minimize these
          const occurrences = (content.match(new RegExp(pattern, 'g')) || []).length;
          if (occurrences > 5) { // Allow some occurrences
            filesWithDevCode.push({ 
              file: path.basename(file), 
              pattern 
            });
          }
        }
      }

      if (filesWithDevCode.length > 0) {
        console.log('Files with excessive dev code:', filesWithDevCode);
      }

      // This is a warning rather than hard failure
      expect(filesWithDevCode.length).toBeLessThan(3);
    });

    test('Should have minified code', () => {
      if (!fs.existsSync(STATIC_DIR)) {
        console.log('Static directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(STATIC_DIR);
      if (jsFiles.length === 0) return;

      // Check first file as sample
      const sampleFile = jsFiles[0];
      const content = fs.readFileSync(sampleFile, 'utf-8');
      const firstLine = content.split('\n')[0];

      // Minified code typically has very long lines
      expect(firstLine.length).toBeGreaterThan(100);
    });
  });

  describe('Dynamic Import Verification', () => {
    test('Should use dynamic imports for heavy components', () => {
      // Check if lazy loading is used in production build
      if (!fs.existsSync(CHUNKS_DIR)) {
        console.log('Chunks directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(CHUNKS_DIR);
      
      // Look for async chunk loading patterns
      const asyncChunks = jsFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf-8');
        return content.includes('__webpack_chunk_load__') || 
               content.includes('import(') ||
               content.includes('lazy(');
      });

      console.log(`Async chunks found: ${asyncChunks.length}`);
      expect(asyncChunks.length).toBeGreaterThan(0);
    });
  });

  describe('Third-Party Libraries', () => {
    test('Should not bundle large unused libraries', () => {
      if (!fs.existsSync(STATIC_DIR)) {
        console.log('Static directory not found, skipping test');
        return;
      }

      const jsFiles = getJsFiles(STATIC_DIR);
      
      // Common heavy libraries that should be imported carefully
      const heavyLibs = [
        'moment.js', // Should use date-fns or dayjs instead
        'lodash', // Should use lodash-es and tree-shake
      ];

      const foundHeavyLibs: string[] = [];

      for (const file of jsFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const lib of heavyLibs) {
          if (content.includes(lib)) {
            foundHeavyLibs.push(lib);
          }
        }
      }

      if (foundHeavyLibs.length > 0) {
        console.log('Heavy libraries found:', foundHeavyLibs);
      }

      // This is informational
      expect(foundHeavyLibs.length).toBeLessThan(2);
    });
  });

  describe('Source Map Analysis', () => {
    test('Source maps should not be included in production', () => {
      if (!fs.existsSync(STATIC_DIR)) {
        console.log('Static directory not found, skipping test');
        return;
      }

      const mapFiles = getJsFiles(STATIC_DIR).filter(f => f.endsWith('.map'));
      
      console.log(`Source map files found: ${mapFiles.length}`);
      
      // In production, source maps should typically not be deployed
      // or should be uploaded to error tracking service separately
      expect(mapFiles.length).toBe(0);
    });
  });

  describe('Image Assets', () => {
    test('Should optimize images', () => {
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        console.log('Public directory not found, skipping test');
        return;
      }

      const getImageFiles = (dir: string): string[] => {
        if (!fs.existsSync(dir)) return [];
        
        const images: string[] = [];
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            images.push(...getImageFiles(filePath));
          } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
            images.push(filePath);
          }
        }

        return images;
      };

      const imageFiles = getImageFiles(publicDir);
      const largeImages = imageFiles.filter(file => {
        const size = getFileSize(file);
        return size > 500 * 1024; // 500KB
      });

      if (largeImages.length > 0) {
        console.log('Large images found:', largeImages.map(f => ({
          name: path.basename(f),
          size: `${(getFileSize(f) / 1024).toFixed(2)} KB`
        })));
      }

      // Warning: Large images should be optimized
      expect(largeImages.length).toBeLessThan(3);
    });
  });
});
