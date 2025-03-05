import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Heart, 
  Shuffle, 
  Repeat, 
  List, 
  Volume2, 
  VolumeX 
} from 'lucide-react';

const playlistTracks = [
  {
    id: 1,
    title: 'Midnight Echoes',
    artist: 'Lunar Drift',
    album: 'Cosmic Waves',
    duration: '3:45',
    coverArt: '/api/placeholder/80/80'
  },
  {
    id: 2,
    title: 'Electric Dreams',
    artist: 'Synth Horizon',
    album: 'Neon Nights',
    duration: '4:12',
    coverArt: '/api/placeholder/80/80'
  },
  {
    id: 3,
    title: 'Quantum Leap',
    artist: 'Stellar Pulse',
    album: 'Infinite Space',
    duration: '3:58',
    coverArt: '/api/placeholder/80/80'
  }
];

const VaultTunePlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(playlistTracks[0]);
  const [volume, setVolume] = useState(50);
  const [liked, setLiked] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState(1);

  return (
    <div className="bg-gradient-to-b from-indigo-900 to-black min-h-screen flex items-center justify-center p-4">
      <div className="flex w-full max-w-5xl bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl overflow-hidden">
        {/* Playlist Section */}
        <div className="w-1/3 bg-black p-4 overflow-y-auto max-h-[600px]">
          <div className="flex items-center mb-4">
            <List className="text-white mr-2" size={24} />
            <h3 className="text-white text-lg font-bold">Playlist</h3>
          </div>
          {playlistTracks.map((track) => (
            <div 
              key={track.id}
              className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors 
                ${activeTrackId === track.id ? 'bg-gray-800' : ''}`}
              onClick={() => {
                setCurrentTrack(track);
                setActiveTrackId(track.id);
              }}
            >
              <img 
                src={track.coverArt} 
                alt={`${track.album} cover`} 
                className="w-12 h-12 rounded-md mr-4"
              />
              <div className="flex-grow">
                <p className="text-white font-medium">{track.title}</p>
                <p className="text-gray-400 text-sm">{track.artist}</p>
              </div>
              <span className="text-gray-400 text-sm">{track.duration}</span>
            </div>
          ))}
        </div>

        {/* Player Section */}
        <div className="w-2/3 p-6 flex flex-col justify-between">
          {/* Album Cover and Track Info */}
          <div className="flex items-center mb-6">
            <img 
              src={currentTrack.coverArt} 
              alt={`${currentTrack.album} album cover`} 
              className="w-24 h-24 rounded-lg shadow-lg mr-6 transform transition-transform hover:scale-105"
            />
            <div>
              <h2 className="text-2xl font-bold text-white">{currentTrack.title}</h2>
              <p className="text-gray-400">{currentTrack.artist}</p>
            </div>
            <button 
              onClick={() => setLiked(!liked)}
              className="ml-auto transform transition-transform hover:scale-110"
            >
              <Heart 
                className={`${liked ? 'text-red-500 fill-current' : 'text-white'}`} 
                size={24} 
              />
            </button>
          </div>

          {/* Playback Controls */}
          <div>
            <div className="flex justify-center items-center space-x-6 mb-6">
              <button className="text-gray-400 hover:text-white transition-colors">
                <Shuffle size={24} />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <SkipBack size={28} />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-white text-black rounded-full p-3 hover:bg-gray-200 transition-colors"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <SkipForward size={28} />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Repeat size={24} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                <div 
                  className="bg-white h-1.5 rounded-full" 
                  style={{width: '40%'}}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>2:15</span>
                <span>-1:45</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={20} className="text-gray-400" /> : <Volume2 size={20} className="text-gray-400" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultTunePlayer;