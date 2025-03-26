const express = require('express');
const axios = require('axios');
const path = require('path');

// Создаём приложение Express
const app = express();

// Путь к архивным файлам сайта m.youtube.com (2016 год)
const ARCHIVE_PATH = path.join(__dirname, 'archive');

// Middleware для обработки JSON-запросов
app.use(express.json());

// === 1. API-прокси для обработки запросов к старому API ===
app.use('/api', async (req, res) => {
  try {
    // Преобразуем старый формат запроса в новый
    const newRequest = convertOldToNew(req);

    // Отправляем запрос к современному Innertube API
    const response = await axios(newRequest);

    // Преобразуем новый формат ответа в старый
    const oldResponse = convertNewToOld(response.data);

    // Возвращаем преобразованный ответ клиенту
    res.json(oldResponse);
  } catch (error) {
    console.error('Ошибка API-прокси:', error.message);
    res.status(500).json({ error: 'Ошибка прокси' });
  }
});

// === 2. Сервер статических файлов для сайта m.youtube.com ===
app.use(express.static(ARCHIVE_PATH));

// Если запрос не попадает под API, возвращаем статические файлы
app.get('*', (req, res) => {
  res.sendFile(path.join(ARCHIVE_PATH, 'index.html'));
});

// === Функции преобразования запросов и ответов ===

// Преобразование старого формата запроса в новый формат Innertube API
function convertOldToNew(req) {
  if (req.path === '/api/feed') {
    return {
      method: 'POST',
      url: 'https://www.youtube.com/youtubei/v1/browse',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        context: {
          client: {
            clientName: 'MWEB',
            clientVersion: '2.20200720.00.01',
          },
        },
        browseId: 'FEwhat_to_watch',
      },
    };
  }
  throw new Error(`Неизвестный путь API: ${req.path}`);
}

// Преобразование нового формата ответа в старый формат для клиента
function convertNewToOld(newData) {
  if (newData.contents) {
    return newData.contents.map((item) => ({
      title: item.title?.simpleText || '',
      videoId: item.videoId || '',
      thumbnailUrl: item.thumbnail?.thumbnails[0]?.url || '',
    }));
  }
  throw new Error('Не удалось преобразовать данные');
}

// === Запуск сервера ===
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
