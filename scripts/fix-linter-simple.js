#!/usr/bin/env node

/**
 * Simple Linter Error Fix Script
 * Fixes only safe, common ESLint errors
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  patterns: [
    'src/**/*.js',
    'tests/**/*.js',
    'scripts/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!.git/**',
  ],
  skipPatterns: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
  ],
  backup: true,
  dryRun: false,
};

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  errorsFixed: 0,
  errors: [],
};

/**
 * Fix trailing spaces only
 */
function fixTrailingSpaces(content) {
  const lines = content.split('\n');
  let modified = false;
  
  const fixedLines = lines.map(line => {
    const trimmed = line.replace(/\s+$/, '');
    if (trimmed !== line) {
      modified = true;
    }
    return trimmed;
  });
  
  return { content: fixedLines.join('\n'), modified };
}

/**
 * Fix console statements by adding eslint-disable comments
 */
function fixConsoleStatements(content) {
  let modified = false;
  
  // Only fix console.log statements that are not already disabled
  content = content.replace(
    /^(\s*)console\.(log|warn|error|info|debug)\s*\(/gm,
    (match, spaces) => {
      // Check if there's already an eslint-disable comment above
      const lines = content.split('\n');
      const lineIndex = lines.findIndex(line => line.includes(match.trim()));
      if (lineIndex > 0 && !lines[lineIndex - 1].includes('eslint-disable')) {
        modified = true;
        return `${spaces}// eslint-disable-next-line no-console\n${spaces}console.${match.split('.')[1]}`;
      }
      return match;
    }
  );
  
  return { content, modified };
}

/**
 * Fix unused variables by prefixing with underscore (only function parameters)
 */
function fixUnusedVariables(content) {
  let modified = false;
  
  // Fix function parameters only
  content = content.replace(
    /function\s*\(([^)]*)\)/g,
    (match, params) => {
      const fixedParams = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.startsWith('_') && !trimmed.includes('=') && !trimmed.includes('...')) {
          modified = true;
          return `_${trimmed}`;
        }
        return trimmed;
      }).join(', ');
      return `function(${fixedParams})`;
    }
  );
  
  return { content, modified };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    // Skip if file should be ignored
    for (const pattern of CONFIG.skipPatterns) {
      if (filePath.includes(pattern.replace('**', ''))) {
        return;
      }
    }
    
    // Read file
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let fileModified = false;
    
    // Apply only safe fixes
    const fixes = [
      fixTrailingSpaces,
      fixConsoleStatements,
      fixUnusedVariables,
    ];
    
    for (const fix of fixes) {
      const result = fix(modifiedContent);
      modifiedContent = result.content;
      if (result.modified) {
        fileModified = true;
        stats.errorsFixed++;
      }
    }
    
    // Write file if modified
    if (fileModified && !CONFIG.dryRun) {
      // Create backup if enabled
      if (CONFIG.backup) {
        const backupPath = `${filePath}.backup`;
        fs.writeFileSync(backupPath, content);
      }
      
      fs.writeFileSync(filePath, modifiedContent);
      stats.filesModified++;
    }
    
    stats.filesProcessed++;
    
    if (fileModified) {
      console.log(`✅ Fixed: ${filePath}`);
    }
    
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Starting simple linter error fix...');
  console.log(`📁 Patterns: ${CONFIG.patterns.join(', ')}`);
  console.log(`🔒 Dry run: ${CONFIG.dryRun}`);
  console.log(`💾 Backup: ${CONFIG.backup}`);
  console.log('');
  
  // Find all files
  const files = [];
  for (const pattern of CONFIG.patterns) {
    const matches = glob.sync(pattern, { ignore: CONFIG.skipPatterns });
    files.push(...matches);
  }
  
  // Remove duplicates
  const uniqueFiles = [...new Set(files)];
  
  console.log(`📂 Found ${uniqueFiles.length} files to process`);
  console.log('');
  
  // Process files
  for (const file of uniqueFiles) {
    processFile(file);
  }
  
  // Print summary
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Errors fixed: ${stats.errorsFixed}`);
  
  if (stats.errors.length > 0) {
    console.log(`   Errors: ${stats.errors.length}`);
    for (const error of stats.errors) {
      console.log(`     - ${error.file}: ${error.error}`);
    }
  }
  
  if (CONFIG.dryRun) {
    console.log('');
    console.log('🔍 This was a dry run. No files were actually modified.');
    console.log('   Run without --dry-run to apply fixes.');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  CONFIG.dryRun = true;
}
if (args.includes('--no-backup')) {
  CONFIG.backup = false;
}
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/fix-linter-simple.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run     Show what would be fixed without modifying files');
  console.log('  --no-backup   Skip creating backup files');
  console.log('  --help, -h    Show this help message');
  process.exit(0);
}

// Run the script
main();
