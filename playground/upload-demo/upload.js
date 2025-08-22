// RNode Server - Multipart Upload Demo JavaScript

document.addEventListener('DOMContentLoaded', function() {
  const resultsContainer = document.getElementById('results');
  
  // Add demo links
  addDemoLinks();
  
  // Handler for single file upload
  document.getElementById('singleUpload').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const fileInput = this.querySelector('input[type="file"]');
    const subfolderSelect = document.getElementById('singleSubfolder');
    
    if (!fileInput.files.length) {
      showResult('error', 'Please select a file');
      return;
    }
    
    if (!subfolderSelect.value) {
      showResult('error', 'Please select a folder');
      return;
    }
    
    showLoading('Uploading file...');
    
    try {
      // Form URL with wildcard path or query parameter
      let uploadUrl;
      if (subfolderSelect.value) {
        // Use wildcard path for better SEO and readability
        uploadUrl = `/upload/${subfolderSelect.value}`;
      } else {
        uploadUrl = '/upload';
      }
      console.log('📤 Uploading file to folder:', subfolderSelect.value, 'URL:', uploadUrl);
      
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
      
      console.log('🔍 Upload response:', result); // For debugging
      console.log('🔍 Result type:', typeof result);
      console.log('🔍 result.success:', result?.success);
      console.log('🔍 result.uploadedFiles:', result?.uploadedFiles);
      
      // Check that result is an object
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (result.success) {
        // Check that fields exist before using
        const uploadedFiles = result.uploadedFiles || [];
        const totalFiles = result.totalFiles || 0;
        const formFields = result.formFields || {};
        
        // Save result for displaying details
        window.lastUploadResult = result;
        
        // Determine subfolder from relative path
        let subfolder = 'Root folder';
        if (uploadedFiles.length > 0 && uploadedFiles[0].relative_path && uploadedFiles[0].relative_path.includes('/')) {
          const pathParts = uploadedFiles[0].relative_path.split('/');
          if (pathParts.length >= 2) {
            // Show full folder path (e.g., "documents/2024/january")
            subfolder = pathParts.slice(0, -1).join('/');
          } else {
            subfolder = pathParts[0];
          }
        }
        
        // Display upload result
        let resultHtml = `
          <div class="result success">
            <h3>✅ File uploaded successfully</h3>
            <p><strong>File count:</strong> ${totalFiles}</p>
            <p><strong>Subfolder:</strong> ${subfolder}</p>
            
            <h4>Uploaded files:</h4>
            <div class="uploaded-files">`;
        
        // Loop through uploaded files
        uploadedFiles.forEach((file, index) => {
          resultHtml += `
            <div class="file-details">
              <p><strong>File ${index + 1}:</strong></p>
              <ul>
                <li><strong>Name:</strong> ${file.name || 'No name'}</li>
                <li><strong>Size:</strong> ${formatFileSize(file.size || 0)}</li>
                <li><strong>MIME type:</strong> ${file.mime_type || 'Unknown'}</li>
                <li><strong>Relative path:</strong> ${file.relative_path || 'Unknown'}</li>
              </ul>
            </div>`;
        });
        
        resultHtml += `
            </div>
            
            <h4>Form Fields:</h4>
            <div class="form-fields">`;
        
        // Loop through form fields
        if (Object.keys(formFields).length > 0) {
          Object.entries(formFields).forEach(([key, value]) => {
            resultHtml += `<p><strong>${key}:</strong> ${value}</p>`;
          });
        } else {
          resultHtml += '<p>No form fields</p>';
        }
        
        resultHtml += `
            </div>
          </div>`;
        
        resultsContainer.innerHTML = resultHtml;
      } else {
        showResult('error', result.message || 'File upload error');
      }
    } catch (error) {
      showResult('error', 'Network error: ' + error.message);
    }
    
    this.reset();
  });
  
  // Handler for multiple file upload
  document.getElementById('multipleUpload').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const fileInput = this.querySelector('input[type="file"]');
    const subfolderSelect = document.getElementById('multipleSubfolder');
    
    if (!fileInput.files.length) {
      showResult('error', 'Please select files');
      return;
    }
    
    if (!subfolderSelect.value) {
      showResult('error', 'Please select a folder');
      return;
    }
    
    showLoading(`Uploading ${fileInput.files.length} file(s)...`);
    
    try {
      // Form URL with wildcard path or query parameter
      let uploadUrl;
      if (subfolderSelect.value) {
        // Use wildcard path for better SEO and readability
        uploadUrl = `/upload-multiple/${subfolderSelect.value}`;
      } else {
        uploadUrl = '/upload-multiple';
      }
      console.log('📤 Uploading files to folder:', subfolderSelect.value, 'URL:', uploadUrl);
      
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
      
      console.log('Multiple upload response:', result); // For debugging
      
      // Check that result is an object
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (result.success) {
        // Check that fields exist before using
        const uploadedFiles = result.uploadedFiles || [];
        const totalFiles = result.totalFiles || 0;
        const formFields = result.formFields || {};
        
        // Save result for displaying details
        window.lastUploadResult = result;
        
        // Determine subfolder from relative path
        let subfolder = 'Root folder';
        if (uploadedFiles.length > 0 && uploadedFiles[0].relative_path && uploadedFiles[0].relative_path.includes('/')) {
          const pathParts = uploadedFiles[0].relative_path.split('/');
          if (pathParts.length >= 2) {
            // Show full folder path (e.g., "documents/2024/january")
            subfolder = pathParts.slice(0, -1).join('/');
          } else {
            subfolder = pathParts[0];
          }
        }
        
        // Display upload result
        let resultHtml = `
          <div class="result success">
            <h3>✅ Files uploaded successfully</h3>
            <p><strong>File count:</strong> ${totalFiles}</p>
            <p><strong>Subfolder:</strong> ${subfolder}</p>
            
            <h4>Uploaded files:</h4>
            <div class="uploaded-files">`;
        
        // Loop through uploaded files
        uploadedFiles.forEach((file, index) => {
          resultHtml += `
            <div class="file-details">
              <p><strong>File ${index + 1}:</strong></p>
              <ul>
                <li><strong>Name:</strong> ${file.name || 'No name'}</li>
                <li><strong>Size:</strong> ${formatFileSize(file.size || 0)}</li>
                <li><strong>MIME type:</strong> ${file.mime_type || 'Unknown'}</li>
                <li><strong>Relative path:</strong> ${file.relative_path || 'Unknown'}</li>
              </ul>
            </div>`;
        });
        
        resultHtml += `
            </div>
            
            <h4>Form Fields:</h4>
            <div class="form-fields">`;
        
        // Loop through form fields
        if (Object.keys(formFields).length > 0) {
          Object.entries(formFields).forEach(([key, value]) => {
            resultHtml += `<p><strong>${key}:</strong> ${value}</p>`;
          });
        } else {
          resultHtml += '<p>No form fields</p>';
        }
        
        resultHtml += `
            </div>
          </div>`;
        
        resultsContainer.innerHTML = resultHtml;
      } else {
        showResult('error', result.message || 'File upload error');
      }
    } catch (error) {
      showResult('error', 'Network error: ' + error.message);
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
      
      // Show general information
      for (const [key, value] of Object.entries(details)) {
        if (key !== 'Uploaded files' && key !== 'File sizes' && key !== 'MIME types') {
          html += `<div class="file-detail"><strong>${key}:</strong> ${value}</div>`;
        }
      }
      
      // Show detailed file information
      if (details['Uploaded files'] && details['Uploaded files'] !== 'No files') {
        html += '<div class="file-detail"><strong>File details:</strong></div>';
        
                 // Get file data from global variable
         if (window.lastUploadResult && window.lastUploadResult.uploadedFiles) {
           window.lastUploadResult.uploadedFiles.forEach((file, index) => {
             const fileName = file.name || 'No name';
             const fileSize = file.size || 0;
             const fileMime = file.mime_type || 'Unknown';
             const filePath = file.relative_path || 'Unknown';
             
             html += `
               <div class="file-detail" style="margin-left: 20px; padding: 5px; background: #f5f5f5; border-radius: 3px; margin-bottom: 5px;">
                 <strong>File ${index + 1}:</strong> ${fileName}<br>
                 <small>Size: ${formatFileSize(fileSize)} | MIME: ${fileMime} | Path: ${filePath}</small>
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
    console.log('🔢 formatFileSize called with parameter:', bytes);
    console.log('🔢 bytes type:', typeof bytes);
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const result = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    console.log('🔢 formatFileSize result:', result);
    return result;
  }
  
  function addDemoLinks() {
    const demoLinksHtml = `
      <div class="demo-links">
        <h3>🔍 RNode Server Demo Functions</h3>
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
