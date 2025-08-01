import { Song } from "../types";


interface AudioTypes {
  'MPEG': string,
  'flac': string,
  'wav': string,
  'ogg': string,
  'aac': string,
  'm4a': string,
}
export function getMimeType(song: Song): string {
    // Common audio formats mapping
    const mimeTypes: AudioTypes = {
      'MPEG': 'audio/mpeg',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4'
    };
    console.log(song)
    const container = song.metadata.format.container as keyof AudioTypes;
    console.log(`Container detected: ${container}`);
    if (container && container in mimeTypes) {
      let type = mimeTypes[container];
      console.log(`Detected MIME type: ${type}`);
      return type;
    }
  
    // Fallback to generic audio type
    return 'audio/mpeg';
}
