package uz.garantbank.okrTrackingSystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.dto.ImportResultDTO;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Imports OKR data from Excel files.
 *
 * Supports two column layouts:
 *   Standard: A=Division, B=Dept, C=Objective, D=ObjWeight, E=KR, F=KRWeight, G=Type, H=Actual, I=Unit, J+=Thresholds
 *   Compact:  A=Dept, B=Objective, C=ObjWeight, D=KR, E=KRWeight, F=Type, G=Actual, H=Unit, I+=Thresholds
 *
 * Auto-detects format from the header row.
 * Supports multi-sheet files (one department per sheet) and single-sheet exports.
 * Upserts by name: matches divisions, departments, objectives, and key results by name.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final OkrService okrService;
    private final ScoreLevelRepository scoreLevelRepository;

    private static final String DEFAULT_DIVISION = "Организация";

    // Known header keywords for detecting header rows
    private static final Set<String> KNOWN_HEADERS = Set.of(
            "блок", "division", "департамент", "department", "bo'lim",
            "цель", "objective", "maqsad",
            "ключевой результат", "key result"
    );

    // Keywords that indicate column A is a Division/Block column (standard format)
    private static final Set<String> DIVISION_HEADERS = Set.of(
            "блок", "division", "bo'lim"
    );

    // Pattern for leader info: "👤 Руководитель...: Name" or "👤 Руководитель...: Name\n(DeptName)"
    private static final Pattern LEADER_PATTERN = Pattern.compile(
            "\uD83D\uDC64\\s*(?:Руководитель[^:]*|Department Leader|Leader)[:\\s]+(.+?)(?:\\s*\\((.+?)\\))?\\s*$",
            Pattern.DOTALL
    );

    @Transactional
    public ImportResultDTO importFromExcel(byte[] fileContent) {
        List<String> warnings = new ArrayList<>();
        int deptCount = 0, objCount = 0, krCount = 0;

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(fileContent))) {

            List<ScoreLevel> levels = getScoreLevels();
            int numLevels = levels.size();

            for (int sheetIdx = 0; sheetIdx < wb.getNumberOfSheets(); sheetIdx++) {
                Sheet ws = wb.getSheetAt(sheetIdx);
                if (ws.getPhysicalNumberOfRows() == 0) continue;

                // Detect header row
                Row firstRow = ws.getRow(0);
                if (firstRow == null || firstRow.getPhysicalNumberOfCells() < 5) continue;
                boolean hasHeader = isHeaderRow(firstRow);
                int dataStartRow = hasHeader ? 1 : 0;

                // Auto-detect column layout from header
                boolean hasDivisionColumn = hasHeader && hasDivisionHeader(firstRow);
                int colDept = hasDivisionColumn ? 1 : 0;
                int colObj = hasDivisionColumn ? 2 : 1;
                int colObjWt = hasDivisionColumn ? 3 : 2;
                int colKrName = hasDivisionColumn ? 4 : 3;
                int colKrWt = hasDivisionColumn ? 5 : 4;
                int colType = hasDivisionColumn ? 6 : 5;
                int colActual = hasDivisionColumn ? 7 : 6;
                int colUnit = hasDivisionColumn ? 8 : 7;
                int colThreshStart = hasDivisionColumn ? 9 : 8;

                if (!hasDivisionColumn) {
                    log.info("Sheet '{}': compact format detected (no Division column)", ws.getSheetName());
                }

                String currentDivisionName = hasDivisionColumn ? null : DEFAULT_DIVISION;
                String currentDeptName = null;
                String currentObjName = null;
                Department currentDept = null;
                Objective currentObj = null;
                boolean inLeaderSection = false;
                UUID leaderEmployeeId = null;

                for (int rowIdx = dataStartRow; rowIdx <= ws.getLastRowNum(); rowIdx++) {
                    Row row = ws.getRow(rowIdx);
                    if (row == null) continue;

                    // Read cell values using detected column indices
                    String divisionVal = hasDivisionColumn ? getCellString(row, 0) : null;
                    String deptVal = getCellString(row, colDept);
                    String objVal = getCellString(row, colObj);
                    String objWeightVal = getCellString(row, colObjWt);
                    String krNameVal = getCellString(row, colKrName);
                    String krWeightVal = getCellString(row, colKrWt);
                    String typeVal = getCellString(row, colType);
                    String actualVal = getCellString(row, colActual);
                    String unitVal = getCellString(row, colUnit);

                    // Skip completely empty rows
                    if (isBlank(divisionVal) && isBlank(deptVal) && isBlank(objVal) && isBlank(krNameVal)) {
                        continue;
                    }

                    // Skip summary/formula rows — check both KR column and dept column
                    if (isSummaryRow(krNameVal)) continue;
                    if (isSummaryRow(deptVal)) continue;

                    // Handle division from column A (standard format only; inherit from previous if blank)
                    if (hasDivisionColumn && !isBlank(divisionVal)) {
                        // In standard format, col A might contain leader pattern
                        // (not typical, but the compact format puts it there)
                        currentDivisionName = divisionVal.trim();
                    }

                    // Handle department/leader from dept column
                    if (!isBlank(deptVal)) {
                        Matcher leaderMatch = LEADER_PATTERN.matcher(deptVal.trim());
                        if (leaderMatch.find()) {
                            // This is a leader section
                            inLeaderSection = true;
                            String leaderNameFromCell = leaderMatch.group(1).trim();
                            String deptNameFromCell = leaderMatch.group(2) != null ? leaderMatch.group(2).trim() : null;

                            if (deptNameFromCell != null) {
                                currentDeptName = deptNameFromCell;
                            } else {
                                // Compact format: leader label has no (DeptName), use leader label as dept name
                                currentDeptName = deptVal.trim();
                            }

                            // Ensure division + department exist
                            if (currentDivisionName != null && currentDeptName != null) {
                                Division division = okrService.findOrCreateDivision(currentDivisionName);
                                currentDept = okrService.findOrCreateDepartment(currentDeptName, division.getId());
                                deptCount++;

                                // Try to find leader by matching the department's leader
                                if (currentDept.getDepartmentLeader() != null) {
                                    leaderEmployeeId = currentDept.getDepartmentLeader().getId();
                                } else {
                                    leaderEmployeeId = null;
                                    warnings.add("Department '" + currentDeptName + "' has no leader assigned; leader objectives imported as department objectives");
                                    inLeaderSection = false;
                                }
                            }

                            currentObj = null;
                            currentObjName = null;

                            // If this row also has KR data, continue processing; otherwise skip
                            if (isBlank(objVal) || isBlank(krNameVal)) continue;
                        } else {
                            // Regular department name — transition out of leader section
                            if (inLeaderSection) {
                                currentObj = null;
                                currentObjName = null;
                            }
                            inLeaderSection = false;
                            leaderEmployeeId = null;
                            currentDeptName = deptVal.trim();

                            if (currentDivisionName != null) {
                                Division division = okrService.findOrCreateDivision(currentDivisionName);
                                currentDept = okrService.findOrCreateDepartment(currentDeptName, division.getId());
                                deptCount++;
                            }

                            currentObj = null;
                            currentObjName = null;
                        }
                    }

                    // Must have department context
                    if (currentDept == null || currentDivisionName == null) continue;

                    // Handle objective (inherit from previous if blank)
                    if (!isBlank(objVal)) {
                        String cleanObjName = cleanObjectiveName(objVal.trim());
                        if (!cleanObjName.equals(currentObjName)) {
                            currentObjName = cleanObjName;
                            int weight = parseWeight(objWeightVal);

                            ObjectiveLevel level = inLeaderSection ? ObjectiveLevel.INDIVIDUAL : ObjectiveLevel.DEPARTMENT;
                            UUID empId = inLeaderSection ? leaderEmployeeId : null;

                            currentObj = okrService.upsertObjective(
                                    currentDept.getId(), currentObjName, weight, level, empId);
                            objCount++;
                        }
                    }

                    // Must have objective and KR name
                    if (currentObj == null || isBlank(krNameVal)) continue;

                    // Parse KR data
                    KeyResult.MetricType metricType = parseMetricType(typeVal);
                    int krWeight = parseWeight(krWeightVal);
                    String actual = parseActualValue(actualVal, metricType);
                    String unit = unitVal != null ? unitVal.trim() : "";

                    // Parse thresholds
                    Double[] thresholds = new Double[5];
                    if (metricType != KeyResult.MetricType.QUALITATIVE) {
                        for (int i = 0; i < numLevels && i < 5; i++) {
                            int col = colThreshStart + i;
                            String thVal = getCellString(row, col);
                            if (!isBlank(thVal)) {
                                try {
                                    thresholds[i] = Double.parseDouble(thVal.trim());
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }

                    okrService.upsertKeyResult(
                            currentObj.getId(), krNameVal.trim(),
                            metricType, unit, krWeight,
                            thresholds[0], thresholds[1], thresholds[2], thresholds[3], thresholds[4],
                            actual
                    );
                    krCount++;
                }
            }

            if (krCount == 0) {
                return ImportResultDTO.builder()
                        .success(false)
                        .message("Не удалось импортировать данные: файл пуст или имеет неверный формат")
                        .warnings(warnings)
                        .build();
            }

            return ImportResultDTO.builder()
                    .success(true)
                    .message("Импорт завершён успешно")
                    .warnings(warnings)
                    .departmentsImported(deptCount)
                    .objectivesImported(objCount)
                    .keyResultsImported(krCount)
                    .build();

        } catch (IOException e) {
            log.error("Excel import failed", e);
            return ImportResultDTO.builder()
                    .success(false)
                    .message("Ошибка импорта: " + e.getMessage())
                    .warnings(warnings)
                    .build();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private boolean isHeaderRow(Row row) {
        for (int i = 0; i < Math.min(row.getPhysicalNumberOfCells(), 5); i++) {
            String val = getCellString(row, i);
            if (val != null && KNOWN_HEADERS.contains(val.trim().toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if column A header indicates a Division/Block column (standard format).
     * If column A is "Департамент"/"Department", it's the compact format.
     */
    private boolean hasDivisionHeader(Row headerRow) {
        String colA = getCellString(headerRow, 0);
        if (colA == null) return false;
        return DIVISION_HEADERS.contains(colA.trim().toLowerCase());
    }

    private boolean isSummaryRow(String val) {
        if (isBlank(val)) return false;
        String upper = val.toUpperCase();
        return upper.contains("\uD83D\uDCCA") // 📊
                || upper.contains("\uD83C\uDFE2") // 🏢
                || upper.contains("\uD83D\uDC64") // 👤
                || upper.contains("\uD83C\uDF10") // 🌐
                || upper.contains("ВЗВЕШЕННАЯ ОЦЕНКА")
                || upper.contains("OBJECTIVE WEIGHTED SCORE")
                || upper.contains("DEPARTMENT WEIGHTED SCORE")
                || upper.contains("LEADER WEIGHTED SCORE");
    }

    private String cleanObjectiveName(String name) {
        // Strip "Цель N:" prefix added during export
        return name.replaceAll("^(?:Цель\\s*\\d+\\s*[:\\s]+|\\d+\\.\\s*)", "").trim();
    }

    private KeyResult.MetricType parseMetricType(String typeStr) {
        if (isBlank(typeStr)) return KeyResult.MetricType.HIGHER_BETTER;
        String lower = typeStr.toLowerCase();
        if (lower.contains("качественн") || lower.contains("qualitative") || lower.contains("a-e") || lower.contains("a/b/c")) {
            return KeyResult.MetricType.QUALITATIVE;
        }
        if (lower.contains("↓") || lower.contains("ниже") || lower.contains("lower") || lower.contains("меньше")) {
            return KeyResult.MetricType.LOWER_BETTER;
        }
        return KeyResult.MetricType.HIGHER_BETTER;
    }

    private int parseWeight(String val) {
        if (isBlank(val)) return 0;
        val = val.replace("%", "").trim();
        try {
            double w = Double.parseDouble(val);
            if (w > 0 && w <= 1) w = Math.round(w * 100);
            return (int) Math.round(w);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String parseActualValue(String val, KeyResult.MetricType metricType) {
        if (isBlank(val)) {
            return metricType == KeyResult.MetricType.QUALITATIVE ? "E" : "0";
        }
        if (metricType == KeyResult.MetricType.QUALITATIVE) {
            String upper = val.trim().toUpperCase();
            if (Set.of("A", "B", "C", "D", "E").contains(upper)) return upper;
            return "E";
        }
        try {
            return String.valueOf(Double.parseDouble(val.trim()));
        } catch (NumberFormatException e) {
            return "0";
        }
    }

    private String getCellString(Row row, int colIdx) {
        if (row == null || colIdx < 0) return null;
        Cell cell = row.getCell(colIdx);
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val) && !Double.isInfinite(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield String.valueOf(cell.getNumericCellValue());
                } catch (Exception e) {
                    try {
                        yield cell.getStringCellValue();
                    } catch (Exception e2) {
                        yield null;
                    }
                }
            }
            default -> null;
        };
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private List<ScoreLevel> getScoreLevels() {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        if (levels.isEmpty()) {
            return List.of(
                    ScoreLevel.builder().name("Не соответствует").scoreValue(0.0).color("#d9534f").displayOrder(0).build(),
                    ScoreLevel.builder().name("Ниже ожиданий").scoreValue(0.31).color("#f0ad4e").displayOrder(1).build(),
                    ScoreLevel.builder().name("На уровне ожиданий").scoreValue(0.51).color("#5cb85c").displayOrder(2).build(),
                    ScoreLevel.builder().name("Превышает ожидания").scoreValue(0.86).color("#28a745").displayOrder(3).build(),
                    ScoreLevel.builder().name("Исключительно").scoreValue(0.98).color("#1e7b34").displayOrder(4).build()
            );
        }
        levels.sort(Comparator.comparingDouble(ScoreLevel::getScoreValue));
        return levels;
    }
}
