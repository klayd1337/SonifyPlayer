const API_BASE_URL = "http://localhost:3000/api";

class YandexMusicPlayer {
  constructor() {
    this.currentTrack = null;
    this.isPlaying = false;
    this.audio = null;
    this.volume = 0.7;
    this.playlist = [];
    this.currentIndex = -1;
    this.isDarkTheme = true;
    this.isTransparent = true;
    this.transparencyLevel = 92; // 0-100
    this.visualizerEnabled = false;
    this.visualizerMode = "bars"; // 'bars', 'circle', 'wave'
    this.visualizerSensitivity = 50;
    this.visualizerInterval = null;
    this.isInitialized = false;
    this.progressInterval = null;
    this.isRadioMode = false;
    this.currentRadioStation = null;
    this.currentBatchId = null;
    this.isPreloading = false;
    this.preloadTracks = [];
    this.nextBatchId = null;
    this.radioStationName = "";
  }

  // === ИНИЦИАЛИЗАЦИЯ ===
  async initialize() {
    if (this.isInitialized) return;

    this.showNotification("🎵 Запуск плеера...", "info", 2000);
    await this.sleep(1000);

    try {
      await this.loadMyWave();
      this.isInitialized = true;
      console.log('✅ Плеер инициализирован, "Моя волна" загружена');
    } catch (error) {
      console.error("Ошибка инициализации:", error);
      this.showNotification('⚠️ Не удалось загрузить "Мою волну"', "error");
    }
  }

