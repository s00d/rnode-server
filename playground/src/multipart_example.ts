import { createApp, UploadedFile, FileOperationResult, FileListResult, FileContentResult } from 'rnode-server';
import * as console from "node:console";

const app = createApp();

  // Регистрируем роут для скачивания файлов (поддерживает подпапки)
  app.download('/download/{*name}', {
    folder: './uploads',
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
    allowHiddenFiles: false,
    allowSystemFiles: false
  });

// Роут для загрузки файлов в корневую папку
app.upload('/upload', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Разрешенные подпапки с wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Роут для загрузки файлов в любую подпапку (wildcard)
app.upload('/upload/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Разрешаем любую подпапку
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Роут для множественной загрузки файлов в корневую папку
app.upload('/upload-multiple', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Разрешенные подпапки с wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

// Роут для множественной загрузки файлов в любую подпапку (wildcard)
app.upload('/upload-multiple/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Разрешаем любую подпапку
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

// Статические файлы для веб-интерфейса
app.static('./upload-demo', {
  cache: true,
  maxAge: 3600,
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true
});

// Папка для сохранения загруженных файлов (пример)
app.static('./uploads', {
  cache: false, // Не кешируем загруженные файлы
  maxAge: 0,
  maxFileSize: 50 * 1024 * 1024, // 50MB для загруженных файлов
  allowHiddenFiles: false,
  allowedExtensions: ['jpg', 'png', 'gif', 'pdf', 'txt', 'docx'],
  blockedPaths: ['.git', '.env', 'node_modules']
});

// Маршрут для главной страницы с формой загрузки
app.get('/', (req, res) => {
  try {
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    let filesList = '';
    let totalFiles = 0;
    
    // Используем Rust метод для получения списка файлов с подпапками
    try {
      const listResult = app.listFiles(uploadsDir);

      console.log(1111, JSON.stringify(listResult))
      
      if (listResult.success) {
        let allFiles = [];
        
        // Добавляем все файлы с определением папки
        if (listResult.files && listResult.files.length > 0) {
          allFiles.push(...listResult.files.map(file => {
            let folder = 'Корневая папка';
            if (file.relative_path.includes('/')) {
              const pathParts = file.relative_path.split('/');
              if (pathParts.length >= 2) {
                // Показываем полный путь к папке (например, "documents/2024/january")
                folder = pathParts.slice(0, -1).join('/');
              } else {
                folder = pathParts[0];
              }
            }
            return { ...file, folder };
          }));
        }
        
        if (allFiles.length > 0) {
          const files = allFiles.map((file) => {
            const fileSize = (file.size / 1024).toFixed(2); // KB
            const createdDate = new Date(parseInt(file.created)).toLocaleString('ru-RU');
            const modifiedDate = new Date(parseInt(file.modified)).toLocaleString('ru-RU');
            const folderInfo = file.folder !== 'Корневая папка' ? `<span class="file-folder">📁 ${file.folder}</span>` : '';
            
            return `
              <div class="file-item">
                <div class="file-info">
                  <span class="file-name">${file.name}</span>
                  ${folderInfo}
                  <span class="file-size">${fileSize} KB</span>
                  <span class="file-date">Создан: ${createdDate}</span>
                  <span class="file-date">Изменен: ${modifiedDate}</span>
                  <span class="file-mime">${file.mime_type}</span>
                </div>
                <div class="file-actions">
                  <a href="/download/${file.relative_path}" class="download-btn" download>📥 Скачать</a>
                  <button class="delete-btn" onclick="deleteFile('${file.relative_path}')">🗑️ Удалить</button>
                </div>
              </div>
            `;
          });
          
          totalFiles = allFiles.length;
          filesList = files.join('');
        }
      }
    } catch (rustError) {
      console.error('❌ Ошибка получения файлов через Rust:', rustError);
      // Fallback к пустому списку
    }
    
    res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Multipart Upload Demo</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <h1>RNode Server - File Upload Demo</h1>
          
          <div class="upload-section">
            <h2>Загрузка одного файла</h2>
            <p class="upload-info">💡 Теперь используется wildcard путь для лучшей SEO!</p>
            <form id="singleUpload" enctype="multipart/form-data">
              <input type="file" name="avatar" accept="image/*" required>
              <input type="text" name="description" placeholder="Описание файла">
              <select id="singleSubfolder" required>
                <option value="">Выберите папку</option>
                <option value="documents">📁 Документы</option>
                <option value="documents/2024">📁 Документы/2024</option>
                <option value="documents/2024/january">📁 Документы/2024/Январь</option>
                <option value="images">🖼️ Изображения</option>
                <option value="images/thumbnails">🖼️ Изображения/Миниатюры</option>
                <option value="files">📄 Файлы</option>
                <option value="files/archives">📄 Файлы/Архивы</option>
              </select>
              <button type="submit">Загрузить файл</button>
            </form>
          </div>
          
          <div class="upload-section">
            <h2>Загрузка нескольких файлов</h2>
            <p class="upload-info">💡 Теперь используется wildcard путь для лучшей SEO!</p>
            <form id="multipleUpload" enctype="multipart/form-data">
              <input type="file" name="documents" multiple accept=".pdf,.txt,.docx">
              <input type="text" name="category" placeholder="Категория файлов">
              <select id="multipleSubfolder" required>
                <option value="">Выберите папку</option>
                <option value="documents">📁 Документы</option>
                <option value="documents/2024">📁 Документы/2024</option>
                <option value="documents/2024/january">📁 Документы/2024/Январь</option>
                <option value="images">🖼️ Изображения</option>
                <option value="images/thumbnails">🖼️ Изображения/Миниатюры</option>
                <option value="files">📄 Файлы</option>
                <option value="files/archives">📄 Файлы/Архивы</option>
              </select>
              <button type="submit">Загрузить файлы</button>
            </form>
          </div>
          
          <div class="files-section">
            <h2>Загруженные файлы (${totalFiles})</h2>
            ${totalFiles > 0 ? 
              `<div class="files-list">${filesList}</div>` : 
              '<p class="no-files">Файлы еще не загружены</p>'
            }
            <button onclick="refreshFiles()" class="refresh-btn">🔄 Обновить список</button>
          </div>
          
          <div id="results"></div>
        </div>
        
        <script src="/upload.js"></script>
        <script>
          function deleteFile(filepath) {
            if (confirm('Удалить файл "' + filepath + '"?')) {
              // Кодируем путь для безопасной передачи в URL
              const encodedPath = encodeURIComponent(filepath);
              fetch('/delete/' + encodedPath, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    location.reload();
                  } else {
                    alert('Ошибка удаления: ' + data.error);
                  }
                })
                .catch(error => {
                  alert('Ошибка: ' + error);
                });
            }
          }
          
          function refreshFiles() {
            location.reload();
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Ошибка при загрузке главной страницы:', error);
    res.status(500).html('<h1>Ошибка сервера</h1><p>Не удалось загрузить страницу</p>');
  }
});

// API для удаления файла (поддерживает подпапки)
app.delete('/delete/{*filepath}', (req, res) => {
  // Получаем полный путь к файлу из URL и декодируем его
  let filepath = req.params.filepath;
  
  // Декодируем URL-encoded параметр
  try {
    filepath = decodeURIComponent(filepath);
  } catch (error) {
    console.error('❌ Ошибка декодирования URL:', error);
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid URL encoding' 
    });
  }
  
  console.log(`🔍 Попытка удаления файла: ${filepath}`);
  
  const path = require('path');
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    // Используем Rust метод для удаления файла
    const deleteResult = app.deleteFile(filepath, uploadsDir);
    
    if (deleteResult.success) {
      console.log(`🗑️ Файл удален через Rust: ${filepath}`);
      res.json({ 
        success: true, 
        message: deleteResult.message 
      });
    } else {
      console.log(`❌ Файл не найден для удаления: ${filepath}`);
      res.status(404).json({ 
        success: false, 
        error: deleteResult.error 
      });
    }
  } catch (error) {
    console.error(`❌ Ошибка удаления файла ${filepath}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка удаления файла' 
    });
  }
});

// API для получения списка загруженных файлов
app.get('/files', (req, res) => {
  try {
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Используем Rust метод для получения списка файлов
    const listResult = app.listFiles(uploadsDir);
    
    if (listResult.success) {
      res.json(listResult);
    } else {
      res.status(500).json({ 
        success: false, 
        error: listResult.error 
      });
    }
  } catch (error) {
    console.error('❌ Ошибка получения списка файлов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения списка файлов' 
    });
  }
});

// Тестирование различных типов ответов
app.get('/demo/html', (req, res) => {
  res.html('<h1>HTML Response</h1><p>Это HTML контент от сервера</p>');
});

app.get('/demo/text', (req, res) => {
  res.text('Это простой текстовый ответ от сервера');
});

app.get('/demo/xml', (req, res) => {
  res.xml('<?xml version="1.0"?><response><message>XML Response</message></response>');
});

app.get('/demo/redirect', (req, res) => {
  res.redirect('/', 301);
});

app.get('/demo/download', (req, res) => {
  // Пример загрузки файла (в реальном приложении файл должен существовать)
  res.download('./upload-demo/sample.txt', 'downloaded_file.txt');
});

// API информация
app.get('/api/info', (req, res) => {
  res.json({
    server: 'RNode Server',
    version: '1.0.0',
    features: [
      'Multipart file upload',
      'Multiple file upload',
      'Base64 file encoding',
      'Various response types',
      'Static file serving'
    ],
    endpoints: {
      'POST /upload': 'Single file upload',
      'POST /upload-multiple': 'Multiple file upload',
      'GET /download/:filename': 'Download uploaded file',
      'DELETE /delete/:filename': 'Delete uploaded file',
      'GET /files': 'List uploaded files',
      'GET /demo/*': 'Response type demonstrations',
      'GET /api/info': 'This endpoint'
    }
  });
});

// Запускаем сервер
app.listen(4540, () => {
  console.log('🚀 Multipart Demo Server running on port 4540');
  console.log('📁 File upload functionality enabled');
  console.log('🌐 Open http://localhost:4540 to test file uploads');
  console.log('📊 API info: http://localhost:4540/api/info');
});
