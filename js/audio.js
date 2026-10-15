// Hệ thống âm thanh Web Audio API thuần cho game Tiệm Mì Cay Cozy
// Tự tạo giai điệu Lo-fi ấm cúng & hiệu ứng xèo xèo, bốc khói, chuông đón khách, ting ting tiền xu mà không cần tải file MP3 ngoài!

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.5;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.isPlayingBgm = false;
    this.bgmInterval = null;
    this.chordIndex = 0;

    // Các hợp âm ấm áp phong cách Lofi anime cozy (Cmaj7, Am7, Dm7, G7)
    this.lofiChords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
      [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
      [293.66, 349.23, 440.00, 523.25], // Dm7 (D4, F4, A4, C5)
      [196.00, 246.94, 293.66, 349.23], // G7 (G3, B3, D4, F4)
      [220.00, 293.66, 349.23, 440.00], // Fmaj7 inv
      [329.63, 392.00, 493.88, 587.33]  // Em7
    ];

    this.loadSettings();
  }

  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  loadSettings() {
    const saved = localStorage.getItem("mycay_sound_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.bgmVolume = parsed.bgmVolume ?? 0.35;
        this.sfxVolume = parsed.sfxVolume ?? 0.5;
        this.bgmEnabled = parsed.bgmEnabled ?? true;
        this.sfxEnabled = parsed.sfxEnabled ?? true;
      } catch (e) {
        console.error("Lỗi đọc cài đặt âm thanh:", e);
      }
    }
  }

  saveSettings() {
    const data = {
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      bgmEnabled: this.bgmEnabled,
      sfxEnabled: this.sfxEnabled
    };
    localStorage.setItem("mycay_sound_settings", JSON.stringify(data));
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    this.saveSettings();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.saveSettings();
  }

  toggleBgm(state) {
    this.bgmEnabled = state !== undefined ? state : !this.bgmEnabled;
    this.saveSettings();
    if (!this.bgmEnabled) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmEnabled;
  }

  toggleSfx(state) {
    this.sfxEnabled = state !== undefined ? state : !this.sfxEnabled;
    this.saveSettings();
    return this.sfxEnabled;
  }

  // Phát nhạc nền Lofi thư giãn, ấm áp
  startBgm() {
    if (!this.bgmEnabled || this.isPlayingBgm) return;
    this.initContext();
    if (!this.ctx) return;

    this.isPlayingBgm = true;
    let step = 0;

    const playNextBeat = () => {
      if (!this.isPlayingBgm || !this.bgmEnabled) return;
      
      const chord = this.lofiChords[this.chordIndex];
      const freq = chord[step % chord.length];

      // Âm bass nhẹ nhàng
      if (step === 0) {
        this.playSoftTone(chord[0] / 2, 1.8, "triangle", this.bgmVolume * 0.3);
      }

      // Nốt arpeggio lofi êm ái
      this.playSoftTone(freq, 0.8, "sine", this.bgmVolume * 0.25);

      step = (step + 1) % 4;
      if (step === 0) {
        this.chordIndex = (this.chordIndex + 1) % this.lofiChords.length;
      }
    };

    // Chu kỳ 680ms mỗi nốt nhạc chậm rãi, thư giãn
    playNextBeat();
    this.bgmInterval = setInterval(playNextBeat, 680);
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playSoftTone(freq, duration, type = "sine", gainVal = 0.2) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Bỏ qua lỗi audio state
    }
  }

  // SFX: Tiếng chuông cửa đón khách (Ding-dong ấm cúng)
  playDoorBell() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.setValueAtTime(880.00, now + 0.15); // A5

    gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);
  }

  // SFX: Tiếng xèo xèo nấu mì cay sôi sùng sục
  playCookingSizzle() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Tạo tiếng bong bóng nước sôi
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const bubbleTime = now + i * 0.08;

      osc.type = "sine";
      osc.frequency.setValueAtTime(300 + Math.random() * 200, bubbleTime);
      osc.frequency.exponentialRampToValueAtTime(700 + Math.random() * 200, bubbleTime + 0.06);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, bubbleTime);
      gain.gain.exponentialRampToValueAtTime(0.001, bubbleTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(bubbleTime);
      osc.stop(bubbleTime + 0.08);
    }
  }

  // SFX: Tiếng hoàn thành món mì / Ting ting tiền thưởng
  playCoinChime() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [987.77, 1318.51]; // B5, E6
    notes.forEach((freq, idx) => {
      const time = this.ctx.currentTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.35);
    });
  }

  // SFX: Tiếng thông báo Review mới hoặc khách phản hồi
  playReviewChime() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - C
    chords.forEach((freq, idx) => {
      const time = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.45);
    });
  }

  // SFX: Tiếng click nút bấm nảy cute
  playButtonClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // SFX: Tiếng lắc bình shaker trà sữa rộn rã
  playShakerSound() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const shakeTime = now + i * 0.07;

      osc.type = "sine";
      osc.frequency.setValueAtTime(450 + Math.random() * 150, shakeTime);
      osc.frequency.exponentialRampToValueAtTime(250 + Math.random() * 100, shakeTime + 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.28, shakeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, shakeTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(shakeTime);
      osc.stop(shakeTime + 0.06);
    }
  }

  // SFX: Tiếng đóng gói thùng xốp & dán băng keo niêm phong ly trà sữa
  playPackagingSound() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Âm thanh miết băng keo rẹt rẹt
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);

    // Tiếng 'tách' dập niêm phong
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    clickOsc.type = "sine";
    clickOsc.frequency.setValueAtTime(1200, now + 0.15);
    clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.22);

    clickGain.gain.setValueAtTime(this.sfxVolume * 0.35, now + 0.15);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);

    clickOsc.start(now + 0.15);
    clickOsc.stop(now + 0.24);
  }
}
