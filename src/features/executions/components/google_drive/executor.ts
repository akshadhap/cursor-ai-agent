import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import FormData from "form-data";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import type { GoogleDriveFormValues } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

const compileTemplate = (template: string | undefined, context: Record<string, unknown>): string => {
  if (!template || template.trim().length === 0) return "";
  try {
    const compiled = Handlebars.compile(template, { noEscape: true });
    return compiled(context);
  } catch {
    return template;
  }
};

// Get default export format for Google Workspace files
const getDefaultExportFormat = (mimeType: string): string => {
  const formatMap: Record<string, string> = {
    "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.google-apps.drawing": "application/pdf",
    "application/vnd.google-apps.form": "application/zip",
  };
  return formatMap[mimeType] || "application/pdf";
};

// Extract file ID from Google Drive URL
const extractFileIdFromUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  
  // Patterns:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://docs.google.com/document/d/FILE_ID/edit
  // https://docs.google.com/spreadsheets/d/FILE_ID/edit
  // https://drive.google.com/uc?id=FILE_ID
  // https://drive.google.com/uc?export=download&id=FILE_ID
  // https://drive.google.com/drive/folders/FOLDER_ID (folder URL)
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,  // Folder URL pattern
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  // If no pattern matches, check if it's a raw file ID (alphanumeric with dashes/underscores, typical length 25-50)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }
  
  return null;
};

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const UPLOAD_CHUNK_SIZE = 256 * 1024; // 256KB chunks for resumable upload

// Public operations that don't require credentials
const PUBLIC_OPERATIONS = ["download_public_file", "get_public_file_info"];

