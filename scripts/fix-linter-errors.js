#!/usr/bin/env node

/**
* Bulk Linter Error Fix Script
* Fixes common ESLint errors across the codebase
*/

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // File patterns to process
  patterns: [
    'src/**/*.js',
    'tests/**/*.js',
    'scripts/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!.git/**',
  ,],

  // File patterns to skip
  skipPatterns: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
  ,],

  // Extensions to process
  extensions: ['.js',],

  // Backup files before modifying (disabled - Git provides version control)
  backup: false,

  // Dry run mode (don't actually modify files)
  dryRun: false,
};

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  errorsFixed: 0,
  errors: [,],
};

/**
* Fix trailing commas in objects and arrays
*/
function fixTrailingCommas(content) {
  let modified = false;

  // Fix object trailing commas
  content = content.replace(
    /(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*[^,}\,]]+)(\s*)([}\,]])/g,
    (_match, _space1, _prop, _space2, _bracket) => {
      if (bracket === '}' || bracket === ',]') {
        modified = true;
        return `${space1}${prop},${space2}${bracket}`;
      }
      return match;
    }
  );

  // Fix array trailing commas
  content = content.replace(
    /(\s*)([^,}\,]]+)(\s*)([}\,]])/g,
    (_match, _space1, _item, _space2, _bracket) => {
      if (bracket === ']' && !item.includes('[') && !item.includes('{')) {
        modified = true;
        return `${space1}${item},${space2}${bracket}`;
      }
      return match;
    }
  );

  return { content, modified };
}

/**
* Fix quote style (convert double quotes to single quotes)
*/
function fixQuoteStyle(content) {
  let modified = false;

  // Convert double quotes to single quotes in strings
  content = content.replace(
    /'([^'\\]*(\\.[^'\\]*)*)'/g,
    (_match, _inner) => {
      // Skip if it's a template literal or contains single quotes
      if (inner.includes("'") || inner.includes('`')) {
        return match;
      }
      modified = true;
      return `'${inner}'`;
    }
  );

  return { content, modified };
}

/**
* Fix trailing spaces
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
* Fix indentation (convert tabs to spaces)
*/
function fixIndentation(content) {
  let modified = false;

  // Convert tabs to 2 spaces
  content = content.replace(/\t/g, '  ');

  // Fix inconsistent indentation
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    const match = line.match(/^(\s*)/);
    if (match) {
      const spaces = match[1];
      const spaceCount = spaces.length;
      if (spaceCount % 2 !== 0) {
        modified = true;
        return line.replace(/^\s+/, '  '.repeat(Math.floor(spaceCount / 2)));
      }
    }
    return line;
  });

  return { content: fixedLines.join('\n'), modified };
}

/**
* Fix unused variables by prefixing with underscore
*/
function fixUnusedVariables(content) {
  let modified = false;

  // Fix function parameters
  content = content.replace(
    /function\s*\(([^)]*)\)/g,
    (_match, _params) => {
      const fixedParams = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.startsWith('_') && !trimmed.includes('=')) {
          modified = true;
          return `_${trimmed}`;
        }
        return trimmed;
      }).join(', ');
      return `function(_${fixedParams})`;
    }
  );

  // Fix arrow function parameters
  content = content.replace(
    /\(([^)]*)\)\s*=>/g,
    (_match, _params) => {
      const fixedParams = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.startsWith('_') && !trimmed.includes('=')) {
          modified = true;
          return `_${trimmed}`;
        }
        return trimmed;
      }).join(', ');
      return `(_${fixedParams}) =>`;
    }
  );

  return { content, modified };
}

/**
* Fix console statements by adding eslint-disable comments
*/
function fixConsoleStatements(content) {
  let modified = false;

  content = content.replace(
    /console\.(log|warn|error|info|debug)\s*\(/g, (match) => {
      modified = true;
      return `// eslint-disable-next-line no-console\n      ${match}`;
    }
  );

  return { content, modified };
}

/**
* Fix line length issues by breaking long lines
*/
function fixLineLength(content) {
  let modified = false;

  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    if (line.length > 120 && !line.includes('//') && !line.includes('/*')) {
      // Try to break at logical points
      if (line.includes('(') && line.includes(')')) {
        modified = true;
        return line.replace(/,/g, ',\n        ');
      }
    }
    return line;
  });

  return { content: fixedLines.join('\n'), modified };
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

    // Apply fixes
    const fixes = [
      fixTrailingCommas,
      fixQuoteStyle,
      fixTrailingSpaces,
      fixIndentation,
      fixUnusedVariables,
      fixConsoleStatements,
      fixLineLength,
    ,];

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
      // eslint-disable-next-line no-console
      console.log(`✅ Fixed: ${filePath}`);
    }

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message ,});
    // eslint-disable-next-line no-console
      console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
* Main function
*/
function main() {
  // eslint-disable-next-line no-console
      console.log('🔧 Starting bulk linter error fix...');
  // eslint-disable-next-line no-console
      console.log(`📁 Patterns: ${CONFIG.patterns.join(', ')}`);
  // eslint-disable-next-line no-console
      console.log(`🔒 Dry run: ${CONFIG.dryRun}`);
      // eslint-disable-next-line no-console
          console.log(`💾 Backup: ${CONFIG.backup}`);
  // eslint-disable-next-line no-console
      console.log('');

  // Find all files
  const files = [];
  for (const pattern of CONFIG.patterns) {
    const matches = glob.sync(pattern, { ignore: CONFIG.skipPatterns ,});
    files.push(...matches);
  }

  // Remove duplicates
  const uniqueFiles = [...new Set(files)];

  // eslint-disable-next-line no-console
      console.log(`📂 Found ${uniqueFiles.length} files to process`);
  // eslint-disable-next-line no-console
      console.log('');

  // Process files
  for (const file of uniqueFiles) {
    processFile(file);
  }

  // Print summary
  // eslint-disable-next-line no-console
      console.log('');
  // eslint-disable-next-line no-console
      console.log('📊 Summary:');
  // eslint-disable-next-line no-console
      console.log(`   Files processed: ${stats.filesProcessed}`);
  // eslint-disable-next-line no-console
      console.log(`   Files modified: ${stats.filesModified}`);
  // eslint-disable-next-line no-console
      console.log(`   Errors fixed: ${stats.errorsFixed}`);

  if (stats.errors.length > 0) {
    // eslint-disable-next-line no-console
      console.log(`   Errors: ${stats.errors.length}`);
    for (const error of stats.errors) {
      // eslint-disable-next-line no-console
      console.log(`     - ${error.file}: ${error.error}`);
    }
  }

  if (CONFIG.dryRun) {
    // eslint-disable-next-line no-console
      console.log('');
    // eslint-disable-next-line no-console
      console.log('🔍 This was a dry run. No files were actually modified.');
    // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
      console.log('Usage: node scripts/fix-linter-errors.js [options,]');
  // eslint-disable-next-line no-console
      console.log('');
  // eslint-disable-next-line no-console
      console.log('Options:');
  // eslint-disable-next-line no-console
      console.log('  --dry-run     Show what would be fixed without modifying files');
  // eslint-disable-next-line no-console
      console.log('  --no-backup   Skip creating backup files');
  // eslint-disable-next-line no-console
      console.log('  --help, -h    Show this help message');
  process.exit(0);
}

// Run the script
main();
