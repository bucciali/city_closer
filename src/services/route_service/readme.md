# 🌍 API маршрутизации по дорожной сети Москвы

## 📋 Описание проекта

Разработан API-сервис для построения оптимальных маршрутов по дорожной сети Москвы с использованием графовых алгоритмов поиска кратчайшего пути. Сервис загружает реальную дорожную сеть из OpenStreetMap и предоставляет REST API для маршрутизации.

### Основные возможности

-  Загрузка дорожного графа Москвы из OpenStreetMap
-  Поддержка 5 алгоритмов поиска кратчайшего пути
-  REST API с возвратом маршрута в формате GeoJSON
-  Кэширование графа для быстрой загрузки
-  Бенчмаркинг алгоритмов для выбора оптимального

## 🛠 Технологии

| Технология | Назначение |
|------------|------------|
| Python 3.10 | Язык программирования |
| OSMnx | Загрузка графов из OpenStreetMap |
| NetworkX | Работа с графами |
| FastAPI | REST API фреймворк |
| Uvicorn | ASGI сервер |
| Pydantic | Валидация данных |

## 🧮 Поддерживаемые алгоритмы

| Алгоритм | ENV значение | Описание | Когда использовать |
|----------|--------------|----------|-------------------|
| Dijkstra | `dijkstra` | Классический алгоритм Дейкстры | По умолчанию, универсальный |
| A* | `astar` | A* с эвристикой евклидова расстояния | Быстрее на больших расстояниях |
| Bidirectional | `bidirectional` | Двунаправленный алгоритм Дейкстры | Эффективен для длинных маршрутов |
| Contraction Hierarchies | `ch` | Предварительная обработка графа | Очень быстро, но долгий старт |
| ALT | `alt` | A* с потенциалами Лэндиса-Хефнера | Быстрый, требует памяти |

## 📁 Структура проекта
```txt
    city_closer/
    ├── route_service/
    │ ├── algorithms/
    │ │ ├── base/ # Базовые алгоритмы
    │ │ │ ├── a_star.py # A* алгоритм
    │ │ │ ├── bidirectional.py # Двунаправленный Дейкстра
    │ │ │ └── router.py # Базовый класс
    │ │ ├── shortest_path/ # Классические алгоритмы
    │ │ │ └── dijkstra.py # Алгоритм Дейкстры
    │ │ └── advanced/ # Продвинутые алгоритмы
    │ │ ├── alt.py # ALT алгоритм
    │ │ └── contraction_hierarchies.py # CH алгоритм
    │ ├── service/
    │ │ ├── main.py # FastAPI приложение
    │ │ ├── graph_loader.py # Загрузчик графа
    │ │ └── schemas.py # Pydantic схемы
    │ ├── cache/ # Кэш графа (монтируется)
    │ │ └── moscow_graph_drive.pkl
    │ ├── Dockerfile
    │ ├── docker-compose.yml
    │ └── requirements.txt
    └── README.md
```

## 🚀 Установка и запуск
### Способ 1: Docker (рекомендуется для production)

#### 1. Подготовка кэша графа (однократно)

Граф не загружается в Docker-образ из-за большого размера (~200-500 MB). Он монтируется как volume.

```bash
    mkdir -p cache
```

#### 2. Загрузка графа (займет 5-10 минут)
```bash
    python -c "
        from service.graph_loader import MoscowGraphLoader
        loader = MoscowGraphLoader(network_type='drive')
        graph = loader.load_graph(
            use_cache=True, 
            cache_file='cache/moscow_graph_drive.pkl'
        )
        print('Graph saved to cache/')
    "
```

#### 3. Запуск сервиса в докере
```bash
    docker-compose up -d
```
### Способ 2: Локальный запуск (для разработки)

#### 1. Клонирование репозитория

```bash
    git clone <repository-url>
    cd src/services/route_service
```

#### 2. Создание виртуального окружения
```bash
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    venv\Scripts\activate     # Windows
```

