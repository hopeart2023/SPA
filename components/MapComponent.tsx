
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { extractLocationFromAudio } from '../services/gemini';

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; title: string }>;
  onClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  center = [9.03, 38.74], // Addis Ababa
  zoom = 12,
  markers = [],
  onClick,
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const location = await extractLocationFromAudio(base64data, 'audio/webm');
            if (location && location.lat && location.lng && onClick) {
              onClick(location.lat, location.lng);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([location.lat, location.lng], 15);
              }
            }
          } catch (error) {
            console.error("Error extracting location:", error);
          } finally {
            setIsProcessing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // @ts-ignore
      mapInstanceRef.current = L.map(mapContainerRef.current).setView(center, zoom);
      // @ts-ignore
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
      
      // @ts-ignore
      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    if (onClick && interactive) {
      mapInstanceRef.current.off('click'); // Remove previous listener
      mapInstanceRef.current.on('click', (e: any) => {
        onClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      // Don't destroy map on every render, only on unmount
    };
  }, [center, zoom, onClick, interactive]);

  useEffect(() => {
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();
      markers.forEach(m => {
        // @ts-ignore
        L.marker([m.lat, m.lng]).addTo(markerGroupRef.current).bindPopup(m.title);
      });
    }
  }, [markers]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <div ref={mapContainerRef} className="absolute inset-0 shadow-inner border border-gray-200" />
      {interactive && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-full shadow-lg transition-colors ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 
            isProcessing ? 'bg-gray-400 text-white cursor-not-allowed' : 
            'bg-white text-[#2A3F54] hover:bg-gray-100'
          }`}
          title="Speak location"
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
        </button>
      )}
    </div>
  );
};
