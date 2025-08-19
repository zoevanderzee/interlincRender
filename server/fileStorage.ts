import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';

// File storage configuration
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

export interface StoredFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export class FileStorageService {
  /**
   * Get the full path to a stored file
   */
  static getFilePath(filename: string): string {
    return path.join(UPLOADS_DIR, filename);
  }

  /**
   * Check if a file exists
   */
  static fileExists(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }

  /**
   * Get file info including metadata
   */
  static getFileInfo(filename: string): StoredFile | null {
    const filePath = this.getFilePath(filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const extension = path.extname(filename);
    
    // Try to determine mimetype from extension
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip'
    };

    return {
      id: path.parse(filename).name,
      originalName: filename,
      filename,
      mimetype: mimeMap[extension.toLowerCase()] || 'application/octet-stream',
      size: stats.size,
      path: filePath,
      uploadedAt: stats.birthtime
    };
  }

  /**
   * Serve file for viewing in browser
   */
  static serveFile(filename: string, res: Response): void {
    const fileInfo = this.getFileInfo(filename);
    
    if (!fileInfo) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileInfo.mimetype,
      'Content-Length': fileInfo.size.toString(),
      'Cache-Control': 'private, max-age=3600'
    });

    // For images and PDFs, serve inline for viewing
    if (fileInfo.mimetype.startsWith('image/') || fileInfo.mimetype === 'application/pdf') {
      res.set('Content-Disposition', `inline; filename="${fileInfo.originalName}"`);
    }

    // Stream the file
    const readStream = fs.createReadStream(fileInfo.path);
    
    readStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    readStream.pipe(res);
  }

  /**
   * Serve file for download
   */
  static downloadFile(filename: string, originalName: string | null, res: Response): void {
    const fileInfo = this.getFileInfo(filename);
    
    if (!fileInfo) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Force download with original filename
    const downloadName = originalName || fileInfo.originalName;
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileInfo.size.toString(),
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'private, max-age=0'
    });

    // Stream the file
    const readStream = fs.createReadStream(fileInfo.path);
    
    readStream.on('error', (error) => {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });

    readStream.pipe(res);
  }

  /**
   * Delete a file
   */
  static deleteFile(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (error) {
        console.error('Error deleting file:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Get file as base64 for inline viewing
   */
  static getFileAsBase64(filename: string): string | null {
    const fileInfo = this.getFileInfo(filename);
    
    if (!fileInfo) {
      return null;
    }

    try {
      const fileBuffer = fs.readFileSync(fileInfo.path);
      return `data:${fileInfo.mimetype};base64,${fileBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error reading file as base64:', error);
      return null;
    }
  }
}

// Export multer upload middleware
export const uploadMiddleware = upload;