#### 3. Установка зависимостей
```bash
    pip install -r requirements.txt
```

#### 4. Запуск сервера
```bash
    cd service
    uvicorn main:app --reload --port 8000
```


#### 5. Проверка работы
```bash
    # Проверка статуса
    curl http://localhost:8000/

    # Информация о сервисе
    curl http://localhost:8000/routing/v1/info

    # Построение маршрута
    curl -X POST http://localhost:8000/routing/v1/route \
    -H "Content-Type: application/json" \
    -d '{"ids": [46285457, 46285500, 46285530]}'
```



## 📡 API Контракт
### Формат запроса/ответа

POST **/routing/v1/route**

```json
    {
        "waypoints": [
            {"lat": 55.7558, "lng": 37.6176},
            {"lat": 55.7512, "lng": 37.6184}
        ]
    }
```
Поля:

- waypoints (required, array, min 2 items) - массив точек маршрута

- lat (required, float) - широта в градусах

- lng (required, float) - долгота в градусах

Успешный ответ (200 OK)
```json
{
    "type": "Feature",
    "geometry": {
        "type": "LineString",
        "coordinates": [
        [37.6176, 55.7558],
        [37.6184, 55.7512]
        ]
    },
    "properties": {
        "total_distance_meters": 523.45,
        "total_distance_km": 0.52,
        "estimated_time_minutes": 6,
        "number_of_waypoints": 2,
        "algorithm": "dijkstra",
        "waypoints": [46285457, 46285500],
        "processing_time_ms": 45.23
    }
}
```
Поля ответа:

- type - всегда "Feature" (GeoJSON)

- geometry.type - всегда "LineString"

- geometry.coordinates - массив [lng, lat] точек маршрута

- properties.total_distance_meters - расстояние в метрах

- properties.total_distance_km - расстояние в километрах

- properties.estimated_time_minutes - примерное время в минутах (при скорости 50 км/ч)

- properties.algorithm - использованный алгоритм

- properties.processing_time_ms - время обработки запроса

Ошибки
400 Bad Request - Невалидный JSON

```json
    {
    "detail": "Invalid request body"
    }
```
422 Unprocessable Entity - Координаты вне Москвы

```json
    {
        "detail": "Coordinates (55.1, 37.5) are outside Moscow region. Expected: lat∈[55.2, 56.2], lng∈[36.8, 38.2"
    }
```
404 Not Found - Путь не найден

```json
    {
    "detail": "No path found between nodes 46285457 and 46285500"
    }
```
503 Service Unavailable - Сервис инициализируется

```json
    {
    "detail": "Service is initializing, please wait"
    }
```
Другие эндпоинты
GET /health - Health check (возвращает 200 только когда сервис полностью готов)

```json
    {
    "status": "healthy",
    "graph_loaded": true,
    "router_ready": true
    }
```
GET /routing/v1/info - Информация о сервисе

```json
    {
    "service": "Moscow Routing API",
    "graph": {
        "nodes": 123456,
        "edges": 234567,
        "network_type": "drive"
    },
    "algorithm": "dijkstra",
    "city": "Moscow",
    "status": "ready"
    }
```
## 💾 Кэширование графа
- Как это работает?
- При первом запуске OSMnx загружает граф из OpenStreetMap (~5-10 минут)
- Граф сохраняется в moscow_graph_drive.pkl (pickle-файл)
- При следующих запусках граф загружается из кэша (несколько секунд)
- Почему граф не в Docker-образе?
- Файл графа весит 200-500 MB
- Запекание в образ сделает его огромным и медленным при деплое
- Кэш монтируется как volume и может обновляться независимо
- Как получить файл графа на хост
### Первый запуск сервиса

```bash
    # Граф загрузится автоматически при первом запуске
    docker-compose up
    # Ждем 5-10 минут, граф сохранится в ./cache/
    docker-compose down
    # Теперь кэш есть, можно запускать с healthcheck
    docker-compose up -d
```