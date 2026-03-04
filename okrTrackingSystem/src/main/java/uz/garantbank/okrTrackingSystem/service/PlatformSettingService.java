package uz.garantbank.okrTrackingSystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.entity.PlatformSetting;
import uz.garantbank.okrTrackingSystem.repository.PlatformSettingRepository;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformSettingService {

    private final PlatformSettingRepository repository;

    public static final String REQUIRE_ATTACHMENT_KEY = "REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE";

    @Transactional(readOnly = true)
    public boolean isAttachmentRequiredForActualValue() {
        return repository.findById(REQUIRE_ATTACHMENT_KEY)
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<PlatformSetting> getAllSettings() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<PlatformSetting> getSetting(String key) {
        return repository.findById(key);
    }

    @Transactional
    public PlatformSetting setSetting(String key, String value, String description) {
        PlatformSetting setting = repository.findById(key)
                .orElse(PlatformSetting.builder().settingKey(key).build());
        setting.setSettingValue(value);
        if (description != null) {
            setting.setDescription(description);
        }
        return repository.save(setting);
    }
}
