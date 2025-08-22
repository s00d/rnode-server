// RNode Server - Multipart Upload Demo JavaScript

document.addEventListener('DOMContentLoaded', function() {
  const resultsContainer = document.getElementById('results');
  
  // Добавляем демо ссылки
  addDemoLinks();
  
  // Обработчик для загрузки одного файла
  document.getElementById('singleUpload').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const fileInput = this.querySelector('input[type="file"]');
    const subfolderSelect = document.getElementById('singleSubfolder');
    
    if (!fileInput.files.length) {
      showResult('error', 'Пожалуйста, выберите файл');
      return;
    }
    
    if (!subfolderSelect.value) {
      showResult('error', 'Пожалуйста, выберите папку');
      return;
    }
    
    showLoading('Загрузка файла...');
    
    try {
      // Формируем URL с wildcard путем или query параметром
      let uploadUrl;
      if (subfolderSelect.value) {
        // Используем wildcard путь для лучшей SEO и читаемости
        uploadUrl = `/upload/${subfolderSelect.value}`;
      } else {
        uploadUrl = '/upload';
      }
      console.log('📤 Загружаем файл в папку:', subfolderSelect.value, 'URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
      
      console.log('🔍 Upload response:', result); // Для отладки
      console.log('🔍 Тип result:', typeof result);
      console.log('🔍 result.success:', result?.success);
      console.log('🔍 result.uploadedFiles:', result?.uploadedFiles);
      
      // Проверяем что result является объектом
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (result.success) {
        // Проверяем что поля существуют перед использованием
        const uploadedFiles = result.uploadedFiles || [];
        const totalFiles = result.totalFiles || 0;
        const formFields = result.formFields || {};
        
        // Сохраняем результат для отображения деталей
        window.lastUploadResult = result;
        
        // Определяем подпапку из относительного пути
        let subfolder = 'Корневая папка';
        if (uploadedFiles.length > 0 && uploadedFiles[0].relative_path && uploadedFiles[0].relative_path.includes('/')) {
          const pathParts = uploadedFiles[0].relative_path.split('/');
          if (pathParts.length >= 2) {
            // Показываем полный путь к папке (например, "documents/2024/january")
            subfolder = pathParts.slice(0, -1).join('/');
          } else {
            subfolder = pathParts[0];
          }
        }
        
        // Отображаем результат загрузки
        let resultHtml = `
          <div class="result success">
            <h3>✅ Файл успешно загружен</h3>
            <p><strong>Количество файлов:</strong> ${totalFiles}</p>
            <p><strong>Подпапка:</strong> ${subfolder}</p>
            
            <h4>Загруженные файлы:</h4>
            <div class="uploaded-files">`;
        
        // Цикл по загруженным файлам
        uploadedFiles.forEach((file, index) => {
          resultHtml += `
            <div class="file-details">
              <p><strong>Файл ${index + 1}:</strong></p>
              <ul>
                <li><strong>Имя:</strong> ${file.name || 'Без имени'}</li>
                <li><strong>Размер:</strong> ${formatFileSize(file.size || 0)}</li>
                <li><strong>MIME тип:</strong> ${file.mime_type || 'Неизвестно'}</li>
                <li><strong>Относительный путь:</strong> ${file.relative_path || 'Неизвестно'}</li>
              </ul>
            </div>`;
        });
        
        resultHtml += `
            </div>
            
            <h4>Поля формы:</h4>
            <div class="form-fields">`;
        
        // Цикл по полям формы
        if (Object.keys(formFields).length > 0) {
          Object.entries(formFields).forEach(([key, value]) => {
            resultHtml += `<p><strong>${key}:</strong> ${value}</p>`;
          });
        } else {
          resultHtml += '<p>Нет полей формы</p>';
        }
        
        resultHtml += `
            </div>
          </div>`;
        
        resultsContainer.innerHTML = resultHtml;
      } else {
        showResult('error', result.message || 'Ошибка загрузки файла');
      }
    } catch (error) {
      showResult('error', 'Ошибка сети: ' + error.message);
    }
    
    this.reset();
  });
  
  // Обработчик для загрузки нескольких файлов
  document.getElementById('multipleUpload').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const fileInput = this.querySelector('input[type="file"]');
    const subfolderSelect = document.getElementById('multipleSubfolder');
    
    if (!fileInput.files.length) {
      showResult('error', 'Пожалуйста, выберите файлы');
      return;
    }
    
    if (!subfolderSelect.value) {
      showResult('error', 'Пожалуйста, выберите папку');
      return;
    }
    
    showLoading(`Загрузка ${fileInput.files.length} файла(ов)...`);
    
    try {
      // Формируем URL с wildcard путем или query параметром
      let uploadUrl;
      if (subfolderSelect.value) {
        // Используем wildcard путь для лучшей SEO и читаемости
        uploadUrl = `/upload-multiple/${subfolderSelect.value}`;
      } else {
        uploadUrl = '/upload-multiple';
      }
      console.log('📤 Загружаем файлы в папку:', subfolderSelect.value, 'URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
      
      console.log('Multiple upload response:', result); // Для отладки
      
      // Проверяем что result является объектом
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (result.success) {
        // Проверяем что поля существуют перед использованием
        const uploadedFiles = result.uploadedFiles || [];
        const totalFiles = result.totalFiles || 0;
        const formFields = result.formFields || {};
        
        // Сохраняем результат для отображения деталей
        window.lastUploadResult = result;
        
        // Определяем подпапку из относительного пути
        let subfolder = 'Корневая папка';
        if (uploadedFiles.length > 0 && uploadedFiles[0].relative_path && uploadedFiles[0].relative_path.includes('/')) {
          const pathParts = uploadedFiles[0].relative_path.split('/');
          if (pathParts.length >= 2) {
            // Показываем полный путь к папке (например, "documents/2024/january")
            subfolder = pathParts.slice(0, -1).join('/');
          } else {
            subfolder = pathParts[0];
          }
        }
        
        // Отображаем результат загрузки
        let resultHtml = `
          <div class="result success">
            <h3>✅ Файлы успешно загружены</h3>
            <p><strong>Количество файлов:</strong> ${totalFiles}</p>
            <p><strong>Подпапка:</strong> ${subfolder}</p>
            
            <h4>Загруженные файлы:</h4>
            <div class="uploaded-files">`;
        
        // Цикл по загруженным файлам
        uploadedFiles.forEach((file, index) => {
          resultHtml += `
            <div class="file-details">
              <p><strong>Файл ${index + 1}:</strong></p>
              <ul>
                <li><strong>Имя:</strong> ${file.name || 'Без имени'}</li>
                <li><strong>Размер:</strong> ${formatFileSize(file.size || 0)}</li>
                <li><strong>MIME тип:</strong> ${file.mime_type || 'Неизвестно'}</li>
                <li><strong>Относительный путь:</strong> ${file.relative_path || 'Неизвестно'}</li>
              </ul>
            </div>`;
        });
        
        resultHtml += `
            </div>
            
            <h4>Поля формы:</h4>
            <div class="form-fields">`;
        
        // Цикл по полям формы
        if (Object.keys(formFields).length > 0) {
          Object.entries(formFields).forEach(([key, value]) => {
            resultHtml += `<p><strong>${key}:</strong> ${value}</p>`;
          });
        } else {
          resultHtml += '<p>Нет полей формы</p>';
        }
        
        resultHtml += `
            </div>
          </div>`;
        
        resultsContainer.innerHTML = resultHtml;
      } else {
        showResult('error', result.message || 'Ошибка загрузки файлов');
      }
    } catch (error) {
      showResult('error', 'Ошибка сети: ' + error.message);
    }
    
    this.reset();
  });
  
  function showLoading(message) {
    resultsContainer.innerHTML = `
      <div class="result-item">
        <div class="loading"></div>
        ${message}
      </div>
    `;
  }
  
  function showResult(type, message, details = null) {
    let html = `
      <div class="result-item ${type}">
        <h3>${type === 'success' ? '✅' : '❌'} ${message}</h3>
    `;
    
    if (details) {
      html += '<div class="file-info">';
      
      // Показываем общую информацию
      for (const [key, value] of Object.entries(details)) {
        if (key !== 'Загруженные файлы' && key !== 'Размер файлов' && key !== 'MIME типы') {
          html += `<div class="file-detail"><strong>${key}:</strong> ${value}</div>`;
        }
      }
      
      // Показываем детальную информацию о файлах
      if (details['Загруженные файлы'] && details['Загруженные файлы'] !== 'Нет файлов') {
        html += '<div class="file-detail"><strong>Детали файлов:</strong></div>';
        
                 // Получаем данные о файлах из глобальной переменной
         if (window.lastUploadResult && window.lastUploadResult.uploadedFiles) {
           window.lastUploadResult.uploadedFiles.forEach((file, index) => {
             const fileName = file.name || 'Без имени';
             const fileSize = file.size || 0;
             const fileMime = file.mime_type || 'Неизвестно';
             const filePath = file.relative_path || 'Неизвестно';
             
             html += `
               <div class="file-detail" style="margin-left: 20px; padding: 5px; background: #f5f5f5; border-radius: 3px; margin-bottom: 5px;">
                 <strong>Файл ${index + 1}:</strong> ${fileName}<br>
                 <small>Размер: ${formatFileSize(fileSize)} | MIME: ${fileMime} | Путь: ${filePath}</small>
               </div>
             `;
           });
         }
      }
      
      html += '</div>';
    }
    
    html += '</div>';
    resultsContainer.innerHTML = html;
  }
  
  function formatFileSize(bytes) {
    console.log('🔢 formatFileSize вызвана с параметром:', bytes);
    console.log('🔢 Тип bytes:', typeof bytes);
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const result = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    console.log('🔢 Результат formatFileSize:', result);
    return result;
  }
  
  function addDemoLinks() {
    const demoLinksHtml = `
      <div class="demo-links">
        <h3>🔍 Демо функций RNode Server</h3>
        <a href="/demo/html" target="_blank">HTML Response</a>
        <a href="/demo/text" target="_blank">Text Response</a>
        <a href="/demo/xml" target="_blank">XML Response</a>
        <a href="/demo/redirect" target="_blank">Redirect Test</a>
        <a href="/demo/download" target="_blank">Download File</a>
        <a href="/api/info" target="_blank">API Info</a>
      </div>
    `;
    
    resultsContainer.insertAdjacentHTML('afterend', demoLinksHtml);
  }
});
