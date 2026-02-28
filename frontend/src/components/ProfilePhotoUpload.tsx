import React, { useRef, useState } from 'react';

interface Props {
  currentPhotoUrl?: string;
  userName: string;
  canEdit: boolean;
  onUpload: (file: File) => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

export default function ProfilePhotoUpload({ currentPhotoUrl, userName, canEdit, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and GIF images are allowed.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 5MB limit.';
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      setUploading(true);
      await onUpload(file);
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!canEdit) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEdit) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (canEdit && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const displayImage = preview || currentPhotoUrl;

  return (
    <div className="relative">
      <div
        className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ${
          canEdit ? 'cursor-pointer' : ''
        } ${isDragging ? 'ring-4 ring-primary ring-opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {uploading ? (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt={userName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-4xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Hover Overlay */}
        {canEdit && !uploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
            <div className="text-white text-center">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-xs mt-1">Change Photo</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-100 text-red-700 text-xs p-2 rounded shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Edit Badge */}
      {canEdit && !uploading && (
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}
