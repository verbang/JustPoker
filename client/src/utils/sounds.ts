class SoundManager {
  private enabled: boolean = true;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles: Record<string, string> = {
      gamestart: '/sounds/gamestart.mp3',
      deal: '/sounds/deal.mp3',
      bet: '/sounds/bet.mp3',
      raise: '/sounds/raise.mp3',
      allin: '/sounds/allin.mp3',
      fold: '/sounds/fold.mp3',
      win: '/sounds/win.mp3',
      yourTurn: '/sounds/yourTurn.mp3',
      button: '/sounds/button.mp3',
      door: '/sounds/door.mp3',
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(soundName: string) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  stop(soundName: string) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  playGameStart() { this.play('gamestart'); }
  stopGameStart() { this.stop('gamestart'); }
  playDeal() { this.play('deal'); }
  playBet() { this.play('bet'); }
  playRaise() { this.play('raise'); }
  playAllIn() { this.play('allin'); }
  playFold() { this.play('fold'); }
  playWin() { this.play('win'); }
  playYourTurn() { this.play('yourTurn'); }
  playButton() { this.play('button'); }
  playDoor() { this.play('door'); }
}

export const soundManager = new SoundManager();
