class SoundManager {
  private enabled: boolean = true;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles: Record<string, string> = {
      join: '/sounds/join.mp3',
      leave: '/sounds/leave.mp3',
      deal: '/sounds/deal.mp3',
      flip: '/sounds/flip.mp3',
      bet: '/sounds/bet.mp3',
      fold: '/sounds/fold.mp3',
      emoji: '/sounds/emoji.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      yourTurn: '/sounds/your-turn.mp3',
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

  playJoin() { this.play('join'); }
  playLeave() { this.play('leave'); }
  playDeal() { this.play('deal'); }
  playFlip() { this.play('flip'); }
  playBet() { this.play('bet'); }
  playFold() { this.play('fold'); }
  playEmoji() { this.play('emoji'); }
  playWin() { this.play('win'); }
  playLose() { this.play('lose'); }
  playYourTurn() { this.play('yourTurn'); }
}

export const soundManager = new SoundManager();
