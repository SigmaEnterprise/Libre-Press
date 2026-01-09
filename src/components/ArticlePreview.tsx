import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface ArticlePreviewProps {
  title: string;
  summary?: string;
  content: string;
  image?: string;
  topics?: string[];
  publishedAt?: string;
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700 p-4 my-4">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="space-y-3">
        {/* Play/Pause Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={togglePlay}
            size="sm"
            className="bg-[#f0883e] hover:bg-[#d97735] text-white"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          
          {/* Time Display */}
          <span className="text-sm text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Progress Bar */}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleMute}
            size="sm"
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24 cursor-pointer"
          />
        </div>
      </div>
    </Card>
  );
}

export function ArticlePreview({
  title,
  summary,
  content,
  image,
  topics,
  publishedAt,
}: ArticlePreviewProps) {
  return (
    <article className="prose prose-invert prose-lg max-w-none">
      {/* Header Image */}
      {image && (
        <div className="not-prose mb-8 -mx-4 sm:mx-0">
          <img
            src={image}
            alt={title}
            className="w-full h-[400px] object-cover rounded-lg"
            loading="lazy"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
        {title || 'Untitled Article'}
      </h1>

      {/* Metadata */}
      <div className="not-prose flex flex-wrap items-center gap-3 mb-8">
        {publishedAt && (
          <span className="text-sm text-gray-400">
            {new Date(parseInt(publishedAt) * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
        {topics && topics.length > 0 && (
          <>
            <span className="text-gray-600">•</span>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  #{topic}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-xl text-gray-400 mb-8 italic border-l-4 border-[#f0883e] pl-4">
          {summary}
        </p>
      )}

      {/* Content */}
      <div className="text-gray-300 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Images
            img: ({ node, ...props }) => {
              const src = props.src || '';
              const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src);
              
              if (isImage) {
                return (
                  <img
                    {...props}
                    className="rounded-lg my-6 max-w-full h-auto"
                    loading="lazy"
                  />
                );
              }
              return <img {...props} />;
            },

            // Videos
            video: ({ node, ...props }) => (
              <video
                {...props}
                controls
                className="rounded-lg my-6 max-w-full h-auto bg-gray-900"
              >
                Your browser does not support the video tag.
              </video>
            ),

            // Audio
            audio: ({ node, ...props }) => {
              const src = props.src || '';
              return <AudioPlayer src={src} />;
            },

            // Links
            a: ({ node, ...props }) => (
              <a
                {...props}
                className="text-[#f0883e] hover:text-orange-400 underline decoration-[#f0883e]/30 hover:decoration-[#f0883e] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),

            // Headings
            h1: ({ node, ...props }) => (
              <h1 {...props} className="text-4xl font-bold text-white mt-12 mb-6" />
            ),
            h2: ({ node, ...props }) => (
              <h2 {...props} className="text-3xl font-bold text-white mt-10 mb-4" />
            ),
            h3: ({ node, ...props }) => (
              <h3 {...props} className="text-2xl font-bold text-white mt-8 mb-3" />
            ),

            // Blockquotes
            blockquote: ({ node, ...props }) => (
              <blockquote
                {...props}
                className="border-l-4 border-[#f0883e] pl-4 italic text-gray-400 my-6"
              />
            ),

            // Code blocks
            code: ({ node, inline, ...props }) =>
              inline ? (
                <code
                  {...props}
                  className="bg-gray-800 text-[#f0883e] px-1.5 py-0.5 rounded text-sm font-mono"
                />
              ) : (
                <code
                  {...props}
                  className="block bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto my-6 font-mono text-sm"
                />
              ),

            // Lists
            ul: ({ node, ...props }) => (
              <ul {...props} className="list-disc list-inside space-y-2 my-6 text-gray-300" />
            ),
            ol: ({ node, ...props }) => (
              <ol {...props} className="list-decimal list-inside space-y-2 my-6 text-gray-300" />
            ),

            // Paragraphs
            p: ({ node, ...props }) => {
              // Check if paragraph contains only an audio/video element
              const child = node?.children?.[0];
              if (child && 'tagName' in child && (child.tagName === 'audio' || child.tagName === 'video')) {
                return <>{props.children}</>;
              }
              return <p {...props} className="mb-6 leading-relaxed" />;
            },

            // Tables
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6">
                <table {...props} className="min-w-full border border-gray-700" />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th {...props} className="border border-gray-700 bg-gray-800 px-4 py-2 text-left text-white" />
            ),
            td: ({ node, ...props }) => (
              <td {...props} className="border border-gray-700 px-4 py-2 text-gray-300" />
            ),

            // Horizontal rule
            hr: ({ node, ...props }) => (
              <hr {...props} className="border-gray-700 my-8" />
            ),
          }}
        >
          {content || '*No content yet*'}
        </ReactMarkdown>
      </div>
    </article>
  );
}
