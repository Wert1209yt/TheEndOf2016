const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const ARCHIVE_PATH = path.join(__dirname, 'archive');

app.use(express.json());
app.use(express.static(ARCHIVE_PATH));

// === Обработка API-запросов ===
app.use('/api', async (req, res) => {
  try {
    const newRequest = convertOldToNew(req);
    console.log('Новый запрос:', newRequest);
    
    const response = await axios(newRequest);
    console.log('Ответ от YouTube:', response.data);
    
    const oldResponse = convertNewToOld(response.data);
    res.json(oldResponse);
  } catch (error) {
    console.error('Ошибка:', error.message);
    res.status(500).json({ error: 'Ошибка прокси' });
  }
});

// === Преобразование запроса ===
function convertOldToNew(req) {
  if (req.path === '/api/feed') {
    return {
      method: 'POST',
      url: 'https://www.youtube.com/youtubei/v1/browse',
      headers: { 'Content-Type': 'application/json' },
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
  throw new Error(`Неизвестный путь: ${req.path}`);
}

// === Преобразование ответа в старый формат ===
function convertNewToOld(newData) {
  try {
    const sections = newData.contents?.sections || [];
    const items = sections.reduce((acc, section) => {
      const shelf = section.tvSecondaryNavSectionRenderer?.tabs[0]?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer?.contents[0]?.shelfRenderer;
      if (shelf) {
        return acc.concat(shelf.content.horizontalListRenderer.items);
      }
      return acc;
    }, []);

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
                  clickTrackingParams: newData.responseContext?.serviceTrackingParams[0]?.params[0]?.value || '',
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
                              clickTrackingParams: newData.responseContext?.serviceTrackingParams[0]?.params[0]?.value || '',
                              browseEndpoint: { browseId: 'FEtrending' }
                            },
                            content: {
                              horizontalListRenderer: {
                                items: items.map(item => ({
                                  gridVideoRenderer: {
                                    videoId: item.videoId,
                                    thumbnail: {
                                      thumbnails: item.thumbnail.thumbnails
                                    },
                                    title: item.title,
                                    longBylineText: item.longBylineText,
                                    publishedTimeText: item.publishedTimeText,
                                    viewCountText: item.viewCountText,
                                    lengthText: item.lengthText,
                                    navigationEndpoint: item.navigationEndpoint,
                                    shortBylineText: item.shortBylineText,
                                    badges: item.badges,
                                    channelThumbnail: item.channelThumbnail,
                                    trackingParams: item.trackingParams,
                                    shortViewCountText: item.shortViewCountText,
                                    topStandaloneBadge: item.topStandaloneBadge
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
