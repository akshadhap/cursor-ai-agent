"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
export interface UploadFilesFormProps {
  onSubmit: (data: {
      length: number; file: File | null 
}) => Promise<void> | void;
  onCancel: () => void;
  maxFileSize?: number; // in MB, default 10MB
  allowedFileTypes?: string[]; // MIME types
  isSubmitting?: boolean; // Allow parent to control loading state
}

export interface UploadFormErrors {
  file?: string;
  general?: string;
}

const UploadFilesForm: React.FC<UploadFilesFormProps> = ({
  onSubmit,
  onCancel,
  maxFileSize = 10, // 10MB default
  allowedFileTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "application/pdf", // .pdf
  ],
  isSubmitting: externalIsSubmitting = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<UploadFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external loading state if provided, otherwise use internal state
  const submitting = externalIsSubmitting || isLoading;

  const validateFile = (file: File): string | undefined => {
    // Check file type
    if (!allowedFileTypes.includes(file.type)) {
      const allowedExtensions = allowedFileTypes
        .map((type) => {
          if (type.includes("spreadsheetml.sheet")) return ".xlsx";
          if (type.includes("ms-excel")) return ".xls";
          if (type.includes("pdf")) return ".pdf";
          return "";
        })
        .filter(Boolean);
      return `Invalid file type. Please upload only ${allowedExtensions.join(
        ", "
      )} files.`;
    }

    // Check file size (convert MB to bytes)
    const maxSizeInBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File size must be less than ${maxFileSize}MB. Current file size: ${formatFileSize(
        file.size
      )}.`;
    }

    // Check if file is empty
    if (file.size === 0) {
      return "File appears to be empty. Please select a valid file.";
    }

    // Check file name length
    if (file.name.length > 255) {
      return "File name is too long. Please rename the file to less than 255 characters.";
    }

    // Check for valid file name characters
    if (!/^[a-zA-Z0-9._\-\s()[\]{}]+$/.test(file.name)) {
      return "File name contains invalid characters. Please use only letters, numbers, spaces, and common punctuation.";
    }

    return undefined;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files.length > 1) {
        setErrors({ file: "Please upload only one file at a time." });
        return;
      }
      handleFileSelection(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Clear previous errors
    setErrors({});

    const validationError = validateFile(file);
    if (validationError) {
      setErrors({ file: validationError });
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous general errors
    setErrors((prev) => ({ ...prev, general: undefined }));

    // Validate that a file is selected
    if (!selectedFile) {
      setErrors({ file: "Please select a file to upload." });
      return;
    }

    // Re-validate the file
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setErrors({ file: validationError });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress (remove this in actual implementation)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call the onSubmit prop - this is where parent handles the upload
      await onSubmit({
        file: selectedFile,
        length: 0
      });

      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);

    } catch (error: any) {
      console.error("Error uploading file:", error);

      let errorMessage = "Failed to upload file. Please try again.";

      // Handle specific error responses
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) {
      return <FileText className="text-red-400" size={24} />;
    }
    return <FileText className="text-green-400" size={24} />;
  };

  const getAllowedExtensions = () => {
    return allowedFileTypes
      .map((type) => {
        if (type.includes("spreadsheetml.sheet")) return ".xlsx";
        if (type.includes("ms-excel")) return ".xls";
        if (type.includes("pdf")) return ".pdf";
        return "";
      })
      .filter(Boolean)
      .join(", ");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4">
        {/* General Error Message */}
        {errors.general && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500 rounded-lg">
            <AlertCircle className="text-red-400" size={16} />
            <p className="text-sm text-red-400">{errors.general}</p>
          </div>
        )}

        <div>
          <label
            className="block text-sm font-medium text-white mb-2"
            htmlFor="file-upload"
          >
            Upload File <span className="text-red-400">*</span>
          </label>

          {/* File Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-purple-500 bg-purple-500/10"
                : selectedFile && !errors.file
                ? "border-green-500 bg-green-500/10"
                : errors.file
                ? "border-red-500 bg-red-500/10"
                : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onClick={handleChooseFile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleChooseFile();
              }
            }}
            aria-describedby={errors.file ? "file-error" : "file-help"}
          >
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept={allowedFileTypes
                .map((type) => {
                  if (type.includes("spreadsheetml.sheet")) return ".xlsx";
                  if (type.includes("ms-excel")) return ".xls";
                  if (type.includes("pdf")) return ".pdf";
                  return "";
                })
                .filter(Boolean)
                .join(",")}
              onChange={handleChange}
              className="hidden"
              disabled={submitting}
              aria-invalid={!!errors.file}
            />

            {selectedFile && !errors.file ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  {getFileIcon(selectedFile)}
                  <div className="text-left">
                    <p className="text-white font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    disabled={submitting}
                    aria-label="Remove selected file"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Upload Progress */}
                {submitting && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {!submitting && (
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle className="text-green-400" size={16} />
                    <p className="text-green-400 text-sm">
                      File selected successfully!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Upload
                    className={`${
                      errors.file ? "text-red-400" : "text-gray-400"
                    }`}
                    size={32}
                  />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Drop your file here, or{" "}
                    <span className="text-purple-400 hover:text-purple-300 underline cursor-pointer">
                      browse
                    </span>
                  </p>
                  <p id="file-help" className="text-gray-400 text-sm mt-1">
                    Supports: {getAllowedExtensions()} files (max {maxFileSize}
                    MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File Error Message */}
          {errors.file && (
            <p
              id="file-error"
              className="mt-2 text-sm text-red-400 flex items-center space-x-1"
            >
              <AlertCircle size={14} />
              <span>{errors.file}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          disabled={submitting}
        >
          Close
        </button>
        <button
          type="submit"
          disabled={submitting || !selectedFile || !!errors.file}
          className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#3F4DFB] to-[#931AFA] hover:from-[#364AD9] hover:to-[#7D16D8] text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default UploadFilesForm;
