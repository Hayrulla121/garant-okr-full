package uz.garantbank.okrTrackingSystem.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.entity.Department;
import uz.garantbank.okrTrackingSystem.entity.Division;
import uz.garantbank.okrTrackingSystem.repository.DepartmentRepository;
import uz.garantbank.okrTrackingSystem.repository.DivisionRepository;

import java.util.List;

/**
 * Migrates existing departments to divisions on application startup.
 *
 * This config handles the migration of existing departments that don't have
 * a division assigned. It creates a "Default Division" and assigns all
 * orphan departments to it.
 *
 * Safe to run multiple times - only acts when orphan departments exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1) // Run before DataInitializer
public class DataMigrationConfig implements ApplicationRunner {

    private final DivisionRepository divisionRepository;
    private final DepartmentRepository departmentRepository;

    public static final String DEFAULT_DIVISION_NAME = "Default Division";

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Check if we need to migrate
        List<Department> orphanDepartments = departmentRepository.findByDivisionIsNull();

        if (!orphanDepartments.isEmpty()) {
            log.info("Found {} departments without division - starting migration", orphanDepartments.size());
            System.out.println("=".repeat(80));
            System.out.println("DIVISION MIGRATION: Found " + orphanDepartments.size() + " departments without division");

            // Find or create default division
            Division defaultDivision = divisionRepository.findByName(DEFAULT_DIVISION_NAME)
                    .orElseGet(() -> {
                        log.info("Creating default division: {}", DEFAULT_DIVISION_NAME);
                        Division div = new Division();
                        div.setName(DEFAULT_DIVISION_NAME);
                        return divisionRepository.save(div);
                    });

            // Assign all orphan departments to default division
            for (Department dept : orphanDepartments) {
                dept.setDivision(defaultDivision);
                log.info("Migrating department '{}' to division '{}'", dept.getName(), DEFAULT_DIVISION_NAME);
            }
            departmentRepository.saveAll(orphanDepartments);

            System.out.println("Migrated " + orphanDepartments.size() + " departments to '" + DEFAULT_DIVISION_NAME + "'");
            System.out.println("=".repeat(80));
            log.info("Migration complete: {} departments assigned to '{}'", orphanDepartments.size(), DEFAULT_DIVISION_NAME);
        } else {
            log.debug("No orphan departments found - migration not needed");
        }
    }
}
