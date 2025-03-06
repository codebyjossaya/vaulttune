import { Song } from "../types";


interface AudioTypes {
  'mp3': string,
  'flac': string,
  'wav': string,
  'ogg': string,
  'aac': string,
  'm4a': string,
}
export function getMimeType(song: Song) {
    // Common audio formats mapping
    const mimeTypes: AudioTypes = {
      'mp3': 'audio/mpeg',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4'
    };
  
    const container = song.metadata.format.container as keyof AudioTypes;
    
    if (container && container in mimeTypes) {
      return mimeTypes[container];
    }
  
    // Fallback to generic audio type
    return 'audio/mpeg';
}
