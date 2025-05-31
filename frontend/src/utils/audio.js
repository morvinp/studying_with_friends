export const playMentionSound = () => {
  try {
    // Option 1: Use a sound file
    const audio = new Audio('mention.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (error) {
    console.error('Error playing mention sound:', error);
    }
};
