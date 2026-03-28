/**
 * TRIAGE AI — Input Handler
 * Manages multi-modal input: text, voice, camera, file upload
 */

const InputHandler = {
  currentImage: null,
  isRecording: false,
  recognition: null,
  mediaStream: null,

  /** Initialize all input handlers */
  init() {
    this.setupTextInput();
    this.setupVoiceInput();
    this.setupCameraInput();
    this.setupFileInput();
    this.setupDragDrop();
  },

  /** Get current input state */
  getInput() {
    const textEl = document.getElementById('main-input');
    return {
      text: textEl?.value?.trim() || '',
      image: this.currentImage,
      inputType: this.currentImage ? 'camera' : 'text',
    };
  },

  /** Clear all inputs */
  clear() {
    const textEl = document.getElementById('main-input');
    if (textEl) {
      textEl.value = '';
      this.autoResize(textEl);
    }
    this.removeImage();
  },

  /** Set text input */
  setText(text) {
    const textEl = document.getElementById('main-input');
    if (textEl) {
      textEl.value = text;
      this.autoResize(textEl);
      textEl.focus();
    }
  },

  // ── Text Input ───────────────────────────────────────────────────

  setupTextInput() {
    const textEl = document.getElementById('main-input');
    if (!textEl) return;

    textEl.addEventListener('input', () => this.autoResize(textEl));
    textEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('btn-submit')?.click();
      }
    });
  },

  autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  },

  // ── Voice Input ──────────────────────────────────────────────────

  setupVoiceInput() {
    const btnVoice = document.getElementById('btn-voice');
    const btnStop = document.getElementById('btn-stop-voice');
    if (!btnVoice) return;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnVoice.title = 'Voice input not supported in this browser';
      btnVoice.disabled = true;
      btnVoice.style.opacity = '0.3';
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const textEl = document.getElementById('main-input');
      if (textEl) {
        textEl.value = transcript;
        this.autoResize(textEl);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopVoice();
      if (event.error === 'not-allowed') {
        App.showToast('Microphone access denied. Please allow microphone permission.', 'error');
      }
    };

    this.recognition.onend = () => {
      this.stopVoice();
    };

    btnVoice.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopVoice();
      } else {
        this.startVoice();
      }
    });

    btnStop?.addEventListener('click', () => {
      this.stopVoice();
    });
  },

  startVoice() {
    if (!this.recognition) return;

    try {
      this.recognition.start();
      this.isRecording = true;

      const btnVoice = document.getElementById('btn-voice');
      const indicator = document.getElementById('voice-indicator');
      btnVoice?.classList.add('active');
      if (indicator) indicator.hidden = false;

      A11y.announce('Voice recording started. Speak now.');
    } catch (error) {
      console.error('Failed to start voice:', error);
      App.showToast('Failed to start voice input. Please try again.', 'error');
    }
  },

  stopVoice() {
    if (this.recognition && this.isRecording) {
      try { this.recognition.stop(); } catch {}
    }
    this.isRecording = false;

    const btnVoice = document.getElementById('btn-voice');
    const indicator = document.getElementById('voice-indicator');
    btnVoice?.classList.remove('active');
    if (indicator) indicator.hidden = true;

    A11y.announce('Voice recording stopped.');
  },

  // ── Camera Input ─────────────────────────────────────────────────

  setupCameraInput() {
    const btnCamera = document.getElementById('btn-camera');
    const btnCapture = document.getElementById('btn-capture');
    const btnClose = document.getElementById('btn-close-camera');

    if (!btnCamera) return;

    btnCamera.addEventListener('click', () => this.openCamera());
    btnCapture?.addEventListener('click', () => this.capturePhoto());
    btnClose?.addEventListener('click', () => this.closeCamera());
  },

  async openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    if (!modal || !video) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      video.srcObject = this.mediaStream;
      modal.hidden = false;
      A11y.announce('Camera opened. Point at the subject and press capture.');
    } catch (error) {
      console.error('Camera error:', error);
      App.showToast('Camera access denied. Please allow camera permission.', 'error');
    }
  },

  capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    this.setImage(imageData);
    this.closeCamera();

    A11y.announce('Photo captured successfully.');
  },

  closeCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (video) video.srcObject = null;
    if (modal) modal.hidden = true;
  },

  // ── File Upload ──────────────────────────────────────────────────

  setupFileInput() {
    const btnUpload = document.getElementById('btn-upload');
    const fileInput = document.getElementById('file-input');
    const btnRemove = document.getElementById('btn-remove-img');

    if (!btnUpload || !fileInput) return;

    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    btnRemove?.addEventListener('click', () => this.removeImage());
  },

  async handleFile(file) {
    if (!file) return;

    // Image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.setImage(e.target.result);
        A11y.announce(`Image uploaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      this.setText(text);
      A11y.announce(`Text file loaded: ${file.name}`);
      return;
    }

    // Other files — read as text if possible
    try {
      const text = await file.text();
      this.setText(text);
      A11y.announce(`File loaded: ${file.name}`);
    } catch {
      App.showToast('Unsupported file type. Please use images or text files.', 'error');
    }
  },

  setImage(dataUrl) {
    this.currentImage = dataUrl;
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    if (preview && img) {
      img.src = dataUrl;
      preview.hidden = false;
    }
  },

  removeImage() {
    this.currentImage = null;
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    const fileInput = document.getElementById('file-input');
    if (preview) preview.hidden = true;
    if (img) img.src = '';
    if (fileInput) fileInput.value = '';
    A11y.announce('Image removed.');
  },

  // ── Drag & Drop ──────────────────────────────────────────────────

  setupDragDrop() {
    const zone = document.getElementById('input-zone');
    const dropOverlay = document.getElementById('drop-zone');
    if (!zone || !dropOverlay) return;

    let dragCounter = 0;

    zone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      dropOverlay.hidden = false;
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.hidden = true;
      }
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.hidden = true;

      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });
  },
};
