import { Song } from '../types';

export interface LocalAudioSong extends Song {
  streamUrl: string;
}

let localSongs: LocalAudioSong[] = [];
const listeners = new Set<() => void>();

export function getLocalMusicSongs(): LocalAudioSong[] {
  return localSongs;
}

export function addLocalMusicFiles(files: FileList | File[]): LocalAudioSong[] {
  const added: LocalAudioSong[] = [];
  for (const file of Array.from(files)) {
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const parts = cleanName.split(' - ');
    const artist = parts.length > 1 ? parts[0].trim() : 'Local File';
    const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName;
    const blobUrl = URL.createObjectURL(file);
    const id = `local_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const song: LocalAudioSong = {
      videoId: id,
      title,
      artist,
      thumbnailUrl: '/logo.svg',
      streamUrl: blobUrl,
      fromAutoplay: false,
    };
    added.push(song);
  }
  localSongs = [...added, ...localSongs];
  listeners.forEach((cb) => cb());
  return localSongs;
}

export function subscribeLocalMusic(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
