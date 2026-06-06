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
- **Metadata Parsers:** `@uswriting/exiftool`, `pdf-lib`, `jszip`

## Architecture & Code Separation

To ensure system reliability and isolate errors, the parsing engine is separated into domain-specific modules under `src/utils/parsers/`:
- **`imageParser.ts`**: Handles image and raw formats (JPEG/JPG, PNG, GIF, TIFF, RAW, SVG, WebP) using browser-level ExifTool.
- **`audioParser.ts`**: Handles audio formats (MP3, WAV, FLAC, AAC, M4A). Features standalone scrubbing for tags, and native write integration.
- **`videoParser.ts`**: Handles video formats (MP4, MOV, AVI, MKV, WebM), with warning mechanisms for format limits.
- **`documentParser.ts`**: Handles document formats (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, RTF). Integrates zip-based modifications for modern Office Open XML formats.

---

## Supported File Types & Operations

Below is the complete list of supported file formats, along with their edit and scrub support statuses:

### 📷 Photos & Images
| Format | Read | Edit | Scrub | Notes / Details |
| :--- | :---: | :---: | :---: | :--- |
| **JPEG / JPG** | ✅ | ✅ | ✅ | Full tag modification and profile stripping via ExifTool. |
| **PNG** | ✅ | ✅ | ✅ | Edits text chunks; strips optional chunks. |
| **GIF** | ✅ | ✅ | ✅ | Supported via ExifTool. |
| **TIFF** | ✅ | ✅ | ✅ | Full EXIF tag support. |
| **RAW (RW2, etc.)** | ✅ | ✅ | ✅ | Supported raw image formats. |
| **SVG** | ✅ | ✅ | ✅ | ExifTool metadata parsing. |
| **WebP** | ✅ | ✅ | ✅ | Reads and modifies WebP metadata chunks. |

### 🎥 Videos
| Format | Read | Edit | Scrub | Notes / Details |
| :--- | :---: | :---: | :---: | :--- |
| **MP4** | ✅ | ✅ | ✅ | QuickTime/ISO metadata support. |
| **MOV** | ✅ | ✅ | ✅ | Full support for QuickTime userdata and tags. |
| **WebM** | ✅ | 🔒 | 🔒 | Read-only. Matroska container restrictions apply. |
| **MKV** | ✅ | 🔒 | 🔒 | Read-only. Requires native tools like `mkvpropedit` to write. |
| **AVI** | ✅ | 🔒 | 🔒 | Read-only. RIFF format has browser-write constraints. |

### 🎵 Audio
| Format | Read | Edit | Scrub | Notes / Details |
| :--- | :---: | :---: | :---: | :--- |
| **FLAC** | ✅ | ✅ | ✅ | Modifies and removes Vorbis comment tags. |
| **M4A** | ✅ | ✅ | ✅ | Modifies and removes QuickTime/iTunes metadata atoms. |
| **MP3** | ✅ | ✅ | ✅ | Support for ID3 tag reading, editing, and scrubbing. |
| **AAC** | ✅ | ❌ | ❌ | Raw bitstream container lacks standard metadata support. |
| **WAV** | ✅ | 🔒 | 🔒 | Read-only. RIFF metadata container write restrictions. |

### 📄 Documents
| Format | Read | Edit | Scrub | Notes / Details |
| :--- | :---: | :---: | :---: | :--- |
| **PDF** | ✅ | ✅ | ✅ | PDF Info Dictionary and XMP stream editing/stripping. |
| **DOCX** | ✅ | ✅ | ✅ | XML zip-based editing of `docProps/core.xml`. |
| **XLSX** | ✅ | ✅ | ✅ | XML zip-based editing of `docProps/core.xml`. |
| **PPTX** | ✅ | ✅ | ✅ | XML zip-based editing of `docProps/core.xml`. |
| **DOC / XLS / PPT** | ✅ | 🔒 | 🔒 | Legacy binary format. Read-only (Convert to `.docx/.xlsx/.pptx`). |
| **RTF** | ✅ | 🔒 | 🔒 | Rich Text Format. Read-only. |
| **TXT / CSV** | ❌ | ❌ | ❌ | Plaintext format (does not contain embedded metadata). |

*Legend: ✅ Full Support | 🔒 Blocked (Read-Only Warning) | ❌ Unsupported*
