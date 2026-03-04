package uz.garantbank.okrTrackingSystem.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSetting {

    @Id
    @Column(nullable = false, unique = true)
    private String settingKey;

    @Column(nullable = false)
    private String settingValue;

    private String description;
}


/**
 * PlatformSetting is a simple key-value entity that stores global configuration settings for the platform. It has 3 fields:
 *
 *   - settingKey (primary key) -- the setting name, e.g. "REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE"
 *   - settingValue -- the value, e.g. "true" or "false"
 *   - description -- a human-readable explanation of what the setting does
 *
 *   Right now it holds one setting: REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE. When the admin sets this to "true" via PUT
 *   /api/platform-settings/REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE, users are forced to upload a proof file when updating a Key Result's
 *   actual value. When "false" (the default), no attachment is needed.
 *
 *   It's designed as a generic key-value table so if you need more platform-wide toggles in the future (e.g.
 *   "ALLOW_SELF_REGISTRATION", "MAX_OBJECTIVES_PER_DEPARTMENT"), you can add them without creating new entities or tables -- just
 *   insert a new row.
 */