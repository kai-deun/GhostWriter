# Local Metadata Editor (GhostWriter)

A secure, local-only universal metadata reader, editor, and scrubber. Built with **Tauri**, **React**, and **Vite**, this application allows you to view and manage metadata (EXIF tags, file info, etc.) for images, videos, audio files, and documents without uploading your sensitive files to the internet.

## Features

- **Privacy First:** 100% local processing. Your files never leave your computer.
- **Universal Format Support:** Read and edit metadata for images, videos, audio, and documents (PDF, DOCX).
- **Sleek Interface:** A modern, sharp, cyber-tech UI built for professionals.
- **Metadata Scrubbing:** Strip all sensitive metadata from your files with a single click.
- **Detailed View & Edit:** View raw metadata values and edit specific tags seamlessly.

## Prerequisites

Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Rust](https://www.rust-lang.org/tools/install) (required for Tauri backend)
- System dependencies for Tauri (varies by OS, e.g., `libwebkit2gtk-4.1-dev` on Linux)

## Setup Instructions

1. **Install Dependencies:**
   Navigate to the project root and install the Node modules:
   ```bash
   npm install
   ```

2. **Run the Development Server:**
   You can run the web version of the application:
   ```bash
   npm run dev
   ```
   Or run the full desktop application using Tauri:
   ```bash
   npm run tauri dev
   ```

3. **Build for Production:**
   To build the web version:
   ```bash
   npm run build
   ```
   To build the desktop executable:
   ```bash
   npm run tauri build
   ```

## How to Use

1. **Select a File:**
   - Launch the application.
   - You can drag and drop a file directly into the application window or click the dropzone to open your native file picker.
   - Use the category filters (Image, Video, Audio, Document) to quickly filter acceptable file types.

2. **View Metadata:**
   - Once a file is loaded, the application will display all extracted metadata tags in a grid layout.
   - You can review the raw values and format types.

3. **Edit Metadata:**
   - Click the **"Edit Tags"** button at the bottom of the screen.
   - You can modify the values of existing tags or click **"+ Add Metadata Field"** to insert new custom tags.
   - Click **"Save Changes"** when finished to download or save your modified file.

4. **Scrub Metadata:**
   - If you want to remove all EXIF data for privacy reasons, simply click the **"Scrub All Metadata"** button.
   - This will generate a cleaned copy of your file.

5. **Clear File:**
   - Click **"Clear File"** to reset the workspace and upload a new file.

## Technologies Used

- **Frontend:** React, Vite, TypeScript, Vanilla CSS
- **Backend/Desktop:** Tauri (Rust)
- **Metadata Parsers:** `@uswriting/exiftool`, `pdf-lib`
