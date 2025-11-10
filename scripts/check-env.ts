/**
 * Debug script to check environment variables
 */
function checkEnv() {
  console.log('🔍 Checking environment variables...\n');

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log(`TELEGRAM_BOT_TOKEN: ${telegramToken ? '✅ Set' : '❌ Not set'}`);
  console.log(`GOOGLE_MAPS_API_KEY: ${googleMapsKey ? '✅ Set' : '❌ Not set'}`);

  if (googleMapsKey) {
    console.log(`\nGoogle Maps API key length: ${googleMapsKey.length} characters`);
    console.log(`Starts with: ${googleMapsKey.substring(0, 10)}...`);
  } else {
    console.log('\n❌ Google Maps API key not found. Please check your .env file.');
    console.log('Expected variable name: GOOGLE_MAPS_API_KEY');
    console.log('Make sure the .env file is in the project root directory.');
  }

  console.log('\n📁 Current working directory:', process.cwd());
  console.log('📄 .env file location should be:', process.cwd() + '/.env');

  // Check for common alternative variable names
  const alternatives = [
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_MAPS_KEY',
    'GOOGLE_API_KEY',
    'MAPS_API_KEY',
    'GMAPS_API_KEY'
  ];

  console.log('\n🔍 Checking for alternative variable names:');
  alternatives.forEach(name => {
    const value = process.env[name];
    if (value) {
      console.log(`✅ Found ${name}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${name}: Not set`);
    }
  });
}

// Run the check
checkEnv();
