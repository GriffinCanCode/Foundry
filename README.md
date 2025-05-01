# Foundry

A modern block editor application built with Electron.

## Features

- Block-based document editing (text, headings, to-do lists, code blocks, etc.)
- Drag and drop block reordering
- Document saving and loading
- Database integration
- Responsive design for desktop and mobile

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Running the Application

To start the application in production mode:

```bash
npm start
```

To start the application in development mode:

```bash
npm run dev
```

## Project Structure

- `/backend` - Electron main process code
  - `main.js` - Main process entry point
  - `preload.js` - Preload script for secure API access

- `/frontend` - Frontend UI code
  - `index.html` - Main HTML file
  - `/js` - JavaScript files
    - `editor.js` - Block editor functionality
    - `app.js` - Application logic and integration with backend
  - `/css` - CSS styles
    - `styles.css` - Main stylesheet

## How to Use

1. Create a new document using the "New Page" button in the sidebar
2. Add blocks using the "+ Add Block" buttons below the editor
3. Edit block content by clicking on them
4. Reorder blocks by dragging and dropping
5. Save your document using the "Save" button in the toolbar

## Offline Functionality

The application will save documents to local storage when running without Electron (e.g., opening the HTML file directly in a browser). When running in Electron, it will save to the filesystem.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 