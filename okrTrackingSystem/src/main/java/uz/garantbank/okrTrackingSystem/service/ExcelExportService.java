package uz.garantbank.okrTrackingSystem.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import uz.garantbank.okrTrackingSystem.dto.DepartmentDTO;
import uz.garantbank.okrTrackingSystem.dto.KeyResultDTO;
import uz.garantbank.okrTrackingSystem.dto.ObjectiveDTO;
import uz.garantbank.okrTrackingSystem.entity.KeyResult;
import uz.garantbank.okrTrackingSystem.entity.ScoreLevel;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Exports OKR data to Excel with multi-sheet support and department leader objectives.
 *
 * Columns: Division | Dept | Objective | Obj Weight | KR Name | KR Weight | Type | Actual | Unit |
 *          [Level Thresholds...] | Score | Performance Level
 *
 * Multi-sheet mode: one sheet per department with leader objectives shown first.
 */
@Slf4j
@Service
public class ExcelExportService {

    private final ScoreLevelRepository scoreLevelRepository;

    // Column indices (0-based) — Division column added at position 0
    private static final int COL_DIVISION  = 0;  // A
    private static final int COL_DEPT      = 1;  // B
    private static final int COL_OBJ       = 2;  // C
    private static final int COL_OBJ_WT    = 3;  // D
    private static final int COL_KR_NAME   = 4;  // E
    private static final int COL_KR_WT     = 5;  // F
    private static final int COL_TYPE      = 6;  // G
    private static final int COL_ACTUAL    = 7;  // H
    private static final int COL_UNIT      = 8;  // I
    // Col 9+ = dynamic threshold columns
    // After thresholds: Score, Level

    // Colors
    private static final String HEADER_COLOR    = "4472C4";
    private static final String WEIGHT_BG       = "FFF2CC";
    private static final String WEIGHT_FG       = "D97706";
    private static final String OBJ_SUMMARY_BG  = "E2EFDA";
    private static final String DEPT_SUMMARY_BG = "1F3864";
    private static final String LEADER_BG       = "E8E0F5";
    private static final String LEADER_FG       = "4A2391";
    private static final String LEADER_BORDER   = "6366F1";

    private static final List<DefaultLevel> DEFAULT_LEVELS = List.of(
            new DefaultLevel("Не соответствует", 0.0,  "#d9534f"),
            new DefaultLevel("Ниже ожиданий",    0.31, "#f0ad4e"),
            new DefaultLevel("На уровне ожиданий",0.51,"#5cb85c"),
            new DefaultLevel("Превышает ожидания",0.86,"#28a745"),
            new DefaultLevel("Исключительно",    0.98, "#1e7b34")
    );

    public ExcelExportService(ScoreLevelRepository scoreLevelRepository) {
        this.scoreLevelRepository = scoreLevelRepository;
    }

    private record DefaultLevel(String name, double scoreValue, String color) {}

    // ─── Public API ──────────────────────────────────────────────────────────

    public byte[] exportToExcel(List<DepartmentDTO> departments) {
        return exportToExcel(departments, true);
    }

