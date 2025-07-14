import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { keyVaultMapping, getAllSecretNames, getEnvVarName } from './keyVaultMapping.service.js';

class KeyVaultService {
  constructor() {
    // Don't initialize keyVaultUrl in constructor
    this.keyVaultUrl = null;
    this.credential = null;
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Get the Key Vault URL at initialization time, not in constructor
      this.keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
      
      if (!this.keyVaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL not configured');
      }

      console.log(`🔐 Initializing Key Vault client for: ${this.keyVaultUrl}`);
      
      this.credential = new DefaultAzureCredential();
      this.client = new SecretClient(this.keyVaultUrl, this.credential);
      this.initialized = true;
      
      console.log('🔐 Key Vault client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Key Vault client:', error.message);
      return false;
    }
  }

  async loadAllSecrets() {
    try {
      console.log('🔄 Starting Key Vault initialization...');
      
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        throw new Error('Key Vault initialization failed');
      }

      console.log('🔄 Loading all secrets from Azure Key Vault...');
      
      const secretNames = getAllSecretNames();
      const loadedSecrets = {};
      const failedSecrets = [];

      // Load all secrets
      for (const keyVaultName of secretNames) {
        try {
          console.log(`🔄 Loading ${keyVaultName}...`);
          const secret = await this.client.getSecret(keyVaultName);
          const envVarName = getEnvVarName(keyVaultName);
          
          // Set the environment variable
          process.env[envVarName] = secret.value;
          loadedSecrets[keyVaultName] = envVarName;
          
          console.log(`✅ ${keyVaultName} → ${envVarName}`);
        } catch (error) {
          failedSecrets.push({
            keyVaultName,
            error: error.message
          });
          console.warn(`⚠️ Failed to load ${keyVaultName}:`, error.message);
        }
      }

      // Summary
      console.log(`\n📊 Key Vault Load Summary:`);
      console.log(`✅ Successfully loaded: ${Object.keys(loadedSecrets).length} secrets`);
      console.log(`❌ Failed to load: ${failedSecrets.length} secrets`);
      
      if (failedSecrets.length > 0) {
        console.log(`\n⚠️ Failed secrets:`, failedSecrets.map(f => f.keyVaultName));
      }

      return {
        success: true,
        loadedSecrets,
        failedSecrets,
        totalAttempted: secretNames.length,
        totalLoaded: Object.keys(loadedSecrets).length
      };

    } catch (error) {
      console.error('❌ Failed to load secrets from Key Vault:', error.message);
      return {
        success: false,
        error: error.message,
        loadedSecrets: {},
        failedSecrets: [],
        totalAttempted: 0,
        totalLoaded: 0
      };
    }
  }

  async getSecret(secretName) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const secret = await this.client.getSecret(secretName);
      return secret.value;
    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error.message);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult) {
          return { status: 'not_initialized', message: 'Key Vault client initialization failed' };
        }
      }

      // Try to list secrets (minimal operation to test connectivity)
      const secretsIterator = this.client.listPropertiesOfSecrets();
      await secretsIterator.next();
      
      return { status: 'healthy', message: 'Key Vault connection successful' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

export default new KeyVaultService();
