"""
Yandex Music Proxy Server для Electron плеера
Запуск: uvicorn api_server:app --host 0.0.0.0 --port 3000 --reload
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
from yandex_music import Client, Track, TrackShort
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime, timedelta
import time

# === КОНФИГУРАЦИЯ ===
try:
    try:
        from config import TOKEN
        print(f"✅ Токен загружен из config.py")
    except ImportError:
        load_dotenv()
        TOKEN = os.getenv("YANDEX_MUSIC_TOKEN")
        
        if not TOKEN:
            print("❌ КРИТИЧЕСКАЯ ОШИБКА: Токен не найден!")
            print("Добавьте в файл .env YANDEX_MUSIC_TOKEN")
            exit(1)
        else:
            print(f"✅ Токен загружен из .env")

except Exception as e:
    print(f"❌ Ошибка загрузки токена: {e}")
    exit(1)

# Проверяем что токен не пустой
if not TOKEN or TOKEN == "ваш_токен_здесь":
    print("❌ Токен пустой или содержит значение по умолчанию!")
    print("   Замени 'ваш_токен_здесь' на реальный токен в config.py")
    exit(1)

print(f"Загружен токен: {TOKEN[:5]}...")

# Настройки таймаутов
REQUEST_TIMEOUT = 10  # секунд на запрос к Яндекс.Музыке
CACHE_DURATION = 30   # секунд кэширования

# Декоратор для повторных попыток
def retry_on_failure(max_retries=3, delay=1):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    print(f"Попытка {attempt + 1} не удалась: {e}. Повтор через {delay} сек...")
                    await asyncio.sleep(delay)
            return None
        return wrapper
    return decorator

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Модели данных
class TrackResponse(BaseModel):
    id: str
    title: str
    artists: List[str]
    album: Optional[str]
    duration: int
    cover_url: Optional[str]
    direct_link: Optional[str]
    available: bool
    explicit: bool = False

class PlaylistResponse(BaseModel):
    id: str
    title: str
    cover_url: Optional[str]
    track_count: int
    tracks: List[TrackResponse]

class SearchResponse(BaseModel):
    tracks: List[TrackResponse]
    total: int

class UserInfoResponse(BaseModel):
    login: str
    name: Optional[str]
    email: Optional[str]
    uid: int

class RadioStationResponse(BaseModel):
    station_id: str
    station_name: str
    tracks: List[TrackResponse]
    batch_id: str
    has_more: bool = True

# Инициализация приложения
app = FastAPI(
    title="Yandex Music Desktop Player API",
    description="Прокси-сервер для работы с Яндекс.Музыкой из Electron",
    version="1.0.0"
)

# Настройка CORS для Electron (разрешено все для разработки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальный клиент Яндекс.Музыки
class YandexMusicClient:
    _instance = None
    
    def __init__(self, token: str):
        self.token = token
        self.client = None
        self.is_initialized = False
        
    def initialize(self):
        """Инициализация клиента"""
        try:
            print(f"🔄 Инициализируем клиент Яндекс.Музыки...")
            self.client = Client(self.token).init()
            self.is_initialized = True
            print(f"✅ Клиент Яндекс.Музыки запущен для пользователя: {self.client.me.account.login}")
            return True
        except Exception as e:
            print(f"❌ Ошибка инициализации клиента Яндекс.Музыки: {e}")
            return False
    
    def get_client(self):
        """Получение клиента (инициализирует при необходимости)"""
        if not self.is_initialized:
            if not self.initialize():
                raise HTTPException(status_code=500, detail="Ошибка запуска клиента Яндекс.Музыки")
        return self.client

# Инициализация клиента
yandex_client = YandexMusicClient(TOKEN)

# Вспомогательные функции
def track_to_response(track: Track) -> TrackResponse:
    """Преобразование объекта Track в TrackResponse"""
    
    try:
        # Проверяем тип объекта
        if isinstance(track, TrackShort):
            # Если это TrackShort, получаем полный Track
            track = track.fetch_track()

        direct_link = None
        try:
            download_info = track.get_download_info()
            if download_info:
                best_quality = max(download_info, key=lambda x: x.bitrate_in_kbps)
                direct_link = best_quality.get_direct_link()
        except Exception as e:
            logger.debug(f"Не удалось получить прямую ссылку для трека {track.id}: {e}")
        
        # URL обложки
        cover_url = None
        if track.cover_uri:
            cover_url = f"https://{track.cover_uri.replace('%%', '400x400')}"
        elif hasattr(track, 'og_image') and track.og_image:
            cover_url = track.og_image
        
        # Исполнители
        artists = []
        if track.artists:
            artists = [artist.name for artist in track.artists]
        
        # Альбом
        album = None
        if track.albums:
            album = track.albums[0].title
        
        return TrackResponse(
            id=f"{track.id}:{track.albums[0].id if track.albums else '0'}",
            title=track.title,
            artists=artists,
            album=album,
            duration=track.duration_ms // 1000,
            cover_url=cover_url,
            direct_link=direct_link,
            available=track.available
        )
        
    except Exception as e:
        logger.error(f"Ошибка преобразования трека: {e}")
        # Возвращаем минимальную информацию в случае ошибки
        return TrackResponse(
            id="0:0",
            title="Ошибка загрузки",
            artists=["Неизвестно"],
            album=None,
            duration=0,
            cover_url=None,
            direct_link=None,
            available=False
        )

# Зависимости
async def get_yandex_client():
    """Зависимость для получения клиента Яндекс.Музыки"""
    client = yandex_client.get_client()
    if not client:
        raise HTTPException(status_code=401, detail="Клиент Яндекс.Музыки не инициализирован")
    return client

# API endpoints
@app.get("/")
async def root():
    """Корневой endpoint для проверки работы"""
    return {
        "service": "Yandex Music Desktop Player API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Проверка здоровья сервера и подключения к Яндекс.Музыке"""
    try:
        client = await get_yandex_client()
        user_info = client.me
        return {
            "status": "healthy",
            "yandex_music": "connected",
            "user": user_info.account.login
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "yandex_music": "disconnected",
            "error": str(e)
        }