    public byte[] exportToExcel(List<DepartmentDTO> departments, boolean multiSheet) {
        log.info("Exporting {} departments to Excel (multiSheet={})", departments.size(), multiSheet);
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            List<ScoreLevel> levels = getScoreLevels();
            int numLevels   = levels.size();
            int threshStart = 9;                        // column J (0-indexed)
            int scoreCol    = threshStart + numLevels;
            int levelCol    = scoreCol + 1;
            int totalCols   = levelCol + 1;

            Styles st = new Styles(wb, levels, numLevels);

            if (multiSheet) {
                for (int i = 0; i < departments.size(); i++) {
                    DepartmentDTO dept = departments.get(i);
                    if (dept == null) continue;

                    String sheetName = sanitizeSheetName(dept.getName() != null ? dept.getName() : "Sheet" + (i + 1));
                    XSSFSheet ws;
                    if (i == 0) {
                        ws = wb.createSheet(sheetName);
                    } else {
                        ws = wb.createSheet(sheetName);
                    }
                    writeHeaderRow(ws, st, levels, numLevels, threshStart, scoreCol, levelCol);
                    setColumnWidths(ws, numLevels, scoreCol, levelCol);

                    int rowIdx = 1;
                    rowIdx = writeDepartment(ws, dept, levels, numLevels, threshStart, scoreCol, levelCol, st, rowIdx, totalCols);

                    if (rowIdx > 1) {
                        applyConditionalFormatting(ws, rowIdx - 1, scoreCol, levelCol, levels);
                    }
                }
            } else {
                XSSFSheet ws = wb.createSheet("Экспорт OKR");
                writeHeaderRow(ws, st, levels, numLevels, threshStart, scoreCol, levelCol);
                setColumnWidths(ws, numLevels, scoreCol, levelCol);

                int rowIdx = 1;
                for (DepartmentDTO dept : departments) {
                    if (dept == null) continue;
                    rowIdx = writeDepartment(ws, dept, levels, numLevels, threshStart, scoreCol, levelCol, st, rowIdx, totalCols);
                }

                if (rowIdx > 1) {
                    applyConditionalFormatting(ws, rowIdx - 1, scoreCol, levelCol, levels);
                }
            }

            XSSFFormulaEvaluator.evaluateAllFormulaCells(wb);
            wb.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to export to Excel", e);
        }
    }

    // ─── Department writer ───────────────────────────────────────────────────

    private int writeDepartment(XSSFSheet ws, DepartmentDTO dept,
                                 List<ScoreLevel> levels, int numLevels,
                                 int threshStart, int scoreCol, int levelCol,
                                 Styles st, int startRow, int totalCols) {
        int rowIdx       = startRow;
        int deptStartRow = rowIdx;

        String divisionName = dept.getDivision() != null && dept.getDivision().getName() != null
                ? dept.getDivision().getName() : "";

        // Track objective-summary row positions for the dept SUMPRODUCT formula
        List<Integer> allObjSummaryRows = new ArrayList<>();

        // ── Leader Objectives Section ─────────────────────────────────────
        List<ObjectiveDTO> leaderObjs = dept.getLeaderObjectives();
        String leaderName = dept.getLeaderName();
        int leaderSectionStartRow = -1;
        int leaderSectionEndRow = -1;
        List<Integer> leaderObjSummaryRows = new ArrayList<>();

        if (leaderObjs != null && !leaderObjs.isEmpty() && leaderName != null && !leaderName.isBlank()) {
            leaderSectionStartRow = rowIdx;

            for (ObjectiveDTO obj : leaderObjs) {
                if (obj == null || obj.getKeyResults() == null || obj.getKeyResults().isEmpty()) continue;

                int objStartRow = rowIdx;
                List<KeyResultDTO> krs = obj.getKeyResults();
                int objWeight = obj.getWeight() != null ? obj.getWeight() : 0;

                for (KeyResultDTO kr : krs) {
                    if (kr == null) continue;
                    Row row = ws.createRow(rowIdx);
                    int krWeight = kr.getWeight() != null ? kr.getWeight() : 0;

                    // A: Division — only on first row
                    if (rowIdx == deptStartRow) {
                        Cell c = row.createCell(COL_DIVISION);
                        c.setCellValue(divisionName);
                        c.setCellStyle(st.deptLabelStyle);
                    }

                    // B: Leader label — only on first row of leader section
                    if (rowIdx == leaderSectionStartRow) {
                        Cell c = row.createCell(COL_DEPT);
                        c.setCellValue("\uD83D\uDC64 Руководитель: " + leaderName + "\n(" + (dept.getName() != null ? dept.getName() : "") + ")");
                        c.setCellStyle(st.leaderLabelStyle);
                    }

                    // C: Objective name
                    if (rowIdx == objStartRow) {
                        Cell c = row.createCell(COL_OBJ);
                        c.setCellValue(obj.getName() != null ? obj.getName() : "");
                        c.setCellStyle(st.objNameStyle);
                    }

                    // D: Objective weight
                    if (rowIdx == objStartRow) {
                        Cell c = row.createCell(COL_OBJ_WT);
                        c.setCellValue(objWeight);
                        c.setCellStyle(st.weightStyle);
                    }

                    // E: KR name
                    row.createCell(COL_KR_NAME).setCellValue(kr.getName() != null ? kr.getName() : "");

                    // F: KR weight
                    Cell krWtCell = row.createCell(COL_KR_WT);
                    krWtCell.setCellValue(krWeight);
                    krWtCell.setCellStyle(st.weightStyle);

                    // G: Type
                    row.createCell(COL_TYPE).setCellValue(metricTypeDisplay(kr.getMetricType()));

                    // H: Actual value
                    Cell actualCell = row.createCell(COL_ACTUAL);
                    actualCell.setCellStyle(st.centeredStyle);
                    writeActualValue(actualCell, kr);

                    // I: Unit
                    row.createCell(COL_UNIT).setCellValue(kr.getUnit() != null ? kr.getUnit() : "");

                    // Threshold columns
                    writeThresholds(row, kr, levels, numLevels, threshStart, st);

                    // Score formula
                    int xlRow = rowIdx + 1;
                    Cell scoreCell = row.createCell(scoreCol);
                    writeScoreFormula(scoreCell, kr, xlRow, levels, threshStart, st);

                    // Level formula
                    Cell levelCell = row.createCell(levelCol);
                    writeLevelFormula(levelCell, kr, xlRow, scoreCol, levels, st);

                    rowIdx++;
                }

                // Objective Summary Row
                int objKrEndRow = rowIdx - 1;
                if (!krs.isEmpty()) {
                    Row sumRow = ws.createRow(rowIdx);

                    Cell lblCell = sumRow.createCell(COL_KR_NAME);
                    lblCell.setCellValue("\uD83D\uDCCA ВЗВЕШЕННАЯ ОЦЕНКА ЦЕЛИ");
                    lblCell.setCellStyle(st.objSummaryLabelStyle);

                    for (int c = COL_KR_WT; c < threshStart + numLevels; c++) {
                        sumRow.createCell(c).setCellStyle(st.objSummaryBgStyle);
                    }

                    String scoreColLetter = colLetter(scoreCol);
                    String krWtColLetter  = colLetter(COL_KR_WT);
                    int xlObjStart = objStartRow + 1;
                    int xlObjEnd   = objKrEndRow + 1;
                    String objScoreFormula = String.format(
                        "IF(SUM(%s%d:%s%d)>0," +
                        "SUMPRODUCT(%s%d:%s%d,%s%d:%s%d)/SUM(%s%d:%s%d)," +
                        "AVERAGE(%s%d:%s%d))",
                        krWtColLetter, xlObjStart, krWtColLetter, xlObjEnd,
                        scoreColLetter, xlObjStart, scoreColLetter, xlObjEnd,
                        krWtColLetter,  xlObjStart, krWtColLetter,  xlObjEnd,
                        krWtColLetter,  xlObjStart, krWtColLetter,  xlObjEnd,
                        scoreColLetter, xlObjStart, scoreColLetter, xlObjEnd
                    );

                    Cell objScoreCell = sumRow.createCell(scoreCol);
                    objScoreCell.setCellFormula(objScoreFormula);
                    objScoreCell.setCellStyle(st.scoreSummaryStyle);

                    Cell objLevelCell = sumRow.createCell(levelCol);
                    objLevelCell.setCellFormula(levelFormula(rowIdx + 1, scoreCol, levels));
                    objLevelCell.setCellStyle(st.levelSummaryStyle);

                    leaderObjSummaryRows.add(rowIdx);
                    allObjSummaryRows.add(rowIdx);

                    applyBottomBorder(ws, rowIdx, totalCols, BorderStyle.MEDIUM, "000000");
                    rowIdx++;
                }

                // Merge objective cells
                int objEndRow = rowIdx - 1;
                if (objEndRow > objStartRow) {
                    safeAddMerge(ws, objStartRow, objEndRow, COL_OBJ, COL_OBJ);
                    safeAddMerge(ws, objStartRow, objEndRow, COL_OBJ_WT, COL_OBJ_WT);
                    ws.getRow(objStartRow).getCell(COL_OBJ_WT).setCellStyle(st.weightSumStyle);
                }
            }

            // Leader Summary Row
            if (!leaderObjSummaryRows.isEmpty()) {
                Row leaderSumRow = ws.createRow(rowIdx);

                Cell leaderSumLbl = leaderSumRow.createCell(COL_KR_NAME);
                leaderSumLbl.setCellValue("\uD83D\uDC64 ВЗВЕШЕННАЯ ОЦЕНКА РУКОВОДИТЕЛЯ");
                leaderSumLbl.setCellStyle(st.leaderSummaryLabelStyle);

                for (int c = COL_KR_WT; c < threshStart + numLevels; c++) {
                    leaderSumRow.createCell(c);
                }

                String scoreColLetter = colLetter(scoreCol);
                String objWtColLetter = colLetter(COL_OBJ_WT);
                StringBuilder scoreRefs = new StringBuilder();
                StringBuilder weightRefs = new StringBuilder();
                for (int i = 0; i < leaderObjSummaryRows.size(); i++) {
                    int xlSumRow = leaderObjSummaryRows.get(i) + 1;
                    if (i > 0) { scoreRefs.append(","); weightRefs.append(","); }
                    scoreRefs.append(scoreColLetter).append(xlSumRow);
                    weightRefs.append(objWtColLetter).append(xlSumRow);
                }
                String leaderScoreFormula = String.format(
                    "IF(SUM(%s)>0,SUMPRODUCT(%s,%s)/SUM(%s),AVERAGE(%s))",
                    weightRefs, scoreRefs, weightRefs, weightRefs, scoreRefs
                );

                Cell leaderScoreCell = leaderSumRow.createCell(scoreCol);
                leaderScoreCell.setCellFormula(leaderScoreFormula);
                leaderScoreCell.setCellStyle(st.scoreSummaryStyle);

                Cell leaderLevelCell = leaderSumRow.createCell(levelCol);
                leaderLevelCell.setCellFormula(levelFormula(rowIdx + 1, scoreCol, levels));
                leaderLevelCell.setCellStyle(st.levelSummaryStyle);

                // Dashed purple border
                applyBottomBorder(ws, rowIdx, totalCols, BorderStyle.MEDIUM, LEADER_BORDER);
                leaderSectionEndRow = rowIdx;
                rowIdx++;
            } else {
                leaderSectionEndRow = rowIdx - 1;
            }

            // Merge leader label (column B) across all leader rows
            if (leaderSectionStartRow >= 0 && leaderSectionEndRow > leaderSectionStartRow) {
                safeAddMerge(ws, leaderSectionStartRow, leaderSectionEndRow, COL_DEPT, COL_DEPT);
                ws.getRow(leaderSectionStartRow).getCell(COL_DEPT).setCellStyle(st.leaderLabelStyle);
            }
        }

        // ── Department Objectives Section ─────────────────────────────────
        int deptObjStartRow = rowIdx;
        List<Integer> deptObjSummaryRows = new ArrayList<>();

        List<ObjectiveDTO> objectives = dept.getObjectives();
        if (objectives != null) {
            for (ObjectiveDTO obj : objectives) {
                if (obj == null || obj.getKeyResults() == null || obj.getKeyResults().isEmpty()) continue;

                int objStartRow = rowIdx;
                List<KeyResultDTO> krs = obj.getKeyResults();
                int objWeight = obj.getWeight() != null ? obj.getWeight() : 0;

                for (KeyResultDTO kr : krs) {
                    if (kr == null) continue;
                    Row row = ws.createRow(rowIdx);
                    int krWeight = kr.getWeight() != null ? kr.getWeight() : 0;

                    // A: Division — only on first row of dept
                    if (rowIdx == deptStartRow) {
                        Cell c = row.createCell(COL_DIVISION);
                        c.setCellValue(divisionName);
                        c.setCellStyle(st.deptLabelStyle);
                    }

                    // B: Department name — only on first row of dept objectives section
                    if (rowIdx == deptObjStartRow) {
                        Cell c = row.createCell(COL_DEPT);
                        c.setCellValue(dept.getName() != null ? dept.getName() : "");
                        c.setCellStyle(st.deptLabelStyle);
                    }

                    // C: Objective name
                    if (rowIdx == objStartRow) {
                        Cell c = row.createCell(COL_OBJ);
                        c.setCellValue(obj.getName() != null ? obj.getName() : "");
                        c.setCellStyle(st.objNameStyle);
                    }

                    // D: Objective weight
                    if (rowIdx == objStartRow) {
                        Cell c = row.createCell(COL_OBJ_WT);
                        c.setCellValue(objWeight);
                        c.setCellStyle(st.weightStyle);
                    }

                    // E: KR name
                    row.createCell(COL_KR_NAME).setCellValue(kr.getName() != null ? kr.getName() : "");

                    // F: KR weight
                    Cell krWtCell = row.createCell(COL_KR_WT);
                    krWtCell.setCellValue(krWeight);
                    krWtCell.setCellStyle(st.weightStyle);

                    // G: Type
                    row.createCell(COL_TYPE).setCellValue(metricTypeDisplay(kr.getMetricType()));

                    // H: Actual value
                    Cell actualCell = row.createCell(COL_ACTUAL);
                    actualCell.setCellStyle(st.centeredStyle);
                    writeActualValue(actualCell, kr);

                    // I: Unit
                    row.createCell(COL_UNIT).setCellValue(kr.getUnit() != null ? kr.getUnit() : "");

                    // Threshold columns
                    writeThresholds(row, kr, levels, numLevels, threshStart, st);

                    // Score formula
                    int xlRow = rowIdx + 1;
                    Cell scoreCell = row.createCell(scoreCol);
                    writeScoreFormula(scoreCell, kr, xlRow, levels, threshStart, st);

                    // Level formula
                    Cell levelCell = row.createCell(levelCol);
                    writeLevelFormula(levelCell, kr, xlRow, scoreCol, levels, st);

                    rowIdx++;
                }

                // Objective Summary Row
                int objKrEndRow = rowIdx - 1;
                if (!krs.isEmpty()) {
                    Row sumRow = ws.createRow(rowIdx);

                    Cell lblCell = sumRow.createCell(COL_KR_NAME);
                    lblCell.setCellValue("\uD83D\uDCCA ВЗВЕШЕННАЯ ОЦЕНКА ЦЕЛИ");
                    lblCell.setCellStyle(st.objSummaryLabelStyle);

                    for (int c = COL_KR_WT; c < threshStart + numLevels; c++) {
                        sumRow.createCell(c).setCellStyle(st.objSummaryBgStyle);
                    }

                    String scoreColLetter = colLetter(scoreCol);
                    String krWtColLetter  = colLetter(COL_KR_WT);
                    int xlObjStart = objStartRow + 1;
                    int xlObjEnd   = objKrEndRow + 1;
                    String objScoreFormula = String.format(
                        "IF(SUM(%s%d:%s%d)>0," +
                        "SUMPRODUCT(%s%d:%s%d,%s%d:%s%d)/SUM(%s%d:%s%d)," +
                        "AVERAGE(%s%d:%s%d))",
                        krWtColLetter, xlObjStart, krWtColLetter, xlObjEnd,
                        scoreColLetter, xlObjStart, scoreColLetter, xlObjEnd,
                        krWtColLetter,  xlObjStart, krWtColLetter,  xlObjEnd,
                        krWtColLetter,  xlObjStart, krWtColLetter,  xlObjEnd,
                        scoreColLetter, xlObjStart, scoreColLetter, xlObjEnd
                    );

                    Cell objScoreCell = sumRow.createCell(scoreCol);
                    objScoreCell.setCellFormula(objScoreFormula);
                    objScoreCell.setCellStyle(st.scoreSummaryStyle);

                    Cell objLevelCell = sumRow.createCell(levelCol);
                    objLevelCell.setCellFormula(levelFormula(rowIdx + 1, scoreCol, levels));
                    objLevelCell.setCellStyle(st.levelSummaryStyle);

                    deptObjSummaryRows.add(rowIdx);
                    allObjSummaryRows.add(rowIdx);

                    applyBottomBorder(ws, rowIdx, totalCols, BorderStyle.MEDIUM, "000000");
                    rowIdx++;
                }

                // Merge objective cells
                int objEndRow = rowIdx - 1;
                if (objEndRow > objStartRow) {
                    safeAddMerge(ws, objStartRow, objEndRow, COL_OBJ, COL_OBJ);
                    safeAddMerge(ws, objStartRow, objEndRow, COL_OBJ_WT, COL_OBJ_WT);
                    ws.getRow(objStartRow).getCell(COL_OBJ_WT).setCellStyle(st.weightSumStyle);
                }
            }
        }

        // Merge dept name (column B) across dept objectives section
        int deptObjEndRow = rowIdx - 1;
        if (deptObjEndRow > deptObjStartRow) {
            safeAddMerge(ws, deptObjStartRow, deptObjEndRow, COL_DEPT, COL_DEPT);
            Row deptObjRow = ws.getRow(deptObjStartRow);
            if (deptObjRow != null && deptObjRow.getCell(COL_DEPT) != null) {
                deptObjRow.getCell(COL_DEPT).setCellStyle(st.deptLabelStyle);
            }
        }

        // ── Department Summary Row ────────────────────────────────────────
        if (!allObjSummaryRows.isEmpty()) {
            Row deptSumRow = ws.createRow(rowIdx);

            // A: Division
            Cell divCell = deptSumRow.createCell(COL_DIVISION);
            divCell.setCellValue(divisionName);
            divCell.setCellStyle(st.deptSummaryNameStyle);

            // B: Department name
            Cell deptLbl = deptSumRow.createCell(COL_DEPT);
            deptLbl.setCellValue(dept.getName() != null ? dept.getName() : "");
            deptLbl.setCellStyle(st.deptSummaryNameStyle);

            // E: Summary label
            Cell deptSumLbl = deptSumRow.createCell(COL_KR_NAME);
            deptSumLbl.setCellValue("\uD83C\uDFE2 ВЗВЕШЕННАЯ ОЦЕНКА ДЕПАРТАМЕНТА");
            deptSumLbl.setCellStyle(st.deptSummaryLabelStyle);

            for (int c = COL_OBJ; c < threshStart + numLevels; c++) {
                if (c != COL_KR_NAME && c != COL_DEPT) {
                    deptSumRow.createCell(c).setCellStyle(st.deptSummaryBgStyle);
                }
            }

            // SUMPRODUCT formula using ALL objective summary rows (leader + dept)
            String scoreColLetter = colLetter(scoreCol);
            String objWtColLetter = colLetter(COL_OBJ_WT);
            StringBuilder scoreRefs  = new StringBuilder();
            StringBuilder weightRefs = new StringBuilder();
            for (int i = 0; i < allObjSummaryRows.size(); i++) {
                int xlSumRow = allObjSummaryRows.get(i) + 1;
                if (i > 0) { scoreRefs.append(","); weightRefs.append(","); }
                scoreRefs.append(scoreColLetter).append(xlSumRow);
                weightRefs.append(objWtColLetter).append(xlSumRow);
            }
            String deptScoreFormula = String.format(
                "IF(SUM(%s)>0,SUMPRODUCT(%s,%s)/SUM(%s),AVERAGE(%s))",
                weightRefs, scoreRefs, weightRefs, weightRefs, scoreRefs
            );

            Cell deptScoreCell = deptSumRow.createCell(scoreCol);
            deptScoreCell.setCellFormula(deptScoreFormula);
            deptScoreCell.setCellStyle(st.deptScoreSummaryStyle);

            Cell deptLevelCell = deptSumRow.createCell(levelCol);
            deptLevelCell.setCellFormula(levelFormula(rowIdx + 1, scoreCol, levels));
            deptLevelCell.setCellStyle(st.deptLevelSummaryStyle);

            applyBottomBorder(ws, rowIdx, totalCols, BorderStyle.THICK, "000000");
            rowIdx++;
        }

        // Merge division column (A) across entire department block
        int deptEndRow = rowIdx - 1;
        if (deptEndRow > deptStartRow) {
            safeAddMerge(ws, deptStartRow, deptEndRow, COL_DIVISION, COL_DIVISION);
            Row firstRow = ws.getRow(deptStartRow);
            if (firstRow != null && firstRow.getCell(COL_DIVISION) != null) {
                firstRow.getCell(COL_DIVISION).setCellStyle(st.deptLabelStyle);
            }
        }

        return rowIdx;
    }

    // ─── Common write helpers ────────────────────────────────────────────────

    private void writeActualValue(Cell actualCell, KeyResultDTO kr) {
        if (kr.getMetricType() == KeyResult.MetricType.QUALITATIVE) {
            actualCell.setCellValue(kr.getActualValue() != null ? kr.getActualValue() : "E");
        } else {
            try {
                actualCell.setCellValue(Double.parseDouble(
                        kr.getActualValue() != null ? kr.getActualValue() : "0"));
            } catch (NumberFormatException e) {
                actualCell.setCellValue(0.0);
            }
        }
    }

    private void writeScoreFormula(Cell scoreCell, KeyResultDTO kr, int xlRow,
                                    List<ScoreLevel> levels, int threshStart, Styles st) {
        if (kr.getMetricType() == KeyResult.MetricType.QUALITATIVE) {
            scoreCell.setCellFormula(qualScoreFormula(xlRow, levels));
        } else if (kr.getThresholds() != null) {
            scoreCell.setCellFormula(quantScoreFormula(xlRow, kr.getMetricType(), levels, threshStart));
        } else {
            scoreCell.setCellValue(0.0);
        }
        scoreCell.setCellStyle(st.scoreCellStyle);
    }

    private void writeLevelFormula(Cell levelCell, KeyResultDTO kr, int xlRow,
                                    int scoreCol, List<ScoreLevel> levels, Styles st) {
        if (kr.getMetricType() == KeyResult.MetricType.QUALITATIVE) {
            levelCell.setCellFormula(qualLevelFormula(xlRow, levels));
        } else if (kr.getThresholds() != null) {
            levelCell.setCellFormula(levelFormula(xlRow, scoreCol, levels));
        } else {
            levelCell.setCellValue("Нет данных");
        }
        levelCell.setCellStyle(st.levelCellStyle);
    }

    // ─── Header ──────────────────────────────────────────────────────────────

    private void writeHeaderRow(XSSFSheet ws, Styles st, List<ScoreLevel> levels,
                                 int numLevels, int threshStart, int scoreCol, int levelCol) {
        Row hdr = ws.createRow(0);
        String[] fixedHeaders = {
            "Блок", "Департамент", "Цель", "Вес цели (%)", "Ключевой результат",
            "Вес KR (%)", "Тип", "Факт", "Ед. изм."
        };
        for (int i = 0; i < fixedHeaders.length; i++) {
            Cell c = hdr.createCell(i);
            c.setCellValue(fixedHeaders[i]);
            c.setCellStyle(i == COL_OBJ_WT || i == COL_KR_WT ? st.headerWeightStyle : st.headerStyle);
        }
        for (int i = 0; i < numLevels; i++) {
            Cell c = hdr.createCell(threshStart + i);
            c.setCellValue(levels.get(i).getName());
            XSSFCellStyle cs = (XSSFCellStyle) ws.getWorkbook().createCellStyle();
            cs.cloneStyleFrom(st.headerStyle);
            byte[] rgb = hexToBytes(levels.get(i).getColor());
            cs.setFillForegroundColor(new XSSFColor(rgb, null));
            cs.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            c.setCellStyle(cs);
        }
        hdr.createCell(scoreCol).setCellValue("Оценка");
        hdr.getCell(scoreCol).setCellStyle(st.headerStyle);
        hdr.createCell(levelCol).setCellValue("Уровень исполнения");
        hdr.getCell(levelCol).setCellStyle(st.headerStyle);
    }

    private void setColumnWidths(XSSFSheet ws, int numLevels, int scoreCol, int levelCol) {
        int[] widths = {18, 22, 32, 12, 38, 10, 18, 10, 10};
        for (int i = 0; i < widths.length; i++) ws.setColumnWidth(i, widths[i] * 256);
        for (int i = 0; i < numLevels; i++) ws.setColumnWidth(9 + i, 13 * 256);
        ws.setColumnWidth(scoreCol, 10 * 256);
        ws.setColumnWidth(levelCol, 22 * 256);
    }

    // ─── Threshold writing ───────────────────────────────────────────────────

    private void writeThresholds(Row row, KeyResultDTO kr, List<ScoreLevel> levels,
                                  int numLevels, int threshStart, Styles st) {
        if (kr.getMetricType() == KeyResult.MetricType.QUALITATIVE) {
            String[] grades = {"E", "D", "C", "B", "A"};
            for (int i = 0; i < numLevels; i++) {
                Cell c = row.createCell(threshStart + i);
                c.setCellValue(i < grades.length ? grades[i] : "");
                c.setCellStyle(st.thresholdStyles.get(i));
            }
        } else {
            Double[] vals = thresholdValues(kr, numLevels);
            for (int i = 0; i < numLevels; i++) {
                Cell c = row.createCell(threshStart + i);
                c.setCellValue(vals[i]);
                c.setCellStyle(st.thresholdStyles.get(i));
            }
        }
    }

    // ─── Score formulas ──────────────────────────────────────────────────────

    private String quantScoreFormula(int xlRow, KeyResult.MetricType type,
                                     List<ScoreLevel> levels, int threshStart) {
        String actualCol = colLetter(COL_ACTUAL);
        int n = levels.size();
        StringBuilder sb = new StringBuilder("ROUND(");

        if (type == KeyResult.MetricType.LOWER_BETTER) {
            for (int i = n - 1; i >= 0; i--) {
                String tCol = colLetter(threshStart + i);
                if (i == n - 1) {
                    sb.append(String.format("IF(%s%d<=%s%d,1.0,", actualCol, xlRow, tCol, xlRow));
                } else if (i == 0) {
                    sb.append(levels.get(0).getScoreValue());
                } else {
                    String nextTCol = colLetter(threshStart + i + 1);
                    double score     = levels.get(i).getScoreValue();
                    double nextScore = (i + 1 == n - 1) ? 1.0 : levels.get(i + 1).getScoreValue();
                    double diff      = nextScore - score;
                    sb.append(String.format(
                        "IF(%s%d<=%s%d,%s+(%s%d-%s%d)/MAX(%s%d-%s%d,0.001)*%s,",
                        actualCol, xlRow, tCol, xlRow,
                        score,
                        tCol, xlRow, actualCol, xlRow,
                        tCol, xlRow, nextTCol, xlRow,
                        diff
                    ));
                }
            }
        } else {
            for (int i = n - 1; i >= 0; i--) {
                String tCol = colLetter(threshStart + i);
                if (i == n - 1) {
                    sb.append(String.format("IF(%s%d>=%s%d,1.0,", actualCol, xlRow, tCol, xlRow));
                } else if (i == 0) {
                    sb.append(levels.get(0).getScoreValue());
                } else {
                    String nextTCol = colLetter(threshStart + i + 1);
                    double score     = levels.get(i).getScoreValue();
                    double nextScore = (i + 1 == n - 1) ? 1.0 : levels.get(i + 1).getScoreValue();
                    double diff      = nextScore - score;
                    sb.append(String.format(
                        "IF(%s%d>=%s%d,%s+(%s%d-%s%d)/MAX(%s%d-%s%d,0.001)*%s,",
                        actualCol, xlRow, tCol, xlRow,
                        score,
                        actualCol, xlRow, tCol, xlRow,
                        nextTCol, xlRow, tCol, xlRow,
                        diff
                    ));
                }
            }
        }

        for (int i = 0; i < n - 1; i++) sb.append(")");
        sb.append(",2)");
        return sb.toString();
    }

    private String qualScoreFormula(int xlRow, List<ScoreLevel> levels) {
        String actualCol = colLetter(COL_ACTUAL);
        String[] grades  = {"A", "B", "C", "D", "E"};
        int n = Math.min(levels.size(), grades.length);
        StringBuilder sb = new StringBuilder();
        for (int i = n - 1; i >= 0; i--) {
            String grade = grades[n - 1 - i];
            double score = (i == n - 1) ? 1.0 : levels.get(i).getScoreValue();
            if (i == n - 1) {
                sb.append(String.format("IF(%s%d=\"%s\",%s,", actualCol, xlRow, grade, score));
            } else if (i == 0) {
                sb.append(score);
                for (int j = 0; j < n - 1; j++) sb.append(")");
            } else {
                sb.append(String.format("IF(%s%d=\"%s\",%s,", actualCol, xlRow, grade, score));
            }
        }
        return sb.toString();
    }

    private String qualLevelFormula(int xlRow, List<ScoreLevel> levels) {
        String actualCol = colLetter(COL_ACTUAL);
        String[] grades  = {"A", "B", "C", "D", "E"};
        int n = Math.min(levels.size(), grades.length);
        StringBuilder sb = new StringBuilder();
        for (int i = n - 1; i >= 0; i--) {
            String grade     = grades[n - 1 - i];
            String levelName = levels.get(i).getName();
            if (i == n - 1) {
                sb.append(String.format("IF(%s%d=\"%s\",\"%s\",", actualCol, xlRow, grade, levelName));
            } else if (i == 0) {
                sb.append("\"").append(levelName).append("\"");
                for (int j = 0; j < n - 1; j++) sb.append(")");
            } else {
                sb.append(String.format("IF(%s%d=\"%s\",\"%s\",", actualCol, xlRow, grade, levelName));
            }
        }
        return sb.toString();
    }

    private String levelFormula(int xlRow, int scoreCol, List<ScoreLevel> levels) {
        String sCol = colLetter(scoreCol);
        StringBuilder sb = new StringBuilder();
        for (int i = levels.size() - 1; i >= 0; i--) {
            double v    = levels.get(i).getScoreValue();
            String name = levels.get(i).getName();
            if (i == levels.size() - 1) {
                sb.append(String.format("IF(%s%d>=%s,\"%s\",", sCol, xlRow, v, name));
            } else if (i == 0) {
                sb.append("\"").append(name).append("\"");
                for (int j = 0; j < levels.size() - 1; j++) sb.append(")");
            } else {
                sb.append(String.format("IF(%s%d>=%s,\"%s\",", sCol, xlRow, v, name));
            }
        }
        return sb.toString();
    }

    // ─── Conditional formatting ──────────────────────────────────────────────

    private void applyConditionalFormatting(XSSFSheet ws, int lastRow,
                                             int scoreCol, int levelCol,
                                             List<ScoreLevel> levels) {
        XSSFSheetConditionalFormatting cf = ws.getSheetConditionalFormatting();
        String sColLetter = colLetter(scoreCol);

        CellRangeAddress[] scoreRange = { new CellRangeAddress(1, lastRow, scoreCol, scoreCol) };
        CellRangeAddress[] levelRange = { new CellRangeAddress(1, lastRow, levelCol, levelCol) };

        for (int i = levels.size() - 1; i >= 0; i--) {
            double lo = levels.get(i).getScoreValue();
            byte[] rgb = hexToBytes(levels.get(i).getColor());

            String condition = (i == levels.size() - 1)
                    ? String.format("$%s2>=%s", sColLetter, lo)
                    : String.format("AND($%s2>=%s,$%s2<%s)", sColLetter, lo, sColLetter, levels.get(i + 1).getScoreValue());

            ConditionalFormattingRule rule = cf.createConditionalFormattingRule(condition);
            PatternFormatting pf = rule.createPatternFormatting();
            pf.setFillBackgroundColor(new XSSFColor(rgb, null));
            pf.setFillPattern(PatternFormatting.SOLID_FOREGROUND);
            rule.createFontFormatting().setFontColorIndex(IndexedColors.WHITE.getIndex());

            cf.addConditionalFormatting(scoreRange, rule);
            cf.addConditionalFormatting(levelRange, rule);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private List<ScoreLevel> getScoreLevels() {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        if (levels.isEmpty()) {
            List<ScoreLevel> defaults = new ArrayList<>();
            for (int i = 0; i < DEFAULT_LEVELS.size(); i++) {
                DefaultLevel dl = DEFAULT_LEVELS.get(i);
                defaults.add(ScoreLevel.builder()
                        .name(dl.name()).scoreValue(dl.scoreValue())
                        .color(dl.color()).displayOrder(i).build());
            }
            return defaults;
        }
        levels.sort(Comparator.comparingDouble(ScoreLevel::getScoreValue));
        return levels;
    }

    private Double[] thresholdValues(KeyResultDTO kr, int numLevels) {
        Double[] result = new Double[numLevels];
        var t = kr.getThresholds();
        Double[] backend = {
            t != null && t.getBelow()       != null ? t.getBelow()       : 0.0,
            t != null && t.getMeets()       != null ? t.getMeets()       : 0.0,
            t != null && t.getGood()        != null ? t.getGood()        : 0.0,
            t != null && t.getVeryGood()    != null ? t.getVeryGood()    : 0.0,
            t != null && t.getExceptional() != null ? t.getExceptional() : 0.0
        };
        for (int i = 0; i < numLevels; i++) result[i] = backend[Math.min(i, 4)];
        return result;
    }

    private static String sanitizeSheetName(String name) {
        String sanitized = name.replaceAll("[\\\\/*?\\[\\]:]", "");
        if (sanitized.length() > 31) sanitized = sanitized.substring(0, 31);
        if (sanitized.isBlank()) sanitized = "Sheet";
        return sanitized;
    }

    static String colLetter(int colIndex) {
        StringBuilder sb = new StringBuilder();
        int idx = colIndex;
        while (idx >= 0) {
            sb.insert(0, (char) ('A' + (idx % 26)));
            idx = idx / 26 - 1;
        }
        return sb.toString();
    }

    static byte[] hexToBytes(String hex) {
        if (hex == null || hex.isEmpty()) return new byte[]{(byte)128, (byte)128, (byte)128};
        String h = hex.startsWith("#") ? hex.substring(1) : hex;
        try {
            return new byte[]{
                (byte) Integer.parseInt(h.substring(0, 2), 16),
                (byte) Integer.parseInt(h.substring(2, 4), 16),
                (byte) Integer.parseInt(h.substring(4, 6), 16)
            };
        } catch (Exception e) {
            return new byte[]{(byte)128, (byte)128, (byte)128};
        }
    }

    private static String metricTypeDisplay(KeyResult.MetricType t) {
        if (t == null) return "";
        return switch (t) {
            case HIGHER_BETTER -> "↑ Чем выше, тем лучше";
            case LOWER_BETTER  -> "↓ Чем ниже, тем лучше";
            case QUALITATIVE   -> "Качественный (A-E)";
        };
    }

    private void applyBottomBorder(XSSFSheet ws, int rowIdx, int totalCols,
                                    BorderStyle style, String hexColor) {
        Row row = ws.getRow(rowIdx);
        if (row == null) return;
        for (int c = 0; c < totalCols; c++) {
            Cell cell = row.getCell(c);
            if (cell == null) cell = row.createCell(c);
            XSSFCellStyle cs = (XSSFCellStyle) ws.getWorkbook().createCellStyle();
            if (cell.getCellStyle() != null) cs.cloneStyleFrom(cell.getCellStyle());
            cs.setBorderBottom(style);
            cs.setBottomBorderColor(new XSSFColor(hexToBytes(hexColor), null));
            cell.setCellStyle(cs);
        }
    }

    private void safeAddMerge(XSSFSheet ws, int r1, int r2, int c1, int c2) {
        if (r2 > r1) ws.addMergedRegion(new CellRangeAddress(r1, r2, c1, c2));
    }

    // ─── Style bundle ─────────────────────────────────────────────────────────

    private class Styles {
        final CellStyle headerStyle;
        final CellStyle headerWeightStyle;
        final CellStyle weightStyle;
        final CellStyle weightSumStyle;
        final CellStyle centeredStyle;
        final CellStyle objNameStyle;
        final CellStyle deptLabelStyle;
        final CellStyle leaderLabelStyle;
        final CellStyle leaderSummaryLabelStyle;
        final CellStyle scoreCellStyle;
        final CellStyle levelCellStyle;
        final CellStyle objSummaryLabelStyle;
        final CellStyle objSummaryBgStyle;
        final CellStyle scoreSummaryStyle;
        final CellStyle levelSummaryStyle;
        final CellStyle deptSummaryNameStyle;
        final CellStyle deptSummaryLabelStyle;
        final CellStyle deptSummaryBgStyle;
        final CellStyle deptScoreSummaryStyle;
        final CellStyle deptLevelSummaryStyle;
        final List<CellStyle> thresholdStyles;

        Styles(XSSFWorkbook wb, List<ScoreLevel> levels, int numLevels) {
            Font whiteBold = wb.createFont();
            whiteBold.setBold(true); whiteBold.setColor(IndexedColors.WHITE.getIndex());

            Font whiteBoldLg = wb.createFont();
            whiteBoldLg.setBold(true); whiteBoldLg.setColor(IndexedColors.WHITE.getIndex()); whiteBoldLg.setFontHeightInPoints((short)11);

            XSSFFont orangeBold = (XSSFFont) wb.createFont();
            orangeBold.setBold(true); orangeBold.setColor(new XSSFColor(hexToBytes("#" + WEIGHT_FG), null));

            XSSFFont darkBlueBold = (XSSFFont) wb.createFont();
            darkBlueBold.setBold(true); darkBlueBold.setColor(new XSSFColor(hexToBytes("#1F3864"), null));

            XSSFFont purpleBold = (XSSFFont) wb.createFont();
            purpleBold.setBold(true); purpleBold.setColor(new XSSFColor(hexToBytes("#" + LEADER_FG), null));

            // Header
            headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(new XSSFColor(hexToBytes("#" + HEADER_COLOR), null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setFont(whiteBold);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setWrapText(true);

            headerWeightStyle = wb.createCellStyle();
            headerWeightStyle.cloneStyleFrom(headerStyle);
            ((XSSFCellStyle) headerWeightStyle).setFillForegroundColor(new XSSFColor(hexToBytes("#" + WEIGHT_FG), null));

            weightStyle = wb.createCellStyle();
            weightStyle.setFillForegroundColor(new XSSFColor(hexToBytes("#" + WEIGHT_BG), null));
            weightStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            weightStyle.setFont(orangeBold);
            weightStyle.setAlignment(HorizontalAlignment.CENTER);
            weightStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            weightStyle.setDataFormat(wb.createDataFormat().getFormat("0\"%\""));

            weightSumStyle = wb.createCellStyle();
            weightSumStyle.cloneStyleFrom(weightStyle);
            weightSumStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            centeredStyle = wb.createCellStyle();
            centeredStyle.setAlignment(HorizontalAlignment.CENTER);
            centeredStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            objNameStyle = wb.createCellStyle();
            objNameStyle.setAlignment(HorizontalAlignment.CENTER);
            objNameStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            objNameStyle.setWrapText(true);
            Font objFont = wb.createFont(); objFont.setBold(true);
            objNameStyle.setFont(objFont);

            deptLabelStyle = wb.createCellStyle();
            deptLabelStyle.setAlignment(HorizontalAlignment.CENTER);
            deptLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            deptLabelStyle.setWrapText(true);
            Font deptFont = wb.createFont(); deptFont.setBold(true);
            deptLabelStyle.setFont(deptFont);

            // Leader styles
            leaderLabelStyle = wb.createCellStyle();
            ((XSSFCellStyle) leaderLabelStyle).setFillForegroundColor(new XSSFColor(hexToBytes("#" + LEADER_BG), null));
            leaderLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            leaderLabelStyle.setFont(purpleBold);
            leaderLabelStyle.setAlignment(HorizontalAlignment.CENTER);
            leaderLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            leaderLabelStyle.setWrapText(true);

            leaderSummaryLabelStyle = wb.createCellStyle();
            leaderSummaryLabelStyle.setFont(whiteBold);
            leaderSummaryLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
            leaderSummaryLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            scoreCellStyle = wb.createCellStyle();
            scoreCellStyle.setAlignment(HorizontalAlignment.CENTER);
            scoreCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            scoreCellStyle.setDataFormat(wb.createDataFormat().getFormat("0.00"));
            scoreCellStyle.setFont(whiteBold);

            levelCellStyle = wb.createCellStyle();
            levelCellStyle.setAlignment(HorizontalAlignment.CENTER);
            levelCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            levelCellStyle.setFont(whiteBold);

            XSSFColor objSumBgColor = new XSSFColor(hexToBytes("#" + OBJ_SUMMARY_BG), null);
            objSummaryLabelStyle = wb.createCellStyle();
            ((XSSFCellStyle)objSummaryLabelStyle).setFillForegroundColor(objSumBgColor);
            objSummaryLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            objSummaryLabelStyle.setFont(darkBlueBold);
            objSummaryLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
            objSummaryLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            objSummaryBgStyle = wb.createCellStyle();
            ((XSSFCellStyle)objSummaryBgStyle).setFillForegroundColor(objSumBgColor);
            objSummaryBgStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            scoreSummaryStyle = wb.createCellStyle();
            scoreSummaryStyle.cloneStyleFrom(scoreCellStyle);
            ((XSSFCellStyle)scoreSummaryStyle).setFillForegroundColor(objSumBgColor);
            scoreSummaryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            scoreSummaryStyle.setFont(darkBlueBold);

            levelSummaryStyle = wb.createCellStyle();
            levelSummaryStyle.cloneStyleFrom(levelCellStyle);
            ((XSSFCellStyle)levelSummaryStyle).setFillForegroundColor(objSumBgColor);
            levelSummaryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            levelSummaryStyle.setFont(darkBlueBold);

            XSSFColor deptSumBgColor = new XSSFColor(hexToBytes("#" + DEPT_SUMMARY_BG), null);
            deptSummaryNameStyle = wb.createCellStyle();
            ((XSSFCellStyle)deptSummaryNameStyle).setFillForegroundColor(deptSumBgColor);
            deptSummaryNameStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            deptSummaryNameStyle.setFont(whiteBoldLg);
            deptSummaryNameStyle.setAlignment(HorizontalAlignment.CENTER);
            deptSummaryNameStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            deptSummaryLabelStyle = wb.createCellStyle();
            ((XSSFCellStyle)deptSummaryLabelStyle).setFillForegroundColor(deptSumBgColor);
            deptSummaryLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            deptSummaryLabelStyle.setFont(whiteBoldLg);
            deptSummaryLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
            deptSummaryLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            deptSummaryBgStyle = wb.createCellStyle();
            ((XSSFCellStyle)deptSummaryBgStyle).setFillForegroundColor(deptSumBgColor);
            deptSummaryBgStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            deptScoreSummaryStyle = wb.createCellStyle();
            deptScoreSummaryStyle.cloneStyleFrom(scoreCellStyle);
            ((XSSFCellStyle)deptScoreSummaryStyle).setFillForegroundColor(deptSumBgColor);
            deptScoreSummaryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            deptScoreSummaryStyle.setFont(whiteBoldLg);

            deptLevelSummaryStyle = wb.createCellStyle();
            deptLevelSummaryStyle.cloneStyleFrom(levelCellStyle);
            ((XSSFCellStyle)deptLevelSummaryStyle).setFillForegroundColor(deptSumBgColor);
            deptLevelSummaryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            deptLevelSummaryStyle.setFont(whiteBoldLg);

            thresholdStyles = new ArrayList<>();
            for (ScoreLevel level : levels) {
                XSSFCellStyle ts = (XSSFCellStyle) wb.createCellStyle();
                ts.setFillForegroundColor(new XSSFColor(hexToBytes(level.getColor()), null));
                ts.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                ts.setFont(whiteBold);
                ts.setAlignment(HorizontalAlignment.CENTER);
                ts.setVerticalAlignment(VerticalAlignment.CENTER);
                thresholdStyles.add(ts);
            }
        }
    }
}
