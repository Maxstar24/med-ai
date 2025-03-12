const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Google Gemini 1.5 Pro API Key Setup ===');
console.log('This script will help you set up your Google Gemini API key for the Med-AI application.');
console.log('You can get an API key from: https://aistudio.google.com/app/apikey');
console.log('Note: This application uses the Gemini 1.5 Pro model, which may require specific API access.');
console.log('');

rl.question('Please enter your Google Gemini API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('Error: API key cannot be empty.');
    rl.close();
    return;
  }

  // Create or update .env.local file
  const envContent = `GOOGLE_AI_API_KEY=${apiKey.trim()}\n`;
  
  try {
    fs.writeFileSync('.env.local', envContent, { flag: 'w' });
    console.log('\nSuccess! API key has been saved to .env.local');
    console.log('Please restart your development server for the changes to take effect.');
  } catch (error) {
    console.error('Error saving API key:', error.message);
  }
  
  rl.close();
}); 