@app.get("/api/user", response_model=UserInfoResponse)
async def get_user_info(client: Client = Depends(get_yandex_client)):
    """Получение информации о пользователе"""
    try:
        user = client.me
        return UserInfoResponse(
            login=user.account.login,
            name=user.account.name,
            email=user.account.email,
            uid=user.account.uid
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения информации о пользователе: {e}")

@app.get("/api/search", response_model=SearchResponse)
async def search_tracks(
    query: str = Query(..., min_length=1, description="Поисковый запрос"),
    page: int = Query(0, ge=0, description="Номер страницы"),
    page_size: int = Query(20, ge=1, le=50, description="Количество результатов на странице"),
    client: Client = Depends(get_yandex_client)
):
    """Поиск треков"""
    try:
        logger.info(f"Поиск: '{query}'")
        
        # Выполняем поиск
        search_result = client.search(
            query,
            page=page,
            type_='track',
            nocorrect=False
        )
        
        if not search_result or not search_result.tracks:
            return SearchResponse(tracks=[], total=0)
        
        # Преобразуем результаты
        tracks = []
        for track_item in search_result.tracks.results[:page_size]:
            try:
                # Безопасно обрабатываем трек
                tracks.append(track_to_response(track_item))
            except Exception as e:
                logger.warning(f"Ошибка обработки трека: {e}")
                continue
        
        logger.info(f"Найдено {len(tracks)} треков по запросу '{query}'")
        return SearchResponse(
            tracks=tracks,
            total=search_result.tracks.total
        )
        
    except Exception as e:
        logger.error(f"Ошибка поиска: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")

@app.get("/api/track/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    client: Client = Depends(get_yandex_client)
):
    """Получение информации о конкретном треке"""
    try:
        # Парсим ID трека (формат: "track_id:album_id")
        parts = track_id.split(':')
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Неверный формат ID трека. Используйте 'track_id:album_id'")
        
        track_result = client.tracks([track_id])
        if not track_result:
            raise HTTPException(status_code=404, detail="Трек не найден")
        
        track = track_result[0]
        return track_to_response(track)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения трека: {e}")

@app.get("/api/playlists", response_model=List[PlaylistResponse])
async def get_user_playlists(
    client: Client = Depends(get_yandex_client)
):
    """Получение плейлистов пользователя"""
    try:
        playlists = client.users_playlists_list()
        
        result = []
        for playlist in playlists[:20]:  # Ограничиваем количество
            try:
                # Получаем треки плейлиста
                playlist_tracks = []
                if playlist.track_count > 0:
                    # Загружаем плейлист с треками
                    full_playlist = client.users_playlists(playlist.kind)
                    if full_playlist and full_playlist.tracks:
                        for track_short in full_playlist.tracks[:10]:  # Первые 10 треков
                            try:
                                playlist_tracks.append(track_to_response(track_short))
                            except:
                                continue
                
                # URL обложки
                cover_url = None
                if playlist.cover:
                    cover_uri = playlist.cover.uri or playlist.cover.items_uri
                    if cover_uri:
                        cover_url = f"https://{cover_uri.replace('%%', '400x400')}"
                
                result.append(PlaylistResponse(
                    id=str(playlist.kind),
                    title=playlist.title,
                    cover_url=cover_url,
                    track_count=playlist.track_count,
                    tracks=playlist_tracks
                ))
                
            except Exception as e:
                logger.warning(f"Ошибка обработки плейлиста {playlist.kind}: {e}")
                continue
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения плейлистов: {e}")

@app.get("/api/liked", response_model=List[TrackResponse])
async def get_liked_tracks(
    client: Client = Depends(get_yandex_client)
):
    """Получение треков из 'Мне нравится'"""
    try:
        liked_tracks = client.users_likes_tracks()
        if not liked_tracks:
            return []
        
        tracks = []
        for track_short in liked_tracks.tracks[:20]:  # Первые 20 треков для скорости
            try:
                tracks.append(track_to_response(track_short))
            except Exception as e:
                logger.warning(f"Ошибка загрузки трека: {e}")
                continue
        
        logger.info(f"Загружено {len(tracks)} треков из 'Мне нравится'")
        return tracks
        
    except Exception as e:
        logger.error(f"Ошибка получения треков 'Мне нравится': {e}")
        return []  # Возвращаем пустой список вместо ошибки

@app.get("/api/charts")
async def get_charts(
    client: Client = Depends(get_yandex_client)
):
    """Получение чартов"""
    try:
        chart = client.chart()
        if not chart or not chart.chart:
            return {"tracks": []}
        
        tracks = []
        for chart_item in chart.chart.tracks[:10]:  # Первые 10 треков из чарта
            try:
                tracks.append(track_to_response(chart_item.track))
            except:
                continue
        
        return {"tracks": tracks}
        
    except Exception as e:
        logger.error(f"Ошибка получения чартов: {e}")
        return {"tracks": []}

@app.get("/api/generate_radio")
async def generate_radio(
    track_id: Optional[str] = None,
    client: Client = Depends(get_yandex_client)
):
    """Генерация радиостанции на основе трека"""
    try:
        if track_id:
            # Радио на основе трека
            stations = client.rotor_station_tracks(
                station=f"track:{track_id}",
                queue=track_id
            )
        else:
            # Дефолтная радиостанция
            stations = client.rotor_station_tracks(station="user:onyourwave")
        
        if not stations.sequence:
            return {"tracks": []}
        
        tracks = []
        for station_track in stations.sequence[:10]:
            try:
                tracks.append(track_to_response(station_track.track))
            except:
                continue
        
        return {"tracks": tracks}
        
    except Exception as e:
        logger.error(f"Ошибка генерации радио: {e}")
        return {"tracks": []}

@app.get("/api/radio/my_wave")
async def get_my_wave_radio(
    batch_id: Optional[str] = Query(None, description="ID партии для получения следующей подгрузки"),
    client: Client = Depends(get_yandex_client)
):
    """Получение Моей Волны с бесконечной подгрузкой"""
    try:
        if batch_id:
            station = client.rotor_station_tracks(
                station='user.onyourwave',
                queue=batch_id
            )
        else:
            station = client.rotor_station_tracks(station='user.onyourwave')
        
        if not station or not station.sequence:
            raise HTTPException(status_code=404, detail="Не удалось получить радиостанцию")
        
        tracks = []
        for station_track in station.sequence[:5]:
            try:
                tracks.append(track_to_response(station_track.track))
            except Exception as e:
                logger.warning(f'Ошибка возпроизведения трека: {e}')
                continue

        next_batch_id = station.batch_id if hasattr(station, 'batch_id') else station.context_id
        logger.info(f"Загружено {len(tracks)} треков 'Моей волны' (batch_id: {next_batch_id})")

        return RadioStationResponse(
            station_id='user.onmywave',
            station_name='моя волна',
            tracks=tracks,
            batch_id=next_batch_id,
            has_more=len(tracks) > 0
        )
    except Exception as e:
        logger.error(f'Ошибка получения Моей волны: {e}')
        raise HTTPException(status_code=500, detail=f'Ошибка: {e}')

@app.get("/api/radio/next_batch", response_model=RadioStationResponse)
async def get_next_radio_batch(
    station_id: str = Query(..., description='ID радиостанции'),
    batch_id: str = Query(..., description='ID текущей партии'),
    client: Client = Depends(get_yandex_client)
):
    """Получение следующей партии треков для радиостанции"""
    try: 
        station = client.rotor_station_tracks(
            station=station_id,
            queue=batch_id
        )
        if not station or not station.sequence:
            return RadioStationResponse(
                station_id=station_id,
                station_name='радиостанция',
                tracks=[],
                batch_id=batch_id,
                has_more=False
            )
        
        tracks = []
        for station_track in station.sequence[:5]:
            try:
                tracks.append(track_to_response(station_track.track))
            except:
                continue

        next_batch_id = station.batch_id if hasattr(station, 'batch_id') else station.context_id

        return RadioStationResponse(
            station_id=station_id, 
            station_name='радиостанция',
            tracks=tracks,
            batch_id=next_batch_id,
            has_more=len(tracks) > 0
        )
    except Exception as e:
        logger.error(f'Ошибка получения следующей партии треков: {e}')
        raise HTTPException(status_code=500, detail=f'Ошибка: {e}')

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    
    # Пробуем получить порт из окружения или используем 3000
    port = 3000
    try:
        env_port = os.getenv("PORT")
        if env_port:
            port = int(env_port)
    except:
        pass
    
    print("=" * 50)
    print("🎵 Yandex Music Desktop Player Backend")
    print("=" * 50)
    print(f"📡 API доступен по адресу: http://localhost:{port}")
    print(f"📚 Документация: http://localhost:{port}/docs")
    print("=" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )