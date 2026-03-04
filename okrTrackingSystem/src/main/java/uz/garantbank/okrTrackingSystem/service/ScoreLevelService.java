package uz.garantbank.okrTrackingSystem.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.dto.ScoreLevelDTO;
import uz.garantbank.okrTrackingSystem.entity.ScoreLevel;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ScoreLevelService {

    private final ScoreLevelRepository scoreLevelRepository;

    public ScoreLevelService(ScoreLevelRepository scoreLevelRepository) {
        this.scoreLevelRepository = scoreLevelRepository;
    }

    @PostConstruct
    public void initializeDefaultLevels() {
        if (scoreLevelRepository.count() == 0) {
            // Create default score levels
            List<ScoreLevel> defaultLevels = List.of(
                    ScoreLevel.builder()
                            .name("Не соответствует")
                            .scoreValue(0.0)
                            .color("#d9534f")
                            .displayOrder(0)
                            .isDefault(true)
                            .build(),
                    ScoreLevel.builder()
                            .name("Ниже ожиданий")
                            .scoreValue(0.31)
                            .color("#f0ad4e")
                            .displayOrder(1)
                            .isDefault(true)
                            .build(),
                    ScoreLevel.builder()
                            .name("На уровне ожиданий")
                            .scoreValue(0.51)
                            .color("#5cb85c")
                            .displayOrder(2)
                            .isDefault(true)
                            .build(),
                    ScoreLevel.builder()
                            .name("Превышает ожидания")
                            .scoreValue(0.86)
                            .color("#28a745")
                            .displayOrder(3)
                            .isDefault(true)
                            .build(),
                    ScoreLevel.builder()
                            .name("Исключительно")
                            .scoreValue(0.98)
                            .color("#1e7b34")
                            .displayOrder(4)
                            .isDefault(true)
                            .build()
            );
            scoreLevelRepository.saveAll(defaultLevels);
        }
    }

    public List<ScoreLevelDTO> getAllScoreLevels() {
        return scoreLevelRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ScoreLevelDTO> updateScoreLevels(List<ScoreLevelDTO> levelDTOs) {
        // Delete all existing levels
        scoreLevelRepository.deleteAll();

        // Create new levels from the provided list
        List<ScoreLevel> newLevels = levelDTOs.stream()
                .map(dto -> ScoreLevel.builder()
                        .name(dto.getName())
                        .scoreValue(dto.getScoreValue())
                        .color(dto.getColor())
                        .displayOrder(dto.getDisplayOrder())
                        .isDefault(false)
                        .build())
                .collect(Collectors.toList());

        List<ScoreLevel> savedLevels = scoreLevelRepository.saveAll(newLevels);

        return savedLevels.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        /**
         * Is equivalent to this for loop:
         *   List<ScoreLevel> newLevels = new ArrayList<>();
         *   for (ScoreLevelDTO dto : levelDTOs) {
         *       ScoreLevel level = ScoreLevel.builder()
         *               .name(dto.getName())
         *               .scoreValue(dto.getScoreValue())
         *               .color(dto.getColor())
         *               .displayOrder(dto.getDisplayOrder())
         *               .isDefault(false)
         *               .build();
         *       newLevels.add(level);
         *   }
         */
    }

    @Transactional
    public void resetToDefaults() {
        scoreLevelRepository.deleteAll();
        initializeDefaultLevels();
    }

    private ScoreLevelDTO toDTO(ScoreLevel entity) {
        return ScoreLevelDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .scoreValue(entity.getScoreValue())
                .color(entity.getColor())
                .displayOrder(entity.getDisplayOrder())
                .build();
    }
}