export const googleDriveExecutor: NodeExecutor<GoogleDriveFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    googleDriveChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.operation) {
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Google Drive node: Operation is required");
  }

  if (!data.variableName) {
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Google Drive node: Variable name is required");
  }

  const isPublicOperation = PUBLIC_OPERATIONS.includes(data.operation);

  // Handle PUBLIC operations (no credentials needed)
  if (isPublicOperation) {
    try {
      const result = await step.run(`google-drive-${data.operation}`, async () => {
        const publicUrl = compileTemplate(data.publicFileUrl, context);
        
        if (!publicUrl) {
          throw new NonRetriableError("Google Drive node: Public file URL is required");
        }

        const fileId = extractFileIdFromUrl(publicUrl);
        if (!fileId) {
          throw new NonRetriableError(`Google Drive node: Could not extract file ID from URL "${publicUrl}". Please provide a valid Google Drive URL like: https://drive.google.com/file/d/FILE_ID/view`);
        }

        if (data.operation === "download_public_file") {
          // For public files, use the export/download URL
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          
          try {
            const response = await ky.get(downloadUrl, {
              timeout: 60000,
            });
            
            const contentType = response.headers.get("content-type") || "application/octet-stream";
            const isText = contentType.includes("text") || contentType.includes("json");
            
            if (isText) {
              const text = await response.text();
              return {
                success: true,
                fileId,
                content: text,
                contentType,
                downloadUrl,
              };
            } else {
              // For binary files, return the download URL
              return {
                success: true,
                fileId,
                downloadUrl,
                contentType,
                message: "Binary file - use downloadUrl to access the file",
              };
            }
          } catch (error) {
            throw new NonRetriableError(
              `Failed to download public file. Make sure the file is set to "Anyone with the link can view". Error: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }

        if (data.operation === "get_public_file_info") {
          // Use the API key-less endpoint for public files
          try {
            const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
              searchParams: {
                fields: "id,name,mimeType,size,modifiedTime,webViewLink,webContentLink",
                key: "public", // This won't work without API key, so we'll use alternative
              },
              timeout: 30000,
            }).json<Record<string, unknown>>();
            
            return {
              success: true,
              ...response,
            };
          } catch {
            // Fallback: construct basic info from the URL
            return {
              success: true,
              fileId,
              webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
              downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
              message: "Limited info available for public files without API key",
            };
          }
        }

        throw new NonRetriableError(`Unknown public operation: ${data.operation}`);
      });

      await publish(
        googleDriveChannel().status({
          nodeId,
          status: "success",
        }),
      );

      return {
        ...context,
        [data.variableName]: result,
      };
    } catch (error) {
      await publish(
        googleDriveChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw error;
    }
  }

  // For non-public operations, require credentials
  if (!data.credentialId) {
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Google Drive node: Credential is required for this operation");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-google-drive-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Google Drive node: Credential not found");
  }

  // Decrypt the credential (expects OAuth access token or JSON with refresh token)
  const accessToken = await step.run("decrypt-google-drive-credential", async () => {
    const decrypted = await decrypt(credential.value);
    try {
      const parsed = JSON.parse(decrypted);
      return parsed.access_token || parsed.accessToken || decrypted;
    } catch {
      return decrypted;
    }
  });

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const supportsAllDrives = data.supportsAllDrives !== false;

  try {
    const result = await step.run(`google-drive-${data.operation}`, async () => {
      const operation = data.operation;

    // ============ FILE OPERATIONS ============

    if (operation === "list_files") {
      const folderId = compileTemplate(data.folderId, context) || "root";
      const query = folderId === "root" 
        ? "'root' in parents and trashed = false"
        : `'${folderId}' in parents${data.includeTrash ? "" : " and trashed = false"}`;
      
      const response = await ky.get(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        searchParams: {
          q: query,
          pageSize: data.pageSize || 100,
          orderBy: data.orderBy || "modifiedTime desc",
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, parents)",
          supportsAllDrives,
          includeItemsFromAllDrives: supportsAllDrives,
        },
      }).json<Record<string, unknown>>();
      
      return response;
    }

    if (operation === "get_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      const fields = data.fields || "id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, parents, description, starred, trashed";
      
      const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          fields,
          supportsAllDrives,
        },
      }).json<Record<string, unknown>>();
      
      return response;
    }

    if (operation === "create_file") {
      const fileName = compileTemplate(data.fileName, context);
      if (!fileName) throw new NonRetriableError("File name is required");

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: data.mimeType || "text/plain",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      if (data.fileDescription) {
        metadata.description = compileTemplate(data.fileDescription, context);
      }

      const content = compileTemplate(data.fileContent, context);

      // Use multipart upload for files with content
      if (content) {
        const boundary = "-------314159265358979323846";
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartBody = 
          delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${data.mimeType || "text/plain"}\r\n\r\n` +
          content +
          closeDelimiter;

        const response = await ky.post(`${GOOGLE_UPLOAD_API}/files`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary="${boundary}"`,
          },
          body: multipartBody,
          searchParams: {
            uploadType: "multipart",
            supportsAllDrives,
            fields: "id, name, mimeType, webViewLink",
          },
        }).json<Record<string, unknown>>();

        return response;
      }

      // Metadata-only creation
      const response = await ky.post(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "update_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      const metadata: Record<string, unknown> = {};
      
      if (data.fileName) {
        metadata.name = compileTemplate(data.fileName, context);
      }
      if (data.fileDescription) {
        metadata.description = compileTemplate(data.fileDescription, context);
      }

      const content = compileTemplate(data.fileContent, context);

      if (content) {
        const boundary = "-------314159265358979323846";
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartBody = 
          delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${data.mimeType || "text/plain"}\r\n\r\n` +
          content +
          closeDelimiter;

        const response = await ky.patch(`${GOOGLE_UPLOAD_API}/files/${fileId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary="${boundary}"`,
          },
          body: multipartBody,
          searchParams: {
            uploadType: "multipart",
            supportsAllDrives,
            fields: "id, name, mimeType, modifiedTime, webViewLink",
          },
        }).json<Record<string, unknown>>();

        return response;
      }

      // Metadata-only update
      const response = await ky.patch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, modifiedTime, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "download_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      // First get file metadata to check mimeType
      const fileInfo = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          fields: "id, name, mimeType, size",
          supportsAllDrives,
        },
      }).json<{ id: string; name: string; mimeType: string; size?: string }>();

      const isGoogleWorkspaceFile = fileInfo.mimeType.startsWith("application/vnd.google-apps.");

      // For Google Workspace files (Docs, Sheets, etc.), use export instead of download
      if (isGoogleWorkspaceFile) {
        const exportMimeType = data.exportFormat || getDefaultExportFormat(fileInfo.mimeType);
        
        const exportResponse = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}/export`, {
          headers,
          searchParams: {
            mimeType: exportMimeType,
          },
          timeout: 300000,
        });

        // Check if binary format
        const isBinary = exportMimeType.includes("pdf") || 
                        exportMimeType.includes("openxmlformats") ||
                        exportMimeType.includes("ms-excel") ||
                        exportMimeType.includes("ms-powerpoint") ||
                        exportMimeType.includes("msword");

        if (isBinary) {
          const arrayBuffer = await exportResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          return {
            fileId,
            fileName: fileInfo.name,
            mimeType: exportMimeType,
            content: base64,
            encoding: "base64",
            size: arrayBuffer.byteLength,
          };
        } else {
          const text = await exportResponse.text();
          return {
            fileId,
            fileName: fileInfo.name,
            mimeType: exportMimeType,
            content: text,
            encoding: "utf-8",
            size: text.length,
          };
        }
      }

      // For regular files, download as binary
      const downloadResponse = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          alt: "media",
          supportsAllDrives,
        },
        timeout: 300000,
      });

      const contentType = downloadResponse.headers.get("content-type") || "application/octet-stream";
      const isTextFile = contentType.includes("text") || 
                        contentType.includes("json") ||
                        contentType.includes("xml") ||
                        contentType.includes("javascript");

      if (isTextFile) {
        const text = await downloadResponse.text();
        return {
          fileId,
          fileName: fileInfo.name,
          mimeType: contentType,
          content: text,
          encoding: "utf-8",
          size: text.length,
        };
      } else {
        const arrayBuffer = await downloadResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          fileId,
          fileName: fileInfo.name,
          mimeType: contentType,
          content: base64,
          encoding: "base64",
          size: arrayBuffer.byteLength,
        };
      }
    }

    if (operation === "upload_file") {
      const fileName = compileTemplate(data.fileName, context);
      if (!fileName) throw new NonRetriableError("File name is required");

      const content = compileTemplate(data.fileContent, context);
      if (!content) throw new NonRetriableError("File content is required");

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: data.mimeType || "application/octet-stream",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      // Check if content is base64
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(content.replace(/\s/g, ""));
      const fileBuffer = isBase64 ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
      const contentLength = fileBuffer.length;
      const mimeType = data.mimeType || "application/octet-stream";

      let uploadId: string;

      // Use multipart upload for small files (<5MB)
      if (contentLength < 5 * 1024 * 1024) {
        const multiPartBody = new FormData();
        multiPartBody.append("metadata", JSON.stringify(metadata), {
          contentType: "application/json",
        });
        multiPartBody.append("data", fileBuffer, {
          contentType: mimeType,
          filename: fileName,
        });

        const response = await ky.post(`${GOOGLE_UPLOAD_API}/files`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${multiPartBody.getBoundary()}`,
            "Content-Length": String(multiPartBody.getLengthSync()),
          },
          body: multiPartBody as unknown as BodyInit,
          searchParams: {
            uploadType: "multipart",
            supportsAllDrives,
            fields: "id, name, mimeType, size, webViewLink",
          },
          timeout: 300000, // 5 minutes for large files
        }).json<Record<string, unknown>>();

        uploadId = response.id as string;
      } else {
        // Use resumable upload for large files (>5MB)
        const resumableResponse = await ky.post(`${GOOGLE_UPLOAD_API}/files`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          json: metadata,
          searchParams: {
            uploadType: "resumable",
            supportsAllDrives,
          },
        });

        const uploadUrl = resumableResponse.headers.get("location");
        if (!uploadUrl) {
          throw new NonRetriableError("Failed to get resumable upload URL");
        }

        // Upload file in chunks
        let offset = 0;
        let finalResponse: Record<string, unknown> | null = null;
        
        while (offset < contentLength) {
          const chunk = fileBuffer.slice(offset, Math.min(offset + UPLOAD_CHUNK_SIZE, contentLength));
          const nextOffset = offset + chunk.length;
          const isLastChunk = nextOffset >= contentLength;

          try {
            const chunkResponse = await ky.put(uploadUrl, {
              headers: {
                "Content-Length": String(chunk.length),
                "Content-Range": `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
              },
              body: chunk,
              timeout: 300000,
            });
            
            // Last chunk returns 200/201 with file metadata
            if (isLastChunk && (chunkResponse.status === 200 || chunkResponse.status === 201)) {
              finalResponse = await chunkResponse.json<Record<string, unknown>>();
            }
          } catch (error) {
            // Handle 308 Resume Incomplete (not an error for chunked uploads)
            if (error instanceof Error && error.message.includes("308")) {
              // Continue to next chunk
            } else {
              throw error;
            }
          }

          offset = nextOffset;
        }

        if (!finalResponse) {
          throw new NonRetriableError("Failed to get file metadata from resumable upload");
        }

        uploadId = finalResponse.id as string;
      }

      // Get final file info
      const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${uploadId}`, {
        headers,
        searchParams: {
          fields: "id, name, mimeType, size, webViewLink, parents",
          supportsAllDrives,
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "copy_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      const metadata: Record<string, unknown> = {};
      
      if (data.fileName) {
        metadata.name = compileTemplate(data.fileName, context);
      }
      if (data.destinationFolderId) {
        metadata.parents = [compileTemplate(data.destinationFolderId, context)];
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files/${fileId}/copy`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink, parents",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "move_file") {
      const fileId = compileTemplate(data.fileId, context);
      const destinationFolderId = compileTemplate(data.destinationFolderId, context);
      
      if (!fileId) throw new NonRetriableError("File ID is required");
      if (!destinationFolderId) throw new NonRetriableError("Destination folder ID is required");

      // First get current parents
      const fileInfo = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          fields: "parents",
          supportsAllDrives,
        },
      }).json<{ parents?: string[] }>();

      const previousParents = (fileInfo.parents || []).join(",");

      const response = await ky.patch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          addParents: destinationFolderId,
          removeParents: previousParents,
          supportsAllDrives,
          fields: "id, name, parents, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "delete_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      await ky.delete(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        headers,
        searchParams: {
          supportsAllDrives,
        },
      });

      return { success: true, deletedFileId: fileId };
    }

    if (operation === "search_files") {
      const query = compileTemplate(data.searchQuery, context);
      if (!query) throw new NonRetriableError("Search query is required");

      const response = await ky.get(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        searchParams: {
          q: query,
          pageSize: data.pageSize || 100,
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
          supportsAllDrives,
          includeItemsFromAllDrives: supportsAllDrives,
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    // ============ FOLDER OPERATIONS ============

    if (operation === "create_folder") {
      const folderName = compileTemplate(data.fileName, context);
      if (!folderName) throw new NonRetriableError("Folder name is required");

      const metadata: Record<string, unknown> = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      if (data.fileDescription) {
        metadata.description = compileTemplate(data.fileDescription, context);
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "list_folder_contents") {
      const folderId = compileTemplate(data.folderId, context);
      if (!folderId) throw new NonRetriableError("Folder ID is required");

      const query = `'${folderId}' in parents and trashed = false`;

      const response = await ky.get(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        searchParams: {
          q: query,
          pageSize: data.pageSize || 100,
          orderBy: data.orderBy || "folder,name",
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
          supportsAllDrives,
          includeItemsFromAllDrives: supportsAllDrives,
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "get_folder") {
      const folderId = compileTemplate(data.folderId, context);
      if (!folderId) throw new NonRetriableError("Folder ID is required");

      const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${folderId}`, {
        headers,
        searchParams: {
          fields: "id, name, mimeType, modifiedTime, createdTime, webViewLink, parents, description",
          supportsAllDrives,
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    // ============ SHARING OPERATIONS ============

    if (operation === "share_file") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      const permission: Record<string, unknown> = {
        role: data.shareRole || "reader",
        type: data.shareType || "user",
      };

      if (data.shareType === "user" || data.shareType === "group") {
        const email = compileTemplate(data.shareEmail, context);
        if (!email) throw new NonRetriableError("Email is required for user/group sharing");
        permission.emailAddress = email;
      }

      const searchParams: Record<string, string | number | boolean> = {
        supportsAllDrives,
      };

      if (data.sendNotification !== false) {
        searchParams.sendNotificationEmail = true;
        if (data.emailMessage) {
          searchParams.emailMessage = compileTemplate(data.emailMessage, context);
        }
      } else {
        searchParams.sendNotificationEmail = false;
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files/${fileId}/permissions`, {
        headers,
        json: permission,
        searchParams,
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "list_permissions") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("File ID is required");

      const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}/permissions`, {
        headers,
        searchParams: {
          supportsAllDrives,
          fields: "permissions(id, type, role, emailAddress, displayName)",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "update_permission") {
      const fileId = compileTemplate(data.fileId, context);
      const permissionId = compileTemplate(data.permissionId, context);
      
      if (!fileId) throw new NonRetriableError("File ID is required");
      if (!permissionId) throw new NonRetriableError("Permission ID is required");

      const response = await ky.patch(`${GOOGLE_DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
        headers,
        json: {
          role: data.shareRole || "reader",
        },
        searchParams: {
          supportsAllDrives,
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "remove_permission") {
      const fileId = compileTemplate(data.fileId, context);
      const permissionId = compileTemplate(data.permissionId, context);
      
      if (!fileId) throw new NonRetriableError("File ID is required");
      if (!permissionId) throw new NonRetriableError("Permission ID is required");

      await ky.delete(`${GOOGLE_DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
        headers,
        searchParams: {
          supportsAllDrives,
        },
      });

      return { success: true, removedPermissionId: permissionId };
    }

    // ============ GOOGLE DOCS OPERATIONS ============

    if (operation === "create_document") {
      const fileName = compileTemplate(data.fileName, context);
      if (!fileName) throw new NonRetriableError("Document name is required");

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: "application/vnd.google-apps.document",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "create_spreadsheet") {
      const fileName = compileTemplate(data.fileName, context);
      if (!fileName) throw new NonRetriableError("Spreadsheet name is required");

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: "application/vnd.google-apps.spreadsheet",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "create_presentation") {
      const fileName = compileTemplate(data.fileName, context);
      if (!fileName) throw new NonRetriableError("Presentation name is required");

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: "application/vnd.google-apps.presentation",
      };

      if (data.parentFolderId) {
        metadata.parents = [compileTemplate(data.parentFolderId, context)];
      }

      const response = await ky.post(`${GOOGLE_DRIVE_API}/files`, {
        headers,
        json: metadata,
        searchParams: {
          supportsAllDrives,
          fields: "id, name, mimeType, webViewLink",
        },
      }).json<Record<string, unknown>>();

      return response;
    }

    if (operation === "export_document") {
      const fileId = compileTemplate(data.fileId, context);
      if (!fileId) throw new NonRetriableError("Document ID is required");

      const exportFormat = data.exportFormat || "application/pdf";

      const response = await ky.get(`${GOOGLE_DRIVE_API}/files/${fileId}/export`, {
        headers,
        searchParams: {
          mimeType: exportFormat,
        },
      });

      // For binary formats, return base64
      if (exportFormat.includes("pdf") || exportFormat.includes("openxmlformats")) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          fileId,
          exportFormat,
          content: base64,
          encoding: "base64",
        };
      }

      // For text formats, return as string
      const text = await response.text();
      return {
        fileId,
        exportFormat,
        content: text,
        encoding: "utf-8",
      };
    }

    throw new NonRetriableError(`Unknown operation: ${operation}`);
  });

  await publish(
    googleDriveChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return {
    ...context,
    [data.variableName]: result,
  };
} catch (error) {
  await publish(
    googleDriveChannel().status({
      nodeId,
      status: "error",
    }),
  );

  // Handle Google Drive specific errors
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // Handle common Google Drive API errors
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      throw new NonRetriableError(
        `Google Drive Authentication Failed (401): Your access token is invalid or expired. ` +
        `Please verify your Google Drive credentials:\n` +
        `1. Check that your OAuth2 access token is correct\n` +
        `2. Ensure the token has not expired\n` +
        `3. Verify the token has the required scopes (https://www.googleapis.com/auth/drive)\n` +
        `4. If using a refresh token, ensure it's still valid\n\n` +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      throw new NonRetriableError(
        `Google Drive Permission Denied (403): You don't have permission to perform this operation. ` +
        `Please check:\n` +
        `1. The file/folder exists and you have access to it\n` +
        `2. Your token has the required OAuth scopes\n` +
        `3. The file is not in the trash\n` +
        `4. You have the necessary permissions (read/write)\n\n` +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      throw new NonRetriableError(
        `Google Drive File Not Found (404): The requested file or folder doesn't exist. ` +
        `Please verify:\n` +
        `1. The file/folder ID is correct\n` +
        `2. The file hasn't been deleted\n` +
        `3. You have access to the file/folder\n\n` +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes("429") || errorMessage.includes("Rate Limit")) {
      throw new NonRetriableError(
        `Google Drive Rate Limit Exceeded (429): Too many requests to Google Drive API. ` +
        `Please wait and try again later. Consider:\n` +
        `1. Reducing the frequency of API calls\n` +
        `2. Implementing exponential backoff\n` +
        `3. Checking your quota limits in Google Cloud Console\n\n` +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes("500") || errorMessage.includes("503") || errorMessage.includes("Internal Server Error")) {
      throw new NonRetriableError(
        `Google Drive Server Error: Google's servers encountered an error. ` +
        `This is usually temporary. Please try again in a few moments.\n\n` +
        `Original error: ${errorMessage}`
      );
    }
  }

  // Re-throw the original error if not a known Google Drive error
  throw error;
}
};
