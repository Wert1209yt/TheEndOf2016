const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const ARCHIVE_PATH = path.join(__dirname, 'archive');
const API_KEY = 'ВАШ_API_КЛЮЧ_ЗДЕСЬ'; // Получите ключ через Google Cloud Console

app.use(express.json());
app.use(express.static(ARCHIVE_PATH));

// === Обработка GET-запросов к /feed ===
app.get('/feed', async (req, res) => {
  try {
    console.log('=== Начало обработки запроса ===');
    console.log('Параметры запроса:', req.query);

    // Преобразуем запрос в новый формат для YouTube Data API
    const newRequest = convertOldToNew(req.query);
    console.log('Новый запрос:', newRequest);

    // Отправляем запрос к YouTube Data API
    const response = await axios.get(newRequest.url, {
      params: newRequest.params,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('Ответ от YouTube API:', response.data);

    // Преобразуем ответ в старый формат
    const oldResponse = convertNewToOld(response.data);
    console.log('Преобразованный ответ:', oldResponse);

    res.json(oldResponse);
  } catch (error) {
    console.error('=== ОШИБКА ПРОКСИ ===');
    console.error('Ошибка:', error.message);
    console.error('Стек:', error.stack);
    res.status(500).json({ error: 'Ошибка прокси' });
  }
});

// === Преобразование запроса ===
function convertOldToNew(query) {
  return {
    url: 'https://www.googleapis.com/youtube/v3/search',
    params: {
      key: API_KEY,
      part: 'id,snippet',
      maxResults: 50,
      type: 'video',
      q: 'popular', // Поиск популярных видео
      regionCode: 'US',
      relevanceLanguage: 'en'
    }
  };
}

// === Преобразование ответа в старый формат ===
function convertNewToOld(newData) {
  try {
    console.log('=== Преобразование ответа ===');
    console.log('Структура ответа:', newData);

    return {
      responseContext: {
        serviceTrackingParams: [],
        maxAgeSeconds: 3600
      },
      contents: {
        sections: [{
          tvSecondaryNavSectionRenderer: {
            tabs: [{
              tabRenderer: {
                endpoint: {
                  clickTrackingParams: '',
                  browseEndpoint: { browseId: 'FEtopics' }
                },
                title: 'Recommended',
                selected: true,
                content: {
                  tvSurfaceContentRenderer: {
                    content: {
                      sectionListRenderer: {
                        contents: [{
                          shelfRenderer: {
                            title: { runs: [{ text: 'Trending' }] },
                            endpoint: {
                              clickTrackingParams: '',
                              browseEndpoint: { browseId: 'FEtrending' }
                            },
                            content: {
                              horizontalListRenderer: {
                                items: newData.items.map(item => ({
                                  gridVideoRenderer: {
                                    videoId: item.id.videoId,
                                    thumbnail: {
                                      thumbnails: [{
                                        url: item.snippet.thumbnails.default.url,
                                        width: item.snippet.thumbnails.default.width,
                                        height: item.snippet.thumbnails.default.height
                                      }]
                                    },
                                    title: { runs: [{ text: item.snippet.title }] },
                                    longBylineText: { runs: [{ text: item.snippet.channelTitle }] },
                                    publishedTimeText: { runs: [{ text: item.snippet.publishedAt }] },
                                    viewCountText: { runs: [{ text: '0 views' }] }, // YouTube Data API не возвращает просмотры
                                    lengthText: { runs: [{ text: '00:00' }] }, // YouTube Data API не возвращает продолжительность
                                    navigationEndpoint: {
                                      clickTrackingParams: '',
                                      watchEndpoint: { videoId: item.id.videoId }
                                    },
                                    shortBylineText: { runs: [{ text: item.snippet.channelTitle }] },
                                    trackingParams: ''
                                  }
                                }))
                              }
                            }
                          }
                        }]
                      }
                    }
                  }
                }
              }
            }]
          }
        }]
      }
    };
  } catch (error) {
    console.error('Ошибка преобразования:', error);
    throw error;
  }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(ARCHIVE_PATH, 'index.html'));
});

app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
