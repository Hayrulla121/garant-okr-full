package uz.garantbank.okrTrackingSystem.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Service for handling file uploads, specifically profile photos.
 */
@Service
@Slf4j
public class FileUploadService {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private static final String PROFILE_PHOTOS_DIR = "profile-photos";
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif"
    );
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "jpg", "jpeg", "png", "gif"
    );

    private static final String WATERMARKS_DIR = "watermarks";

    private static final String KR_ATTACHMENTS_DIR = "kr-attachments";
    private static final long MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_ATTACHMENT_CONTENT_TYPES = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
    );
    private static final List<String> ALLOWED_ATTACHMENT_EXTENSIONS = Arrays.asList(
        "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"
    );

    @PostConstruct
    public void init() {
        try {
            Path profilePhotosPath = Paths.get(uploadDir, PROFILE_PHOTOS_DIR);
            if (!Files.exists(profilePhotosPath)) {
                Files.createDirectories(profilePhotosPath);
                log.info("Created upload directory: {}", profilePhotosPath.toAbsolutePath());
            }
            Path krAttachmentsPath = Paths.get(uploadDir, KR_ATTACHMENTS_DIR);
            if (!Files.exists(krAttachmentsPath)) {
                Files.createDirectories(krAttachmentsPath);
                log.info("Created upload directory: {}", krAttachmentsPath.toAbsolutePath());
            }
            Path watermarksPath = Paths.get(uploadDir, WATERMARKS_DIR);
            if (!Files.exists(watermarksPath)) {
                Files.createDirectories(watermarksPath);
                log.info("Created upload directory: {}", watermarksPath.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("Could not create upload directory", e);
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    /**
     * Upload a profile photo for a user.
     *
     * @param userId the user's ID
     * @param file the uploaded file
     * @return the URL path to access the uploaded photo
     * @throws IllegalArgumentException if the file is invalid
     */
    public String uploadProfilePhoto(UUID userId, MultipartFile file) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = userId.toString() + "_" + System.currentTimeMillis() + "." + extension;

        try {
            Path targetPath = Paths.get(uploadDir, PROFILE_PHOTOS_DIR, newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Uploaded profile photo for user {}: {}", userId, newFilename);

            return "/uploads/" + PROFILE_PHOTOS_DIR + "/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to upload profile photo for user {}", userId, e);
            throw new RuntimeException("Failed to upload profile photo", e);
        }
    }

    /**
     * Delete an existing profile photo.
     *
     * @param photoUrl the URL of the photo to delete
     */
    public void deleteProfilePhoto(String photoUrl) {
        if (photoUrl == null || photoUrl.isEmpty()) {
            return;
        }

        try {
            // Extract filename from URL
            String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
            Path filePath = Paths.get(uploadDir, PROFILE_PHOTOS_DIR, filename);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted profile photo: {}", filename);
            }
        } catch (IOException e) {
            log.warn("Failed to delete profile photo: {}", photoUrl, e);
        }
    }

    /**
     * Validate the uploaded file.
     *
     * @param file the file to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        // Check file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 5MB");
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Invalid file type. Only JPEG, PNG, and GIF images are allowed");
        }

        // Check file extension
        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException("Invalid file extension. Only jpg, jpeg, png, and gif are allowed");
        }
    }

    /**
     * Upload an attachment file for a key result.
     *
     * @param keyResultId the key result ID
     * @param file the uploaded file
     * @return the URL path to access the uploaded attachment
     * @throws IllegalArgumentException if the file is invalid
     */
    public String uploadKeyResultAttachment(String keyResultId, MultipartFile file) {
        validateAttachmentFile(file);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = keyResultId + "_" + System.currentTimeMillis() + "." + extension;

        try {
            Path targetPath = Paths.get(uploadDir, KR_ATTACHMENTS_DIR, newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Uploaded KR attachment for key result {}: {}", keyResultId, newFilename);
            return "/uploads/" + KR_ATTACHMENTS_DIR + "/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to upload KR attachment for key result {}", keyResultId, e);
            throw new RuntimeException("Failed to upload attachment", e);
        }
    }

    /**
     * Delete a key result attachment file.
     *
     * @param attachmentUrl the URL of the attachment to delete
     */
    public void deleteAttachment(String attachmentUrl) {
        if (attachmentUrl == null || attachmentUrl.isEmpty()) {
            return;
        }
        try {
            String filename = attachmentUrl.substring(attachmentUrl.lastIndexOf('/') + 1);
            Path filePath = Paths.get(uploadDir, KR_ATTACHMENTS_DIR, filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted KR attachment: {}", filename);
            }
        } catch (IOException e) {
            log.warn("Failed to delete KR attachment: {}", attachmentUrl, e);
        }
    }

    /**
     * Validate an attachment file for key result proof/basis.
     *
     * @param file the file to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateAttachmentFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Attachment file is required");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 10MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_ATTACHMENT_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(
                "Invalid file type. Allowed: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT");
        }
        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_ATTACHMENT_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException(
                "Invalid file extension. Allowed: jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, txt");
        }
    }

    /**
     * Upload a watermark image (replaces any previous one at the given path if needed).
     *
     * @param file the uploaded image file
     * @return the URL path to access the uploaded watermark image
     */
    public String uploadWatermarkImage(MultipartFile file) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = "watermark_" + System.currentTimeMillis() + "." + extension;

        try {
            Path targetPath = Paths.get(uploadDir, WATERMARKS_DIR, newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Uploaded watermark image: {}", newFilename);
            return "/uploads/" + WATERMARKS_DIR + "/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to upload watermark image", e);
            throw new RuntimeException("Failed to upload watermark image", e);
        }
    }

    /**
     * Delete an existing watermark image.
     *
     * @param imageUrl the URL of the watermark image to delete
     */
    public void deleteWatermarkImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return;
        }
        try {
            String filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            Path filePath = Paths.get(uploadDir, WATERMARKS_DIR, filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted watermark image: {}", filename);
            }
        } catch (IOException e) {
            log.warn("Failed to delete watermark image: {}", imageUrl, e);
        }
    }

    /**
     * Get the file extension from a filename.
     *
     * @param filename the filename
     * @return the file extension (without the dot)
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
}
