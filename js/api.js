/**
 * Клиент для работы с Yandex Music API через Python бэкенд
 */

const API_BASE_URL = "http://localhost:3000/api";

class YandexMusicAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.cache = new Map();
    this.activeRequests = new Map();
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${endpoint}_${JSON.stringify(options.params || {})}`;

    // Проверяем кэш
    if (options.useCache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.cacheTTL || 300000)) {
        // 5 минут по умолчанию
        return cached.data;
      }
    }

    // Проверяем активные запросы (дедупликация)
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey);
    }

    try {
      const requestPromise = (async () => {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          ...options,
        });

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        // Кэшируем результат
        if (options.useCache !== false) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });
        }

        return data;
      })();

      // Сохраняем промис активного запроса
      this.activeRequests.set(cacheKey, requestPromise);

      const result = await requestPromise;
      this.activeRequests.delete(cacheKey);

      return result;
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      this.activeRequests.delete(cacheKey);

      // Проверяем, жив ли бэкенд
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        await this.checkBackendHealth();
      }

      throw error;
    }
  }

  async checkBackendHealth() {
    try {
      const response = await fetch("http://localhost:3000/api/health");
      return response.ok;
    } catch {
      console.warn("Backend server is not running. Starting backend...");
      // Здесь можно добавить автоматический запуск бэкенда
      return false;
    }
  }

  // === Пользователь ===
  async getUserInfo() {
    return this._request("/user");
  }

  async getHealth() {
    return this._request("/health");
  }

  // === Поиск ===
  async searchTracks(query, page = 0, pageSize = 20) {
    return this._request(
      `/search?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
      {
        cacheTTL: 60000, // 1 минута для поиска
        useCache: true,
      },
    );
  }

  async getTrack(trackId) {
    return this._request(`/track/${trackId}`, {
      cacheTTL: 300000, // 5 минут для трека
      useCache: true,
    });
  }

  // === Плейлисты ===
  async getUserPlaylists() {
    return this._request("/playlists", {
      cacheTTL: 180000, // 3 минуты
      useCache: true,
    });
  }

  async getLikedTracks() {
    return this._request("/liked", {
      cacheTTL: 120000, // 2 минуты
      useCache: true,
    });
  }

  // === Чарты и радио ===
  async getCharts() {
    return this._request("/charts", {
      cacheTTL: 300000, // 5 минут
      useCache: true,
    });
  }

  async generateRadio(trackId = null) {
    const endpoint = trackId
      ? `/generate_radio?track_id=${trackId}`
      : "/generate_radio";

    return this._request(endpoint, {
      cacheTTL: 180000, // 3 минуты
      useCache: false, // Не кэшируем радио, так как оно должно быть разным
    });
  }

  async getMyWaveRadio(batchId = null) {
    const endpoint = batchId
      ? `/radio/mywave?batch_id=${encodeURIComponent(batchId)}`
      : "/radio/mywave";

    return this._request(endpoint, {
      cacheTTL: 0,
      useCache: false,
    });
  }

  async getNextRadioBatch(stationId, batchId) {
    return this._request(
      `
            /radio/next_batch?station_id=${encodeURIComponent(stationId)}&batch_id=${encodeURIComponent(batchId)}`,
      {
        cacheTTL: 0,
        useCache: false,
      },
    );
  }

  async preloadNextTrack(currentTrack, stationInfo) {
    if (!stationInfo || !stationInfo.batch_id || !stationInfo.has_more) {
        return null;
    }
    try {
        if (window.musicPlayer && window.musicPlayer.preloadedTracks && window.musicPlayer.preloadedTracks.length > 0) {
            return window.musicPlayer.preloadedTracks;
        }
        const nextBatch = await this.getNextRadioBatch (
            stationInfo.station_id,
            stationInfo.batch_id
        );
        if (nextBatch.tracks && nextBatch.tracks.length > 0) {
            console.log(`Загружено ${nextBatch.tracks.length} треков для радио`);
            return {
                tracks: nextBatch.tracks,
                stationInfo: nextBatch
            };
        }

    } catch (error) {
        console.warn("Не удалось загрузить треки:", error);
    }
    
    return null;
  }

  // === Утилиты ===
  clearCache() {
    this.cache.clear();
    console.log("API cache cleared");
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      activeRequests: this.activeRequests.size,
    };
  }
}

// Экспортируем
const apiClient = new YandexMusicAPI();
export default apiClient;
