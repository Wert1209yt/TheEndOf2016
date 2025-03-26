const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const ARCHIVE_PATH = path.join(__dirname, 'archive');

app.use(express.json());
app.use(express.static(ARCHIVE_PATH));

app.get('/feed', async (req, res) => {
  try {
    console.log('=== Начало обработки запроса ===');
    console.log('Параметры запроса:', req.query);

    const newRequest = convertOldToNew(req.query);
    console.log('Новый запрос:', newRequest);

    try {
      const response = await axios(newRequest);
      console.log('Ответ от YouTube API:', response.data);

      const oldResponse = convertNewToOld(response.data);
      console.log('Преобразованный ответ:', oldResponse);

      res.json(oldResponse);
    } catch (error) {
      console.error('Ошибка при запросе к YouTube API:', error);
      res.status(500).json({ error: 'Ошибка прокси: не удалось получить данные от YouTube API' });
      return;
    }
  } catch (error) {
    console.error('=== ОШИБКА ПРОКСИ ===');
    console.error('Ошибка:', error.message);
    console.error('Стек:', error.stack);
    res.status(500).json({ error: 'Ошибка прокси' });
  }
});

function convertOldToNew(query) {
  return {
    method: 'POST',
    url: 'https://www.youtube.com/youtubei/v1/browse',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    data: {
      context: {
        client: {
          clientName: 'TVHTML5',
          clientVersion: '1.0',
          hl: 'en',
          gl: 'US'
        }
      },
      browseId: 'FEtopics'
    }
  };
}

function convertNewToOld(newData) {
  try {
    console.log('=== Преобразование ответа ===');
    console.log('Структура ответа:', newData);

    return {
      responseContext: {
        serviceTrackingParams: newData.responseContext?.serviceTrackingParams || [],
        maxAgeSeconds: newData.responseContext?.maxAgeSeconds || 0
      },
      contents: {
        sections: [{
          tvSecondaryNavSectionRenderer: {
            tabs: [{
              tabRenderer: {
                endpoint: {
                  clickTrackingParams: 'CA8Q8JMBGAAiEwjBks64moLhAhXXQEwIHQdQDuI=',
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
                              clickTrackingParams: 'CBsQ3BwYACITCMGSzriaguECFddATAgdB1AO4g==',
                              browseEndpoint: { browseId: 'FEtrending' }
                            },
                            content: {
                              horizontalListRenderer: {
                                items: [{
                                  gridVideoRenderer: {
                                    videoId: 'jlzVmOUP1is',
                                    thumbnail: {
                                      thumbnails: [{
                                        url: 'https://i.ytimg.com/vi/jlzVmOUP1is/default.jpg',
                                        width: 120,
                                        height: 90
                                      }]
                                    },
                                    title: { runs: [{ text: 'Insane Taekwondo stunts in 4K Slow Motion' }] },
                                    longBylineText: { runs: [{ text: 'The Slow Mo Guys' }] },
                                    publishedTimeText: { runs: [{ text: '1 day ago' }] },
                                    viewCountText: { runs: [{ text: '549,484 views' }] },
                                    lengthText: { runs: [{ text: '12:09' }] },
                                    navigationEndpoint: {
                                      clickTrackingParams: 'CCsQlDUYACITCMGSzriaguECFddATAgdB1AO4kCrrL-ojrO1ro4B',
                                      watchEndpoint: { videoId: 'jlzVmOUP1is' }
                                    },
                                    shortBylineText: { runs: [{ text: 'The Slow Mo Guys' }] },
                                    trackingParams: 'CCsQlDUYACITCMGSzriaguECFddATAgdB1AO4kCrrL-ojrO1ro4B'
                                  }
                                }]
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
