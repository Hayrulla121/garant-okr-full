package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.PlatformSetting;

@Repository
public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {
}
