import imageCompression from 'browser-image-compression';
import EXIF from 'exif-js';

export async function compressPhoto(file: File): Promise<string> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  } catch (error) {
    console.warn('Fallback to standard canvas compression due to:', error);
    return fileToDataUrl(file);
  }
}

export function extractExifTimestamp(file: File): Promise<Date> {
  return new Promise((resolve) => {
    try {
      EXIF.getData(file as any, function (this: any) {
        const dateTime = EXIF.getTag(this, 'DateTimeOriginal') || EXIF.getTag(this, 'DateTime');
        if (dateTime) {
          // EXIF format: "YYYY:MM:DD HH:MM:SS"
          const parts = dateTime.split(' ');
          if (parts.length === 2) {
            const dateParts = parts[0].split(':');
            const timeParts = parts[1].split(':');
            const parsedDate = new Date(
              parseInt(dateParts[0], 10),
              parseInt(dateParts[1], 10) - 1,
              parseInt(dateParts[2], 10),
              parseInt(timeParts[0], 10),
              parseInt(timeParts[1], 10),
              parseInt(timeParts[2], 10)
            );
            return resolve(parsedDate);
          }
        }
        // Fallback to file's last modified date
        resolve(new Date(file.lastModified || Date.now()));
      });
    } catch {
      resolve(new Date(file.lastModified || Date.now()));
    }
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