  // === API МЕТОДЫ ===
  async searchTracks(query) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?query=${encodeURIComponent(query)}`,
      );
      return await response.json();
    } catch (error) {
      console.error("Search error:", error);
      return { tracks: [] };
    }
  }

  async getLikedTracks() {
    try {
      const response = await fetch(`${API_BASE_URL}/liked`);
      return await response.json();
    } catch (error) {
      console.error("Error getting liked tracks:", error);
      return [];
    }
  }

  async getCharts() {
    try {
      const response = await fetch(`${API_BASE_URL}/charts`);
      return await response.json();
    } catch (error) {
      console.error("Error getting charts:", error);
      return { tracks: [] };
    }
  }

  async generateRadio() {
    try {
      const response = await fetch(`${API_BASE_URL}/generate_radio`);
      return await response.json();
    } catch (error) {
      console.error("Error generating radio:", error);
      return { tracks: [] };
    }
  }

  // === ВОСПРОИЗВЕДЕНИЕ ===
  async playTrack(track) {
    if (!track || !track.direct_link) {
      console.error("No direct link available");
      return;
    }

    // Останавливаем текущее воспроизведение
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    this.currentTrack = track;
    this.updateTrackInfo();

    try {
      // Создаем Audio объект
      this.audio = new Audio(track.direct_link);
      this.audio.volume = this.volume;
      this.audio.preload = "auto";

      // События
      this.audio.addEventListener("loadeddata", () => {
        console.log("Track loaded:", track.title);
        const totalTimeEl = document.getElementById("totalTime");
        if (totalTimeEl) {
          totalTimeEl.textContent = this.formatTime(track.duration);
        }
      });

      this.audio.addEventListener("play", () => {
        this.isPlaying = true;
        this.updatePlayButton();
        this.startProgressUpdate();
      });

      this.audio.addEventListener("pause", () => {
        this.isPlaying = false;
        this.updatePlayButton();
      });

      this.audio.addEventListener("ended", () => {
        this.playNext();
      });

      this.audio.addEventListener("timeupdate", () => {
        this.updateProgress();
      });

      // Начинаем воспроизведение
      await this.audio.play();
    } catch (error) {
      console.error("Playback error:", error);
      this.showNotification(
        "Ошибка воспроизведения: " + error.message,
        "error",
      );
    }
  }

  async playTrackByIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      const track = this.playlist[index];
      await this.playTrack(track);
    }
  }

  // === УПРАВЛЕНИЕ ===
  togglePlay() {
    if (!this.audio) {
      if (this.currentTrack) {
        this.playTrack(this.currentTrack);
      }
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play();
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;

    const nextIndex = (this.currentIndex + 1) % this.playlist.length;
    this.currentIndex = nextIndex;
    this.playTrack(this.playlist[nextIndex]);
  }

  playPrevious() {
    if (this.playlist.length === 0) return;

    const prevIndex =
      this.currentIndex <= 0 ? this.playlist.length - 1 : this.currentIndex - 1;
    this.currentIndex = prevIndex;
    this.playTrack(this.playlist[prevIndex]);
  }

  setVolume(value) {
    this.volume = value / 100;
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    this.updateVolumeIcon();
  }

  seekTo(percent) {
    if (!this.audio || !this.currentTrack) return;

    const time = (this.currentTrack.duration * percent) / 100;
    this.audio.currentTime = time;
  }

  // === ЗАГРУЗКА ТРЕКОВ ===
  async loadMyWave() {
    this.showLoadingNotification(
      "Подключение к Яндекс.Музыке...",
      'Запуск "Моей волны"',
    );

    try {
      const radioData = await this.generateRadio();

      if (radioData.tracks && radioData.tracks.length > 0) {
        this.updateLoadingNotification(
          "Загрузка треков...",
          `Найдено ${radioData.tracks.length} треков`,
        );
        await this.sleep(500);

        this.playlist = radioData.tracks;
        this.currentIndex = 0;

        this.updateLoadingNotification(
          "Воспроизведение...",
          "Запуск моей волны",
        );
        await this.sleep(300);

        await this.playTrackByIndex(0);

        this.hideLoadingNotification();
        this.showNotification('🎧 "Моя волна" запущена', "success", 3000);
      } else {
        this.hideLoadingNotification();
        this.showNotification('Не удалось загрузить "Мою волну"', "error");
      }
    } catch (error) {
      console.error('Ошибка загрузки "Моей волны":', error);
      this.hideLoadingNotification();
      this.showNotification('Ошибка загрузки "Моей волны"', "error");

      // Пробуем загрузить чарты как запасной вариант
      await this.loadChartsAsFallback();
    }
  }

  async loadChartsAsFallback() {
    try {
      this.showNotification("Загружаем популярные треки...", "info", 2000);

      const charts = await this.getCharts();
      if (charts.tracks && charts.tracks.length > 0) {
        this.playlist = charts.tracks;
        this.currentIndex = 0;
        await this.playTrackByIndex(0);
        this.showNotification("🎵 Популярные треки загружены", "success");
      }
    } catch (error) {
      console.error("Ошибка загрузки чартов:", error);
    }
  }

  async loadLikedTracksSimple() {
    this.showLoadingNotification(
      "Подключение к серверу...",
      'Загрузка "Мне нравится"',
    );

    try {
      this.updateLoadingNotification(
        "Получение списка треков...",
        "Подождите немного",
      );

      const likedTracks = await this.getLikedTracks();

      if (likedTracks.length > 0) {
        this.playlist = likedTracks;
        this.currentIndex = 0;

        await this.playTrackByIndex(0);

        const badge = document.getElementById("likedCount");
        if (badge) {
          badge.textContent =
            likedTracks.length > 99 ? "99+" : likedTracks.length;
        }
        this.showNotification(
          `❤️  Загружено ${likedTracks.length} треков из "Мне нравится"`,
          "success",
          2000,
        );
      } else {
        this.hideLoadingNotification();
        this.showNotification('В "Мне нравится" нет треков', "info");
      }
    } catch (error) {
      console.error('Ошибка загрузки "Мне нравится":', error);
      this.hideLoadingNotification();
      this.showNotification("Ошибка загрузки треков", "error", 2000);
    }
  }

  // === ТЕМЫ И ВНЕШНИЙ ВИД ===
  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle("light-theme", !this.isDarkTheme);

    // Обновляем иконку в настройках
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      const icon = themeBtn.querySelector("i");
      const text = themeBtn.querySelector("span");

      if (icon) {
        icon.className = this.isDarkTheme ? "fas fa-moon" : "fas fa-sun";
      }
      if (text) {
        text.textContent = this.isDarkTheme ? "Темная тема" : "Светлая тема";
      }
    }

    localStorage.setItem("theme", this.isDarkTheme ? "dark" : "light");
    this.showNotification(
      this.isDarkTheme ? "🌙 Темная тема" : "☀️ Светлая тема",
      "info",
      2000,
    );

    // Применяем прозрачность с новой темой
    this.applyTransparency();
  }

  toggleTransparency() {
    this.isTransparent = !this.isTransparent;

    // Обновляем иконку в настройках
    const transparencyBtn = document.getElementById("transparencyBtn");
    if (transparencyBtn) {
      transparencyBtn.classList.toggle("active", this.isTransparent);
    }

    this.applyTransparency();
    localStorage.setItem("transparency", this.isTransparent.toString());

    this.showNotification(
      this.isTransparent
        ? "🔮 Прозрачность включена"
        : "⬜ Прозрачность выключена",
      "info",
      2000,
    );
  }

  applyTransparency() {
    const player = document.querySelector(".player");
    if (!player) return;

    if (this.isTransparent) {
      const opacity = this.transparencyLevel / 100;
      player.style.background = this.isDarkTheme
        ? `rgba(15, 23, 42, ${opacity})`
        : `rgba(255, 255, 255, ${opacity})`;
      player.style.backdropFilter = "blur(20px)";
    } else {
      player.style.background = this.isDarkTheme
        ? "rgba(15, 23, 42, 1)"
        : "rgba(255, 255, 255, 1)";
      player.style.backdropFilter = "none";
    }
  }

  setTransparencyLevel(value) {
    this.transparencyLevel = value;
    if (this.isTransparent) {
      this.applyTransparency();
    }
    localStorage.setItem("transparencyLevel", value.toString());
  }

  // === ВИЗУАЛИЗАТОР ===
  toggleVisualizer() {
    this.visualizerEnabled = !this.visualizerEnabled;

    // Обновляем кнопку в настройках
    const visualizerBtn = document.getElementById("visualizerToggleBtn");
    if (visualizerBtn) {
      visualizerBtn.classList.toggle("active", this.visualizerEnabled);
      const text = visualizerBtn.querySelector("span");
      if (text) {
        text.textContent = this.visualizerEnabled ? "Выключить" : "Включить";
      }
    }

    // Показываем/скрываем визуализатор
    const visualizerContainer = document.getElementById("visualizerContainer");
    if (visualizerContainer) {
      visualizerContainer.classList.toggle("show", this.visualizerEnabled);
    }

    if (this.visualizerEnabled) {
      this.startVisualizer();
      this.showNotification("🌈 Визуализатор включен", "info", 2000);
    } else {
      this.stopVisualizer();
      this.showNotification("🌈 Визуализатор выключен", "info", 2000);
    }

    localStorage.setItem(
      "visualizerEnabled",
      this.visualizerEnabled.toString(),
    );
  }

  startVisualizer() {
    this.stopVisualizer();

    // Создаем бары визуализатора
    const visualizer = document.getElementById("visualizer");
    if (!visualizer) return;

    visualizer.innerHTML = "";
    const barCount = this.visualizerMode === "circle" ? 36 : 40;

    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className = "visualizer-bar";
      bar.style.height = "2px";
      visualizer.appendChild(bar);
    }

    // Запускаем анимацию
    if (this.visualizerMode === "circle") {
      this.visualizerInterval = setInterval(
        () => this.updateCircleVisualizer(),
        100,
      );
    } else {
      this.visualizerInterval = setInterval(() => this.updateVisualizer(), 100);
    }
  }

  stopVisualizer() {
    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }
  }

  updateVisualizer() {
    const bars = document.querySelectorAll(".visualizer-bar");
    if (!bars.length || !this.audio || !this.isPlaying) return;

    // Получаем данные о громкости
    const volume = this.audio.volume;
    const baseHeight = 5 + volume * 20;

    bars.forEach((bar, i) => {
      // Создаем волновой эффект
      const time = Date.now() / 1000;
      const wave = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
      const random = Math.random() * 0.3 + 0.7;
      const sensitivity = this.visualizerSensitivity / 100;

      const height = baseHeight + wave * random * 30 * sensitivity;
      bar.style.height = `${height}px`;

      // Цветовой градиент
      const hue = (i * 10 + time * 50) % 360;
      bar.style.background =
        this.visualizerMode === "wave"
          ? `linear-gradient(to top, hsl(${hue}, 80%, 60%), hsl(${hue + 30}, 80%, 40%))`
          : `linear-gradient(to top, var(--primary), var(--primary-dark))`;
    });
  }

  updateCircleVisualizer() {
    const bars = document.querySelectorAll(".visualizer-bar");
    if (!bars.length) return;

    const time = Date.now() / 1000;

    bars.forEach((bar, i) => {
      const angle = (i / bars.length) * Math.PI * 2;
      const wave = Math.sin(time * 3 + angle) * 0.5 + 0.5;
      const height = 5 + wave * 30 * (this.visualizerSensitivity / 100);

      bar.style.height = `${height}px`;
      bar.style.transform = `rotate(${angle}rad) translateY(-${height / 2}px)`;
    });
  }

  setVisualizerMode(mode) {
    this.visualizerMode = mode;
    if (this.visualizerEnabled) {
      this.startVisualizer();
    }
    localStorage.setItem("visualizerMode", mode);
  }

  setVisualizerSensitivity(value) {
    this.visualizerSensitivity = value;
    localStorage.setItem("visualizerSensitivity", value.toString());
  }

  // === UI ОБНОВЛЕНИЕ ===
  updateTrackInfo() {
    if (!this.currentTrack) return;

    const titleEl = document.getElementById("trackTitle");
    const artistEl = document.getElementById("trackArtist");
    const coverEl = document.getElementById("albumArt");

    if (titleEl) titleEl.textContent = this.currentTrack.title;
    if (artistEl) artistEl.textContent = this.currentTrack.artists.join(", ");

    if (coverEl && this.currentTrack.cover_url) {
      coverEl.innerHTML = `<img src="${this.currentTrack.cover_url}" alt="${this.currentTrack.title}">`;
    }
  }

  updatePlayButton() {
    const playIcon = document.getElementById("playIcon");
    if (playIcon) {
      playIcon.className = this.isPlaying ? "fas fa-pause" : "fas fa-play";
    }
  }

  updateVolumeIcon() {
    const icon = document.getElementById("volumeIcon");
    if (!icon) return;

    if (this.volume === 0) {
      icon.className = "fas fa-volume-mute";
    } else if (this.volume < 0.5) {
      icon.className = "fas fa-volume-down";
    } else {
      icon.className = "fas fa-volume-up";
    }
  }

  updateProgress() {
    if (!this.audio || !this.currentTrack) return;

    const currentTime = this.audio.currentTime;
    const percent = (currentTime / this.currentTrack.duration) * 100;

    const progressFill = document.getElementById("progressFill");
    const currentTimeEl = document.getElementById("currentTime");

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (currentTimeEl) currentTimeEl.textContent = this.formatTime(currentTime);
  }

  startProgressUpdate() {
    this.stopProgressUpdate();
    this.progressInterval = setInterval(() => this.updateProgress(), 1000);
  }

  stopProgressUpdate() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // === УВЕДОМЛЕНИЯ ===
  showNotification(message, type = "info", duration = 4000) {
    // Удаляем старое уведомление если есть
    const oldNotification = document.querySelector(".notification.show");
    if (oldNotification) {
      oldNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement("div");
    notification.className = `notification show`;

    const icon =
      type === "error"
        ? "fas fa-exclamation-circle"
        : type === "success"
          ? "fas fa-check-circle"
          : "fas fa-info-circle";

    notification.innerHTML = `
      <div class="notification-content">
        <i class="${icon} notification-icon"></i>
        <div class="notification-text">${message}</div>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Закрытие по кнопке
    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
      });

    // Автоматическое закрытие
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.classList.remove("show");
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
  }

  showLoadingNotification(message, submessage = "") {
    this.hideLoadingNotification();

    const loading = document.createElement("div");
    loading.className = "loading-notification show";
    loading.id = "loadingNotification";

    loading.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">${message}</div>
      <div class="loading-submessage">${submessage}</div>
    `;

    document.body.appendChild(loading);
  }

  updateLoadingNotification(message, submessage = "") {
    const loading = document.getElementById("loadingNotification");
    if (loading) {
      const messageEl = loading.querySelector(".loading-message");
      const submessageEl = loading.querySelector(".loading-submessage");

      if (messageEl && message) messageEl.textContent = message;
      if (submessageEl && submessage) submessageEl.textContent = submessage;
    }
  }

  hideLoadingNotification() {
    const loading = document.getElementById("loadingNotification");
    if (loading) {
      loading.classList.remove("show");
      setTimeout(() => {
        if (loading.parentNode) loading.remove();
      }, 300);
    }
  }

  // === НАСТРОЙКИ ===
  loadSettings() {
    // Тема
    const savedTheme = localStorage.getItem("theme");
    this.isDarkTheme = savedTheme !== "light";

    // Прозрачность
    const savedTransparency = localStorage.getItem("transparency");
    this.isTransparent = savedTransparency !== "false";

    const savedTransparencyLevel = localStorage.getItem("transparencyLevel");
    if (savedTransparencyLevel) {
      this.transparencyLevel = parseInt(savedTransparencyLevel);
    }

    // Визуализатор
    const savedVisualizer = localStorage.getItem("visualizerEnabled");
    this.visualizerEnabled = savedVisualizer === "true";

    const savedVisualizerMode = localStorage.getItem("visualizerMode");
    if (savedVisualizerMode) {
      this.visualizerMode = savedVisualizerMode;
    }

    const savedSensitivity = localStorage.getItem("visualizerSensitivity");
    if (savedSensitivity) {
      this.visualizerSensitivity = parseInt(savedSensitivity);
    }

    // Применяем настройки
    this.applyAllSettings();
  }

  applyAllSettings() {
    // Применяем тему
    if (!this.isDarkTheme) {
      document.body.classList.add("light-theme");
    }

    // Обновляем иконки в настройках
    this.updateSettingsButtons();

    // Применяем прозрачность
    this.applyTransparency();

    // Применяем визуализатор
    if (this.visualizerEnabled) {
      this.startVisualizer();
    }

    // Устанавливаем значения слайдеров
    const transparencySlider = document.getElementById("transparencySlider");
    if (transparencySlider) {
      transparencySlider.value = this.transparencyLevel;
    }

    const sensitivitySlider = document.getElementById("visualizerSensitivity");
    if (sensitivitySlider) {
      sensitivitySlider.value = this.visualizerSensitivity;
    }
  }

  updateSettingsButtons() {
    // Тема
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      const icon = themeBtn.querySelector("i");
      const text = themeBtn.querySelector("span");
      if (icon) {
        icon.className = this.isDarkTheme ? "fas fa-moon" : "fas fa-sun";
      }
      if (text) {
        text.textContent = this.isDarkTheme ? "Темная тема" : "Светлая тема";
      }
    }

    // Прозрачность
    const transparencyBtn = document.getElementById("transparencyBtn");
    if (transparencyBtn) {
      transparencyBtn.classList.toggle("active", this.isTransparent);
    }

    // Визуализатор
    const visualizerBtn = document.getElementById("visualizerToggleBtn");
    if (visualizerBtn) {
      visualizerBtn.classList.toggle("active", this.visualizerEnabled);
      const text = visualizerBtn.querySelector("span");
      if (text) {
        text.textContent = this.visualizerEnabled ? "Выключить" : "Включить";
      }
    }
  }

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Создаем глобальный экземпляр плеера
window.musicPlayer = new YandexMusicPlayer();
