import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  FlipHorizontal,
  RefreshCw,
  Upload
} from 'lucide-react';
import { Modal } from '../common/Modal';
import './CameraCaptureModal.css';

export const CameraCaptureModal = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null); // base64 / data URL
  const [cameraError, setCameraError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileFallbackInputRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start device camera
  const startCamera = useCallback(async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    setIsStarting(true);
    setCapturedImage(null);

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera capture is not supported in this browser. You can select or take a photo using your device file picker below.');
      setIsStarting(false);
      return;
    }

    try {
      // First attempt with preferred facing mode
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (e) {
        // Fallback to basic video without resolution/facing constraints
        console.warn('Fallback to default video camera:', e.message);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser address bar and try again, or use file upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on your computer or phone. Please connect a webcam or upload a photo.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Your camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to start camera'}. You can upload an image file instead.`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [facingMode, stopCamera]);

  // When modal opens, start camera; when closes, stop camera
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  // Take snapshot
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use video actual dimensions
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame onto canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Export high-quality JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Pause video while reviewing
    try {
      video.pause();
    } catch {}
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Confirm photo and send to doubt solver
  const handleUsePhoto = async () => {
    if (!capturedImage) return;

    // Convert data URL to Blob / File
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `camera_capture_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Strip base64 header for Gemini
      const base64Data = capturedImage.includes(',') ? capturedImage.split(',')[1] : capturedImage;

      onCapture({
        type: 'image',
        file,
        fileName,
        fileSize: blob.size,
        mimeType: 'image/jpeg',
        previewUrl: capturedImage,
        base64: base64Data
      });

      stopCamera();
      onClose();
    } catch (err) {
      console.error('Error processing captured photo:', err);
    }
  };

  // Toggle front/back camera (mobile)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Native mobile fallback input
  const handleFallbackFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      onCapture({
        type: 'image',
        file,
        fileName: file.name || `photo_${Date.now()}.jpg`,
        fileSize: file.size,
        mimeType: file.type || 'image/jpeg',
        previewUrl: dataUrl,
        base64: base64Data
      });
      stopCamera();
      onClose();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title=""
      size="lg"
    >
      <div className="camera-modal-content">
        {/* Header */}
        <div className="camera-modal-header">
          <div className="camera-title-group">
            <div className="camera-icon-badge">
              <Camera size={18} />
            </div>
            <div>
              <h3>Capture Academic Problem</h3>
              <p>Point your camera at a textbook question, handwritten notes, or whiteboard</p>
            </div>
          </div>
          <button
            type="button"
            className="camera-close-icon-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport / Stage */}
        <div className="camera-viewport-box">
          {cameraError ? (
            <div className="camera-error-screen">
              <AlertCircle size={40} className="camera-error-icon" />
              <h4>Camera Not Available</h4>
              <p>{cameraError}</p>
              <div className="camera-error-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => startCamera(facingMode)}
                >
                  <RefreshCw size={14} /> Retry Permission
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => fileFallbackInputRef.current?.click()}
                >
                  <Upload size={14} /> Select Photo from Device
                </button>
                <input
                  ref={fileFallbackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFallbackFileChange}
                />
              </div>
            </div>
          ) : capturedImage ? (
            /* Review captured photo */
            <div className="camera-review-screen">
              <img
                src={capturedImage}
                alt="Captured study problem"
                className="captured-img-preview"
              />
              <div className="review-badge-pill">
                <Check size={14} /> Photo Captured
              </div>
            </div>
          ) : (
            /* Live camera stream */
            <div className="camera-live-stream-wrap">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-live-video"
              />
              <div className="camera-guide-frame">
                <div className="guide-corner top-left"></div>
                <div className="guide-corner top-right"></div>
                <div className="guide-corner bottom-left"></div>
                <div className="guide-corner bottom-right"></div>
                <span className="guide-instruction-pill">Align problem inside frame</span>
              </div>
              {isStarting && (
                <div className="camera-starting-loader">
                  <div className="spinner-camera"></div>
                  <span>Initializing camera...</span>
                </div>
              )}
            </div>
          )}

          {/* Hidden Canvas for snapshot generation */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Bottom Actions Bar */}
        <div className="camera-actions-toolbar">
          {capturedImage ? (
            <div className="captured-confirm-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetake}
              >
                <RotateCcw size={16} /> Retake
              </button>
              <button
                type="button"
                className="btn btn-primary btn-use-photo"
                onClick={handleUsePhoto}
              >
                <Check size={18} /> Use This Photo
              </button>
            </div>
          ) : (
            <div className="live-controls-row">
              <button
                type="button"
                className="btn-flip-camera"
                onClick={toggleFacingMode}
                title="Switch front/back camera"
                disabled={Boolean(cameraError) || isStarting}
              >
                <FlipHorizontal size={18} />
              </button>

              <button
                type="button"
                className="btn-snap-shutter"
                onClick={handleSnap}
                disabled={Boolean(cameraError) || isStarting || !stream}
                title="Take photo"
                aria-label="Capture photo"
              >
                <div className="shutter-inner-circle"></div>
              </button>

              <button
                type="button"
                className="btn-upload-fallback"
                onClick={() => fileFallbackInputRef.current?.click()}
                title="Select from gallery"
              >
                <Upload size={18} />
              </button>
              <input
                ref={fileFallbackInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFallbackFileChange}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

