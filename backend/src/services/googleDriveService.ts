import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

class GoogleDriveService {
  private drive: any = null;
  private isInitialized = false;

  constructor() {
    this.initDrive();
  }

  private initDrive() {
    try {
      const credPath = path.resolve(ENV.GOOGLE_DRIVE_CREDENTIALS_PATH);
      if (fs.existsSync(credPath)) {
        const auth = new google.auth.GoogleAuth({
          keyFile: credPath,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.drive = google.drive({ version: 'v3', auth });
        this.isInitialized = true;
        console.log('✅ Google Drive API initialized successfully with service account credentials.');
      } else {
        console.warn(`⚠️ credentials.json not found at ${credPath}. Google Drive API running in Mock/Local mode.`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error);
    }
  }

  private async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    if (!this.isInitialized || !this.drive) {
      return `mock_folder_${name.replace(/\s+/g, '_')}`;
    }

    try {
      let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
      }

      // Create new folder
      const folderMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        folderMetadata.parents = [parentId];
      }

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      return folder.data.id!;
    } catch (error) {
      console.error(`Error in findOrCreateFolder (${name}):`, error);
      return `mock_folder_${name.replace(/\s+/g, '_')}`;
    }
  }

  /**
   * Ensures tree structure: [Drive Root] / [Projeto] / [Professor] / [Escola] / [MM_AAAA] /
   */
  public async ensureFolderStructure(
    projectName: string = 'Projeto Cultural',
    teacherName: string,
    schoolName: string,
    monthYear: string
  ): Promise<{
    monthFolderId: string;
    ensaiosFolderId: string;
    eventosFolderId: string;
    relatoriosFolderId: string;
  }> {
    const parentId = ENV.GOOGLE_DRIVE_PARENT_FOLDER_ID || undefined;

    const projectFolderId = await this.findOrCreateFolder(projectName, parentId);
    const teacherFolderId = await this.findOrCreateFolder(teacherName, projectFolderId);
    const schoolFolderId = await this.findOrCreateFolder(schoolName, teacherFolderId);
    const monthFolderId = await this.findOrCreateFolder(monthYear, schoolFolderId);

    const ensaiosFolderId = await this.findOrCreateFolder('Ensaios', monthFolderId);
    const eventosFolderId = await this.findOrCreateFolder('Eventos', monthFolderId);
    const relatoriosFolderId = await this.findOrCreateFolder('Relatorios_PDF', monthFolderId);

    return {
      monthFolderId,
      ensaiosFolderId,
      eventosFolderId,
      relatoriosFolderId,
    };
  }

  /**
   * Upload file to target Google Drive folder
   */
  public async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    parentFolderId: string
  ): Promise<string> {
    if (!this.isInitialized || !this.drive) {
      console.log(`[Mock Drive] Uploaded ${fileName} to folder ${parentFolderId}`);
      return `mock_file_id_${Date.now()}`;
    }

    try {
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId],
      };
      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      const file = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id',
      });

      return file.data.id!;
    } catch (error) {
      console.error(`Error uploading file ${fileName} to Drive:`, error);
      return `mock_file_id_${Date.now()}`;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
