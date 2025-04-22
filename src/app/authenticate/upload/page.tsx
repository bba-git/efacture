'use client';

import { useState } from 'react';
import { CecurityService } from '@/services/cecurity';
import { FileWithFingerprint } from '@/services/cecurity';

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadContentStatus, setUploadContentStatus] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
      setUploadId(null);
      setUploadContentStatus(null);
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadContentStatus(null);

    try {
      // Step 1: Start the upload process
      const fileData: FileWithFingerprint[] = Array.from(files).map(file => ({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'invoice' as const,
        source: 'not-specified'
      }));

      const result = await CecurityService.uploadFiles(fileData);
      setUploadId(result.uploadId);
      setSuccess(`Upload session created. Upload ID: ${result.uploadId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create upload session');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadContent = async () => {
    if (!selectedFiles.length || !uploadId) {
      setError('Please select files and create an upload session first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadStatus('Uploading file content...');
      
      await CecurityService.uploadFileContent(uploadId, selectedFiles);
      setUploadStatus('File content uploaded successfully!');
    } catch (error) {
      console.error('Error uploading content:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file content');
      setUploadStatus('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Upload Files</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Files
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
            <ul className="text-sm text-gray-600">
              {selectedFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleSubmit}
            disabled={uploading || !files}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${uploading || !files
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {uploading ? 'Processing...' : 'Create Upload Session'}
          </button>

          {uploadId && (
            <button
              onClick={handleUploadContent}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium
                ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {loading ? 'Uploading...' : 'Upload File Content'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {uploadStatus && (
          <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md">
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
} 