import { StreamVideoClient } from '@stream-io/video-react-sdk';

class StreamClientManager {
  constructor() {
    this.client = null;
    this.currentUserId = null;
  }

  async getClient(apiKey, user, token) {
    // If client exists for same user, reuse it
    if (this.client && this.currentUserId === user.id) {
      console.log('♻️ Reusing existing Stream client');
      return this.client;
    }

    // Cleanup existing client if user changed
    if (this.client && this.currentUserId !== user.id) {
      console.log('🧹 Cleaning up old Stream client');
      await this.cleanup();
    }

    // Create new client
    console.log('🆕 Creating new Stream client');
    this.client = new StreamVideoClient({
      apiKey,
      user,
      token,
    });

    this.currentUserId = user.id;
    return this.client;
  }

  async cleanup() {
    if (this.client) {
      try {
        await this.client.disconnectUser();
        console.log('✅ Stream client cleaned up');
      } catch (error) {
        console.error('❌ Error cleaning up Stream client:', error);
      }
      this.client = null;
      this.currentUserId = null;
    }
  }
}

export const streamClientManager = new StreamClientManager();
