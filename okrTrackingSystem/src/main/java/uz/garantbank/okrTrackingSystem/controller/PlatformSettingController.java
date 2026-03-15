package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.garantbank.okrTrackingSystem.entity.PlatformSetting;
import uz.garantbank.okrTrackingSystem.service.FileUploadService;
import uz.garantbank.okrTrackingSystem.service.PlatformSettingService;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/platform-settings")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Tag(name = "Platform Settings", description = "Global platform configuration (ADMIN only for writes)")
public class PlatformSettingController {

    private final PlatformSettingService settingService;
    private final FileUploadService fileUploadService;

    @Operation(summary = "Get all platform settings",
            description = "Returns all platform-wide configuration settings. Accessible to all authenticated users.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of all settings",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PlatformSetting.class))))
    })
    @GetMapping
    public ResponseEntity<List<PlatformSetting>> getAllSettings() {
        return ResponseEntity.ok(settingService.getAllSettings());
    }

    @Operation(summary = "Get a platform setting by key",
            description = "Returns a single platform setting by its key.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Setting found",
                    content = @Content(schema = @Schema(implementation = PlatformSetting.class))),
            @ApiResponse(responseCode = "404", description = "Setting not found", content = @Content)
    })
    @GetMapping("/{key}")
    public ResponseEntity<PlatformSetting> getSetting(
            @Parameter(description = "Setting key", required = true) @PathVariable("key") String key) {
        return settingService.getSetting(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update a platform setting",
            description = "Create or update a platform setting. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Setting updated",
                    content = @Content(schema = @Schema(implementation = PlatformSetting.class))),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can update settings", content = @Content)
    })
    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlatformSetting> updateSetting(
            @Parameter(description = "Setting key", required = true) @PathVariable("key") String key,
            @RequestBody Map<String, String> body) {
        String value = body.get("value");
        String description = body.get("description");
        log.info("Updating platform setting: {} = {}", key, value);
        return ResponseEntity.ok(settingService.setSetting(key, value, description));
    }

    @Operation(summary = "Upload watermark image",
            description = "Upload an image file to use as the UI watermark. Deletes the previous watermark image if one existed. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Image uploaded and setting saved",
                    content = @Content(schema = @Schema(implementation = PlatformSetting.class))),
            @ApiResponse(responseCode = "400", description = "Invalid file", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can upload watermark", content = @Content)
    })
    @PostMapping("/watermark-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlatformSetting> uploadWatermarkImage(
            @Parameter(description = "Image file (JPEG, PNG, GIF — max 5 MB)", required = true)
            @RequestParam("file") MultipartFile file) {
        settingService.getSetting("WATERMARK_IMAGE_URL").ifPresent(existing -> {
            if (existing.getSettingValue() != null && !existing.getSettingValue().isEmpty()) {
                fileUploadService.deleteWatermarkImage(existing.getSettingValue());
            }
        });
        String imageUrl = fileUploadService.uploadWatermarkImage(file);
        log.info("Watermark image uploaded: {}", imageUrl);
        PlatformSetting setting = settingService.setSetting("WATERMARK_IMAGE_URL", imageUrl, "URL of the watermark overlay image");
        return ResponseEntity.ok(setting);
    }
}
