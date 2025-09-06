// Tool Interaction Logger for DevAssist
// Shows what tools are being called behind the scenes

const originalConsoleLog = console.log;
console.log = function(...args) {
  // Intercept and highlight tool calls
  const message = args.join(' ');
  if (message.includes('🔧') || message.includes('Tool:') || message.includes('gemini')) {
    originalConsoleLog('📢 TOOL INTERACTION:', ...args);
  }
  originalConsoleLog(...args);
};

module.exports = { originalConsoleLog };
