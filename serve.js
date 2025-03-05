const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const TESTING_FOLDER = path.join(__dirname, 'testing');

const server = http.createServer((req, res) => {
    // Get the file path from the URL
    let filePath = path.join(TESTING_FOLDER, req.url === '/' ? 'index.html' : req.url);
    
    // Get the extension of the requested file
    const extname = path.extname(filePath);
    
    // Default content type
    let contentType = 'text/html';
    
    // Set the content type based on file extension
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
        case '.mp3':
            contentType = 'audio/jpeg';
            break;
    }
    
    // Read the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Page not found
                res.writeHead(404);
                res.end('File not found');
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Serving files from ${TESTING_FOLDER}`);
});