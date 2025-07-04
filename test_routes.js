const express = require('express');
const app = express();

// Test if the checklist routes can be imported
try {
  const checklistsRoutes = require('./backend/src/routes/checklists');
  console.log('✅ Checklist routes imported successfully');
  
  const tasksRoutes = require('./backend/src/routes/tasks');
  console.log('✅ Task routes imported successfully');
  
  // Test if controllers can be imported
  const checklistsController = require('./backend/src/controllers/checklistsController');
  console.log('✅ Checklist controller imported successfully');
  
  const tasksController = require('./backend/src/controllers/tasksController');
  console.log('✅ Task controller imported successfully');
  
} catch (error) {
  console.log('❌ Import error:', error.message);
  console.log('Stack:', error.stack);
}