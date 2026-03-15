package uz.garantbank.okrTrackingSystem.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Database migrations for schema changes that ddl-auto=update cannot handle.
 */
@Slf4j
@Component
public class DatabaseMigration implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Migration 1: Fix objectives.level ENUM constraint
            try {
                stmt.execute("ALTER TABLE objectives ALTER COLUMN level VARCHAR(20) DEFAULT 'DEPARTMENT' NOT NULL");
                log.info("DatabaseMigration: objectives.level column updated to VARCHAR(20)");
            } catch (Exception e) {
                log.debug("DatabaseMigration: objectives.level skipped ({})", e.getMessage());
            }

            // Migration 2: Add 'active' column to key_results (default true)
            try {
                stmt.execute("ALTER TABLE key_results ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL");
                log.info("DatabaseMigration: key_results.active column added");
            } catch (Exception e) {
                log.debug("DatabaseMigration: key_results.active skipped ({})", e.getMessage());
            }

            // Migration 3: Add 'month' column to score_snapshots and migrate quarter data
            try {
                stmt.execute("ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS \"SNAPSHOT_MONTH\" INTEGER DEFAULT 1 NOT NULL");
                // Migrate existing quarter-based data: quarter 1 -> month 3, q2 -> 6, q3 -> 9, q4 -> 12
                stmt.execute("UPDATE score_snapshots SET \"SNAPSHOT_MONTH\" = \"QUARTER\" * 3 WHERE \"SNAPSHOT_MONTH\" = 1 AND \"QUARTER\" IS NOT NULL AND \"QUARTER\" > 0");
                log.info("DatabaseMigration: score_snapshots.SNAPSHOT_MONTH column added and migrated");
            } catch (Exception e) {
                log.debug("DatabaseMigration: score_snapshots.SNAPSHOT_MONTH skipped ({})", e.getMessage());
            }

            // Migration 4: Drop old unique constraint and add new one with month
            try {
                // Drop old constraint (target_id, target_type, QUARTER, SNAPSHOT_YEAR)
                stmt.execute("ALTER TABLE score_snapshots DROP CONSTRAINT IF EXISTS " +
                        "CONSTRAINT_INDEX_E");
                // Add new unique constraint (target_id, target_type, SNAPSHOT_MONTH, SNAPSHOT_YEAR)
                stmt.execute("ALTER TABLE score_snapshots ADD CONSTRAINT IF NOT EXISTS " +
                        "UK_SNAPSHOT_MONTH UNIQUE (target_id, target_type, \"SNAPSHOT_MONTH\", \"SNAPSHOT_YEAR\")");
                log.info("DatabaseMigration: score_snapshots unique constraint updated to use SNAPSHOT_MONTH");
            } catch (Exception e) {
                log.debug("DatabaseMigration: score_snapshots constraint update skipped ({})", e.getMessage());
            }

        } catch (Exception e) {
            log.warn("DatabaseMigration: failed to get connection ({})", e.getMessage());
        }
    }
}
