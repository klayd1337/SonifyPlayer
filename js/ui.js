document.addEventListener("DOMContentLoaded", () => {
  // === ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ ===
  const elements = {
    // Управление окном
    minimizeBtn: document.getElementById("minimizeBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    closeBtn: document.getElementById("closeBtn"),

    // Плеер
    playBtn: document.getElementById("playBtn"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    volumeBtn: document.getElementById("volumeBtn"),
    volumeSlider: document.getElementById("volumeSlider"), // Используем существующий слайдер
    volumeSliderContainer: null,
    progressBar: document.getElementById("progressBar"),
    searchInput: document.getElementById("searchInput"),

    // Панель настроек
    settingsPanel: document.getElementById("settingsPanel"),
    closeSettingsBtn: document.getElementById("closeSettings"),

    // Настройки темы
    themeBtn: document.getElementById("themeBtn"),
    transparencyBtn: document.getElementById("transparencyBtn"),
    transparencySlider: document.getElementById("transparencySlider"),
    transparencyValue: null,

    // Визуализатор
    visualizerToggleBtn: document.getElementById("visualizerToggleBtn"),
    visualizerModeBtn: document.getElementById("visualizerModeBtn"),
    visualizerSensitivity: document.getElementById("visualizerSensitivity"),
    visualizerSensitivityValue: null,

    // Кнопки действий
    loadMyWaveBtn: document.getElementById("loadMyWaveBtn"),
    loadLikedBtn: document.getElementById("loadLikedBtn"),

    // Быстрые кнопки
    quickLikedBtn: document.getElementById("quickLikedBtn"),
    quickPlaylistsBtn: document.getElementById("quickPlaylistsBtn"),

    // Уведомления
    notification: document.getElementById("notification"),
    notificationText: document.getElementById("notificationText"),

    // Дополнительные элементы из HTML
    progressFill: document.getElementById("progressFill"),
    currentTime: document.getElementById("currentTime"),
    totalTime: document.getElementById("totalTime"),
    trackTitle: document.getElementById("trackTitle"),
    trackArtist: document.getElementById("trackArtist"),
    visualizerContainer: document.getElementById("visualizerContainer"),
    visualizerModeBtn2: document.getElementById("visualizerModeBtn2"),
    likedCount: document.getElementById("likedCount"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingText: document.getElementById("loadingText"),
    loadingBar: document.getElementById("loadingBar"),
    audioQuality: document.getElementById("audioQuality"),
    autoStart: document.getElementById("autoStart"),
    apiKey: document.getElementById("apiKey"),
    saveSettings: document.getElementById("saveSettings"),
    tracksList: document.getElementById("tracksList")
  };

  // === ФУНКЦИЯ СОЗДАНИЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ ===
  function createDynamicElements() {
    // Создаем всплывающий слайдер громкости только если его еще нет
    if (elements.volumeBtn && !document.querySelector('.volume-slider-wrapper')) {
      elements.volumeSliderContainer = document.createElement("div");
      elements.volumeSliderContainer.className = "volume-slider-wrapper";
      elements.volumeSliderContainer.innerHTML = `
        <div class="volume-value-display" id="volumeValueDisplay">${elements.volumeSlider ? elements.volumeSlider.value : 70}%</div>
        <input type="range" min="0" max="100" value="${elements.volumeSlider ? elements.volumeSlider.value : 70}" class="volume-slider-horizontal" />
      `;

      const volumeControl = document.querySelector(".volume-control");
      if (volumeControl) {
        // Добавляем контейнер со слайдером
        volumeControl.appendChild(elements.volumeSliderContainer);
        
        // Получаем ссылки на созданные элементы
        const popupSlider = elements.volumeSliderContainer.querySelector(
          ".volume-slider-horizontal",
        );
        const volumeValueDisplay = elements.volumeSliderContainer.querySelector(
          "#volumeValueDisplay",
        );

        if (popupSlider && volumeValueDisplay) {
          // Синхронизируем всплывающий слайдер с основным
          if (elements.volumeSlider) {
            popupSlider.value = elements.volumeSlider.value;
            volumeValueDisplay.textContent = `${elements.volumeSlider.value}%`;
            updateVolumeIcon(elements.volumeSlider.value);
          }

          // Обработчик изменения громкости во всплывающем слайдере
          popupSlider.addEventListener("input", (e) => {
            if (window.musicPlayer) {
              const value = e.target.value;
              window.musicPlayer.setVolume(value);
              volumeValueDisplay.textContent = `${value}%`;
              updateVolumeIcon(value);
              
              // Синхронизируем с основным слайдером
              if (elements.volumeSlider) {
                elements.volumeSlider.value = value;
              }
            }
          });
        }
      }
    } else {
      // Используем существующий контейнер
      elements.volumeSliderContainer = document.querySelector('.volume-slider-wrapper');
    }

    // Добавляем числовые значения к слайдерам в настройках
    const visualizerSensitivityGroup = document.querySelector(
      ".settings-group:nth-child(3) .settings-slider",
    );
    if (visualizerSensitivityGroup && elements.visualizerSensitivity) {
      elements.visualizerSensitivityValue = document.createElement("span");
      elements.visualizerSensitivityValue.className = "slider-value";
      elements.visualizerSensitivityValue.textContent = `${elements.visualizerSensitivity.value}%`;
      visualizerSensitivityGroup.appendChild(
        elements.visualizerSensitivityValue,
      );
    }

    const transparencyGroup = document.querySelector(
      ".settings-group:nth-child(4) .settings-slider",
    );
    if (transparencyGroup && elements.transparencySlider) {
      elements.transparencyValue = document.createElement("span");
      elements.transparencyValue.className = "slider-value";
      elements.transparencyValue.textContent = `${elements.transparencySlider.value}%`;
      transparencyGroup.appendChild(elements.transparencyValue);
    }
  }

  // Функция обновления иконки громкости
  function updateVolumeIcon(value) {
    if (!elements.volumeBtn) return;

    const icon = elements.volumeBtn.querySelector("i");
    if (!icon) return;

    const volume = parseInt(value);

    if (volume === 0) {
      icon.className = "fas fa-volume-mute";
    } else if (volume < 33) {
      icon.className = "fas fa-volume-off";
    } else if (volume < 66) {
      icon.className = "fas fa-volume-down";
    } else {
      icon.className = "fas fa-volume-up";
    }
  }

  // === ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ ===
  function initializeApp() {
    createDynamicElements();

    // Обновляем иконку громкости при загрузке
    if (elements.volumeSlider) {
      updateVolumeIcon(elements.volumeSlider.value);
    }

    if (window.musicPlayer) {
      // Быстрая загрузка настроек
      window.musicPlayer.loadSettings();

      // Инициализируем значения слайдеров
      if (elements.transparencySlider && elements.transparencyValue) {
        elements.transparencyValue.textContent = `${elements.transparencySlider.value}%`;
      }

      if (elements.visualizerSensitivity && elements.visualizerSensitivityValue) {
        elements.visualizerSensitivityValue.textContent = `${elements.visualizerSensitivity.value}%`;
      }

      // Инициализируем громкость из настроек плеера
      if (elements.volumeSlider) {
        const savedVolume = window.musicPlayer.volume * 100;
        if (savedVolume) {
          elements.volumeSlider.value = savedVolume;
          updateVolumeIcon(savedVolume);
          
          // Синхронизируем всплывающий слайдер если он есть
          if (elements.volumeSliderContainer) {
            const popupSlider = elements.volumeSliderContainer.querySelector(
              ".volume-slider-horizontal",
            );
            const volumeValueDisplay = elements.volumeSliderContainer.querySelector(
              "#volumeValueDisplay",
            );
            
            if (popupSlider) popupSlider.value = savedVolume;
            if (volumeValueDisplay) volumeValueDisplay.textContent = `${savedVolume}%`;
          }
        }
      }

      // Быстрая инициализация плеера
      setTimeout(() => {
        if (window.musicPlayer.initialize) {
          window.musicPlayer.initialize();
        }
      }, 100);
    }
  }

  // === УПРАВЛЕНИЕ ОКНОМ ===
  if (elements.minimizeBtn && window.electronAPI) {
    elements.minimizeBtn.addEventListener("click", () => {
      window.electronAPI.minimizeWindow();
    });
  }

  if (elements.closeBtn && window.electronAPI) {
    elements.closeBtn.addEventListener("click", () => {
      window.electronAPI.closeWindow();
    });
  }

  // === ПАНЕЛЬ НАСТРОЕК ===
  if (elements.settingsBtn && elements.settingsPanel) {
    elements.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.settingsPanel.classList.toggle("open");
    });
  }

  if (elements.closeSettingsBtn && elements.settingsPanel) {
    elements.closeSettingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.settingsPanel.classList.remove("open");
    });
  }

  // Закрытие по клику вне элементов
  document.addEventListener("click", (e) => {
    // Закрытие слайдера громкости
    if (elements.volumeSliderContainer && 
        elements.volumeSliderContainer.classList.contains("show")) {
      if (!elements.volumeSliderContainer.contains(e.target) &&
          e.target !== elements.volumeBtn &&
          !elements.volumeBtn.contains(e.target)) {
        elements.volumeSliderContainer.classList.remove("show");
        elements.volumeBtn.classList.remove("active");
      }
    }
    
    // Закрытие панели настроек
    if (elements.settingsPanel && 
        elements.settingsPanel.classList.contains("open")) {
      if (!elements.settingsPanel.contains(e.target) && 
          e.target !== elements.settingsBtn) {
        elements.settingsPanel.classList.remove("open");
      }
    }
  });

  // === УПРАВЛЕНИЕ ГРОМКОСТЬЮ ===
  if (elements.volumeBtn && elements.volumeSliderContainer) {
    elements.volumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.volumeSliderContainer.classList.toggle("show");
      elements.volumeBtn.classList.toggle("active");
    });
  }

  // Обработчик для основного слайдера громкости
  if (elements.volumeSlider) {
    elements.volumeSlider.addEventListener("input", (e) => {
      if (window.musicPlayer) {
        const value = e.target.value;
        window.musicPlayer.setVolume(value);
        updateVolumeIcon(value);
        
        // Синхронизируем со всплывающим слайдером
        if (elements.volumeSliderContainer) {
          const popupSlider = elements.volumeSliderContainer.querySelector(
            ".volume-slider-horizontal",
          );
          const volumeValueDisplay = elements.volumeSliderContainer.querySelector(
            "#volumeValueDisplay",
          );
          
          if (popupSlider) popupSlider.value = value;
          if (volumeValueDisplay) volumeValueDisplay.textContent = `${value}%`;
        }
      }
    });
  }

  // === БЫСТРАЯ ЗАГРУЗКА "МНЕ НРАВИТСЯ" ===
  if (elements.quickLikedBtn) {
    elements.quickLikedBtn.addEventListener("click", async () => {
      if (window.musicPlayer) {
        window.musicPlayer.showNotification(
          "⚡ Быстрая загрузка...",
          "info",
          1500,
        );

        setTimeout(async () => {
          try {
            const likedTracks = await window.musicPlayer.getLikedTracks();
            if (likedTracks.length > 0) {
              window.musicPlayer.playlist = likedTracks;
              window.musicPlayer.currentIndex = 0;
              await window.musicPlayer.playTrackByIndex(0);

              // Обновляем счетчик
              if (elements.likedCount) {
                elements.likedCount.textContent =
                  likedTracks.length > 99 ? "99+" : likedTracks.length;
              }

              window.musicPlayer.showNotification(
                `❤️  Загружено ${likedTracks.length} треков`,
                "success",
                2000,
              );
            }
          } catch (error) {
            console.error("Ошибка быстрой загрузки:", error);
          }
        }, 50);
      }
    });
  }

  // === УПРАВЛЕНИЕ ПЛЕЕРОМ ===
  if (elements.playBtn) {
    elements.playBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.togglePlay();
      }
    });
  }

  if (elements.prevBtn) {
    elements.prevBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.playPrevious();
      }
    });
  }

  if (elements.nextBtn) {
    elements.nextBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.playNext();
      }
    });
  }

  if (elements.progressBar) {
    elements.progressBar.addEventListener("click", (e) => {
      if (window.musicPlayer) {
        const rect = elements.progressBar.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        window.musicPlayer.seekTo(percent);
      }
    });
  }

  // === ПОИСК (УСКОРЕННЫЙ) ===
  if (elements.searchInput) {
    let searchTimeout;
    elements.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length > 2 && window.musicPlayer) {
          const result = await window.musicPlayer.searchTracks(query);
          if (result.tracks && result.tracks.length > 0) {
            window.musicPlayer.playlist = result.tracks;
            window.musicPlayer.currentIndex = 0;
            await window.musicPlayer.playTrack(result.tracks[0]);

            if (elements.settingsPanel) {
              elements.settingsPanel.classList.remove("open");
            }
          }
        }
      }, 300);
    });
  }

  // === НАСТРОЙКИ ТЕМЫ ===
  if (elements.themeBtn) {
    elements.themeBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.toggleTheme();
      }
    });
  }

  if (elements.transparencyBtn) {
    elements.transparencyBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.toggleTransparency();
      }
    });
  }

  if (elements.transparencySlider && elements.transparencyValue) {
    elements.transparencySlider.addEventListener("input", (e) => {
      if (window.musicPlayer) {
        window.musicPlayer.setTransparencyLevel(e.target.value);
        if (elements.transparencyValue) {
          elements.transparencyValue.textContent = `${e.target.value}%`;
        }
      }
    });
  }

  // === ВИЗУАЛИЗАТОР ===
  // Кнопка режима в основном интерфейсе
  if (elements.visualizerModeBtn2 && window.musicPlayer) {
    elements.visualizerModeBtn2.addEventListener("click", () => {
      const modes = ["bars", "wave", "circle"];
      const currentIndex = modes.indexOf(window.musicPlayer.visualizerMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      window.musicPlayer.setVisualizerMode(modes[nextIndex]);

      // Синхронизируем с кнопкой в настройках
      const modeIcons = {
        bars: "fas fa-bars",
        wave: "fas fa-wave-square",
        circle: "fas fa-circle",
      };

      // Обновляем обе кнопки
      const icon1 = elements.visualizerModeBtn?.querySelector("i");
      const icon2 = elements.visualizerModeBtn2.querySelector("i");

      if (icon1) icon1.className = modeIcons[modes[nextIndex]];
      if (icon2) icon2.className = modeIcons[modes[nextIndex]];

      // Быстрое уведомление
      const modeNames = {
        bars: "Столбцы",
        wave: "Волна",
        circle: "Круг",
      };

      window.musicPlayer.showNotification(
        `Визуализатор: ${modeNames[modes[nextIndex]]}`,
        "info",
        1500,
      );
    });
  }

  // Кнопка включения/выключения визуализатора в настройках
  if (elements.visualizerToggleBtn) {
    elements.visualizerToggleBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        window.musicPlayer.toggleVisualizer();
      }
    });
  }

  // Кнопка режима в настройках
  if (elements.visualizerModeBtn) {
    elements.visualizerModeBtn.addEventListener("click", () => {
      if (window.musicPlayer) {
        const modes = ["bars", "wave", "circle"];
        const currentIndex = modes.indexOf(window.musicPlayer.visualizerMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        window.musicPlayer.setVisualizerMode(modes[nextIndex]);

        // Обновляем иконку
        const modeIcons = {
          bars: "fas fa-bars",
          wave: "fas fa-wave-square",
          circle: "fas fa-circle",
        };

        const iconElement = elements.visualizerModeBtn.querySelector("i");
        if (iconElement) {
          iconElement.className = modeIcons[modes[nextIndex]];
        }

        // Обновляем иконку в основном интерфейсе
        if (elements.visualizerModeBtn2) {
          const icon2 = elements.visualizerModeBtn2.querySelector("i");
          if (icon2) icon2.className = modeIcons[modes[nextIndex]];
        }

        // Быстрое уведомление
        const modeNames = {
          bars: "Столбцы",
          wave: "Волна",
          circle: "Круг",
        };

        window.musicPlayer.showNotification(
          `Визуализатор: ${modeNames[modes[nextIndex]]}`,
          "info",
          1500,
        );
      }
    });
  }

  // Слайдер чувствительности в настройках
  if (elements.visualizerSensitivity && elements.visualizerSensitivityValue) {
    elements.visualizerSensitivity.addEventListener("input", (e) => {
      if (window.musicPlayer) {
        window.musicPlayer.setVisualizerSensitivity(e.target.value);
        if (elements.visualizerSensitivityValue) {
          elements.visualizerSensitivityValue.textContent = `${e.target.value}%`;
        }
      }
    });
  }

  // === КНОПКИ ДЕЙСТВИЙ ===
  if (elements.loadMyWaveBtn) {
    elements.loadMyWaveBtn.addEventListener("click", async () => {
      if (window.musicPlayer) {
        window.musicPlayer.showNotification(
          "🌀 Запуск 'Моей волны'...",
          "info",
        );
        setTimeout(async () => {
          await window.musicPlayer.loadMyWave();
        }, 100);

        if (elements.settingsPanel) {
          elements.settingsPanel.classList.remove("open");
        }
      }
    });
  }

  if (elements.loadLikedBtn) {
    elements.loadLikedBtn.addEventListener("click", async () => {
      if (window.musicPlayer) {
        window.musicPlayer.showNotification(
          "⚡ Загрузка 'Мне нравится'...",
          "info",
        );
        setTimeout(async () => {
          try {
            const likedTracks = await window.musicPlayer.getLikedTracks();
            if (likedTracks.length > 0) {
              window.musicPlayer.playlist = likedTracks;
              window.musicPlayer.currentIndex = 0;
              await window.musicPlayer.playTrackByIndex(0);

              window.musicPlayer.showNotification(
                `❤️  Загружено ${likedTracks.length} треков`,
                "success",
                2000,
              );
            }
          } catch (error) {
            console.error("Ошибка загрузки:", error);
          }
        }, 50);

        if (elements.settingsPanel) {
          elements.settingsPanel.classList.remove("open");
        }
      }
    });
  }

  // Кнопка сохранения настроек
  if (elements.saveSettings) {
    elements.saveSettings.addEventListener("click", () => {
      if (window.musicPlayer && window.musicPlayer.saveSettings) {
        window.musicPlayer.saveSettings();
        window.musicPlayer.showNotification(
          "Настройки сохранены",
          "success",
          2000,
        );
      }
    });
  }

  // === ГОРЯЧИЕ КЛАВИШИ ===
  document.addEventListener("keydown", (e) => {
    // Пробел - play/pause
    if (e.code === "Space" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      if (window.musicPlayer) {
        window.musicPlayer.togglePlay();
      }
    }

    // Ctrl+Shift+S - настройки
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      if (elements.settingsPanel) {
        elements.settingsPanel.classList.toggle("open");
      }
    }

    // Ctrl+Shift+L - "Мне нравится"
    if (e.ctrlKey && e.shiftKey && e.key === "L") {
      e.preventDefault();
      if (window.musicPlayer) {
        setTimeout(async () => {
          try {
            const likedTracks = await window.musicPlayer.getLikedTracks();
            if (likedTracks.length > 0) {
              window.musicPlayer.playlist = likedTracks;
              window.musicPlayer.currentIndex = 0;
              await window.musicPlayer.playTrackByIndex(0);
            }
          } catch (error) {
            console.error("Ошибка горячей клавиши:", error);
          }
        }, 0);
      }
    }

    // Стрелки - громкость (работают с основным слайдером)
    if (e.code === "ArrowUp" && window.musicPlayer && elements.volumeSlider) {
      e.preventDefault();
      const currentVolume = parseInt(elements.volumeSlider.value);
      const newVolume = Math.min(100, currentVolume + 5);
      
      // Устанавливаем значение и триггерим событие
      elements.volumeSlider.value = newVolume;
      elements.volumeSlider.dispatchEvent(new Event('input'));
    }

    if (e.code === "ArrowDown" && window.musicPlayer && elements.volumeSlider) {
      e.preventDefault();
      const currentVolume = parseInt(elements.volumeSlider.value);
      const newVolume = Math.max(0, currentVolume - 5);
      
      // Устанавливаем значение и триггерим событие
      elements.volumeSlider.value = newVolume;
      elements.volumeSlider.dispatchEvent(new Event('input'));
    }
  });

  // === НАЧАЛО ИНИЦИАЛИЗАЦИИ ===
  initializeApp();

  // === ОБРАБОТКА ОШИБОК ===
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);

    if (window.musicPlayer) {
      window.musicPlayer.showNotification(
        "Произошла ошибка. Проверьте консоль.",
        "error",
        3000,
      );
    }
  });
});