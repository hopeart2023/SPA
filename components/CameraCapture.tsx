import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { GlassButton, GlassCard } from './GlassComponents';

export const CameraCapture: React.FC<{ onCapture: (base64: string) => void; onCancel: () => void }> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Compress the image to a smaller base64 string
        const base64 = canvas.toDataURL('image/jpeg', 0.5);
        setCapturedImage(base64);
      }
    }
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      if (stream) stream.getTracks().forEach(track => track.stop());
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleCancel = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md bg-gray-900/80 border-gray-700 p-6 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4 text-white">
          <h3 className="font-bold text-lg">Capture Evidence</h3>
          <button onClick={handleCancel} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6">
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-4 w-full">
          {!capturedImage ? (
            <GlassButton onClick={capturePhoto} className="flex-1 py-4 bg-white text-black flex items-center justify-center gap-2">
              <Camera size={24} /> Capture
            </GlassButton>
          ) : (
            <>
              <GlassButton onClick={retakePhoto} className="flex-1 py-4 bg-white/20 text-white">
                Retake
              </GlassButton>
              <GlassButton onClick={confirmPhoto} className="flex-1 py-4 bg-[#1ABC9C] text-white flex items-center justify-center gap-2">
                <Check size={24} /> Use Photo
              </GlassButton>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
