#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find all .js files
function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix parseInt radix issues
function fixParseIntRadix(content) {
  // Fix parseInt calls without radix parameter
  return content.replace(/parseInt\(([^,)]+)\)/g, 'parseInt($1, 10)');
}

// Function to fix unused variables by prefixing with underscore
function fixUnusedVariables(content) {
  // This is a simplified approach - we'll handle specific cases manually
  return content;
}

// Function to fix console statements
function fixConsoleStatements(content) {
  // Replace console.log with logger.info
  content = content.replace(/console\.log\(/g, 'logger.info(');
  
  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, 'logger.error(');
  
  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  
  return content;
}

// Main function
function main() {
  const srcDir = path.join(__dirname, 'src');
  const testDir = path.join(__dirname, 'tests');
  
  const files = [...findJsFiles(srcDir), ...findJsFiles(testDir)];
  
  let totalFixed = 0;
  
  for (const file of files) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;
      
      // Apply fixes
      content = fixParseIntRadix(content);
      content = fixUnusedVariables(content);
      content = fixConsoleStatements(content);
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed: ${file}`);
        totalFixed++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\nTotal files fixed: ${totalFixed}`);
}

if (require.main === module) {
  main();
}

module.exports = { findJsFiles, fixParseIntRadix, fixUnusedVariables, fixConsoleStatements };
