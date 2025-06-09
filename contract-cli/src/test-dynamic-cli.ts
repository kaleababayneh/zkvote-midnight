#!/usr/bin/env node

import { DynamicCLIGenerator } from './dynamic-cli-generator.js';

// Mock logger that outputs to console
const mockLogger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`)
};

async function testDynamicCLI() {
  console.log('🧪 Testing Dynamic CLI Generator...\n');
  
  try {
    // Initialize the dynamic CLI generator
    const cliGenerator = new DynamicCLIGenerator(mockLogger as any);
    await cliGenerator.initialize();
    
    // Generate menu items
    const menuItems = cliGenerator.generateMenuItems();
    console.log(`✅ Generated ${menuItems.length} menu items:\n`);
    
    menuItems.forEach((item, index) => {
      const number = index + 1;
      const readOnlyIndicator = item.isReadOnly ? ' (read-only)' : '';
      console.log(`  ${number}. ${item.label}${readOnlyIndicator}`);
      console.log(`     ${item.description}`);
    });
    
    // Generate the menu question
    const menuQuestion = cliGenerator.generateMenuQuestion(menuItems);
    console.log('\n📋 Generated menu question:');
    console.log(menuQuestion);
    
    console.log('\n🎉 Dynamic CLI system is working correctly!');
    console.log('💡 When you run the full CLI, you\'ll see these options automatically generated from your contract.');
    
  } catch (error) {
    console.error('❌ Dynamic CLI test failed:', error);
  }
}

testDynamicCLI();
