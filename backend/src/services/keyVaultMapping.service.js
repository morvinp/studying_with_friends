// Complete mapping to match your actual environment variables
export const keyVaultMapping = {
  // Basic Configuration
  // 'PORT': 'PORT',
  'NODEENV': 'NODE_ENV',
  
  // Database
  'MONGOURI': 'MONGO_URI',
  
  // Stream API
  'STREAMAPIKEY': 'STREAM_API_KEY',
  'STREAMAPISECRET': 'STREAM_API_SECRET',
  
  // JWT
  'JWTSECRETKEY': 'JWT_SECRET_KEY',
  
  // Google OAuth
  'GOOGLECLIENTID': 'GOOGLE_CLIENT_ID',
  'GOOGLECLIENTSECRET': 'GOOGLE_CLIENT_SECRET',
  
  // GitHub OAuth
  'GITHUBCLIENTID': 'GITHUB_CLIENT_ID',
  'GITHUBCLIENTSECRET': 'GITHUB_CLIENT_SECRET',
  
  // Session
  'SESSIONSECRET': 'SESSION_SECRET',
  
  // URLs
  'CLIENTURL': 'CLIENT_URL',
  'BACKENDURL': 'BACKEND_URL',
  'FRONTENDURL': 'FRONTEND_URL',
  
  // AI
  'GOOGLEAIAPIKEY': 'GOOGLE_AI_API_KEY',
  
  // Azure Configuration
  // 'USEKEYVAULT': 'USE_KEY_VAULT',
  // 'AZUREKEYVAULTURL': 'AZURE_KEY_VAULT_URL',
  
  // Frontend Environment Variables (VITE)
  'VITESTREAMAPIKEY': 'VITE_STREAM_API_KEY',
  'VITEAPIURL': 'VITE_API_URL',
  'VITEBACKENDURL': 'VITE_BACKEND_URL'
};

// Function to get all Key Vault secret names
export const getAllSecretNames = () => {
  return Object.keys(keyVaultMapping);
};

// Function to convert Key Vault name to environment variable name
export const getEnvVarName = (keyVaultName) => {
  return keyVaultMapping[keyVaultName] || keyVaultName;
};

// Function to get environment variables by category
export const getSecretsByCategory = () => {
  return {
    backend: [
      'PORT',
      'MONGOURI',
      'STREAMAPIKEY', 
      'STREAMAPISECRET',
      'JWTSECRETKEY',
      'NODEENV',
      'GOOGLECLIENTID',
      'GOOGLECLIENTSECRET',
      'GITHUBCLIENTID',
      'GITHUBCLIENTSECRET',
      'SESSIONSECRET',
      'CLIENTURL',
      'BACKENDURL',
      'FRONTENDURL',
      'GOOGLEAIAPIKEY',
      'AZUREKEYVAULTURL'
    ],
    frontend: [
      'VITESTREAMAPIKEY',
      'VITEAPIURL', 
      'VITEBACKENDURL'
    ],
    config: [
      'USEKEYVAULT'
    ]
  };
};

// Helper function to show which secrets you need to add to Azure Key Vault
export const getSecretsToAdd = () => {
  console.log('\n📝 Secrets to add to Azure Key Vault:');
  console.log('=====================================');
  
  Object.entries(keyVaultMapping).forEach(([azureName, envName]) => {
    console.log(`${azureName} → ${envName}`);
  });
  
  console.log('\n💡 Note: Remove underscores from environment variable names when creating secrets in Azure Key Vault');
};
