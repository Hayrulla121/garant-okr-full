package uz.garantbank.okrTrackingSystem.service;

import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.EvaluationRepository;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.lang.Double.parseDouble;

@Slf4j
@Service
public class ScoreCalculationService {

    private final ScoreLevelRepository scoreLevelRepository;
    private final EvaluationRepository evaluationRepository;

    // Thread-local cache to avoid N+1 queries within a single request
    private final ThreadLocal<List<ScoreLevel>> scoreLevelCache = new ThreadLocal<>();

    public ScoreCalculationService(ScoreLevelRepository scoreLevelRepository,
            EvaluationRepository evaluationRepository) {
        this.scoreLevelRepository = scoreLevelRepository;
        this.evaluationRepository = evaluationRepository;
    }

    /**
     * Get score levels with caching to avoid N+1 queries
     */
    private List<ScoreLevel> getScoreLevels() {
        List<ScoreLevel> cached = scoreLevelCache.get();
        if (cached == null) {
            cached = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
            scoreLevelCache.set(cached);
        }
        return cached;
    }

    /**
     * Clear the thread-local cache (should be called after processing a request)
     */
    public void clearCache() {
        scoreLevelCache.remove();
    }

    // Default fallback level definitions (used if DB is empty) - 0.0-1.0 normalized
    // scale
    private static final Map<String, LevelInfo> DEFAULT_LEVELS = Map.of(
            "не_соответствует", new LevelInfo(0.0, 0.30, "#d9534f"),
            "ниже_ожиданий", new LevelInfo(0.31, 0.50, "#f0ad4e"),
            "на_уровне_ожиданий", new LevelInfo(0.51, 0.85, "#5cb85c"),
            "превышает_ожидания", new LevelInfo(0.86, 0.97, "#28a745"),
            "исключительно", new LevelInfo(0.98, 1.00, "#1e7b34"));

    // Qualitative grades mapping - 0.0-1.0 normalized scale
    private static final Map<String, QualitativeGrade> QUALITATIVE_GRADES = Map.of(
            "A", new QualitativeGrade(0.98, "исключительно"),
            "B", new QualitativeGrade(0.86, "превышает_ожидания"),
            "C", new QualitativeGrade(0.51, "на_уровне_ожиданий"),
            "D", new QualitativeGrade(0.31, "ниже_ожиданий"),
            "E", new QualitativeGrade(0.0, "не_соответствует"));

    // calculate the score for a KR

    public ScoreResult calculateKeyResultScore(KeyResult kr) {
        if (kr.getMetricType() == KeyResult.MetricType.QUALITATIVE) {
            return calculateQualitativeScore(kr.getActualValue());
        }

        String actualValueStr = kr.getActualValue();
        if (actualValueStr == null || actualValueStr.trim().isEmpty()) {
            actualValueStr = "0";
        }

        double actualValue;
        try {
            actualValue = parseDouble(actualValueStr);
        } catch (NumberFormatException e) {
            log.warn("Invalid actual value '{}' for KR '{}', defaulting to 0", actualValueStr, kr.getName());
            actualValue = 0;
        }

        // Log calculation inputs for debugging
        log.debug(
                "Calculating score for KR '{}': actual={}, type={}, thresholds=[below={}, meets={}, good={}, veryGood={}, exceptional={}]",
                kr.getName(), actualValue, kr.getMetricType(),
                kr.getThresholdBelow(), kr.getThresholdMeets(), kr.getThresholdGood(),
                kr.getThresholdVeryGood(), kr.getThresholdExceptional());

        ScoreResult result = calculateQuantitativeScore(
                actualValue,
                kr.getMetricType(),
                kr.getThresholdBelow(),
                kr.getThresholdMeets(),
                kr.getThresholdGood(),
                kr.getThresholdVeryGood(),
                kr.getThresholdExceptional());

        log.debug("KR '{}' score result: score={}, level={}", kr.getName(), result.getScore(), result.getLevel());

        return result;
    }

    private ScoreResult calculateQualitativeScore(String grade) {
        String normalizedGrade = grade != null ? grade.toUpperCase().trim() : "E";

        // Get dynamic score levels
        List<ScoreLevel> scoreLevels = getScoreLevels();

        if (scoreLevels.isEmpty()) {
            // Fallback to hardcoded values if no levels configured
            QualitativeGrade gradeInfo = QUALITATIVE_GRADES.getOrDefault(normalizedGrade,
                    QUALITATIVE_GRADES.get("E"));
            return ScoreResult.builder()
                    .score(gradeInfo.score())
                    .level(gradeInfo.level())
                    .color(getColorForLevel(gradeInfo.level()))
                    .percentage(scoreToPercentage(gradeInfo.score()))
                    .build();
        }

        // Sort levels by scoreValue to get proper ordering
        List<ScoreLevel> sortedLevels = scoreLevels.stream()
                .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                .toList();

        // Map grades A-E to score levels dynamically
        // A = highest (exceptional), E = lowest (below)
        int numLevels = sortedLevels.size();
        int levelIndex;
        switch (normalizedGrade) {
            case "A" -> levelIndex = numLevels - 1; // Highest level
            case "B" -> levelIndex = Math.min(numLevels - 2, numLevels - 1);
            case "C" -> levelIndex = numLevels / 2; // Middle level
            case "D" -> levelIndex = Math.max(1, 0);
            case "E" -> levelIndex = 0; // Lowest level
            default -> levelIndex = 0;
        }

        // Ensure index is within bounds
        levelIndex = Math.max(0, Math.min(levelIndex, numLevels - 1));

        ScoreLevel selectedLevel = sortedLevels.get(levelIndex);
        double score = selectedLevel.getScoreValue();
        String level = selectedLevel.getName().toLowerCase().replace(" ", "_");

        return ScoreResult.builder()
                .score(score)
                .level(level)
                .color(selectedLevel.getColor())
                .percentage(scoreToPercentage(score))
                .build();
    }

    // !!!
    private ScoreResult calculateQuantitativeScore(
            double actual, KeyResult.MetricType type,
            Double below, Double meets, Double good, Double veryGood, Double exceptional) {

        // Handle null threshold values with sensible defaults
        // For LOWER_BETTER: thresholds should be in descending order (below > meets >
        // good > veryGood > exceptional)
        // For HIGHER_BETTER: thresholds should be in ascending order (below < meets <
        // good < veryGood < exceptional)
        if (below == null)
            below = (type == KeyResult.MetricType.LOWER_BETTER) ? 100.0 : 0.0;
        if (meets == null)
            meets = (type == KeyResult.MetricType.LOWER_BETTER) ? 75.0 : 25.0;
        if (good == null)
            good = 50.0;
        if (veryGood == null)
            veryGood = (type == KeyResult.MetricType.LOWER_BETTER) ? 25.0 : 75.0;
        if (exceptional == null)
            exceptional = (type == KeyResult.MetricType.LOWER_BETTER) ? 0.0 : 100.0;

        // Get dynamic score levels from database (cached)
        List<ScoreLevel> scoreLevels = getScoreLevels();

        // If no custom levels, use default threshold-to-score mapping
        if (scoreLevels.isEmpty()) {
            return calculateWithDefaultLevels(actual, type, below, meets, good, veryGood, exceptional);
        }

        // Create threshold-to-score-level mapping
        // Map the 5 backend thresholds to dynamic score levels
        // scoreLevels are sorted by scoreValue ascending: [lowest, ..., highest]
        int numLevels = scoreLevels.size();

        // Build a list of threshold-score pairs, sorted by threshold value
        // For missing thresholds (null), we'll skip them
        List<ThresholdScore> thresholdScores = new ArrayList<>();

        if (below != null)
            thresholdScores.add(new ThresholdScore(below, 0));
        if (meets != null)
            thresholdScores.add(new ThresholdScore(meets, Math.min(1, numLevels - 1)));
        if (good != null)
            thresholdScores.add(new ThresholdScore(good, Math.min(2, numLevels - 1)));
        if (veryGood != null)
            thresholdScores.add(new ThresholdScore(veryGood, Math.min(3, numLevels - 1)));
        if (exceptional != null)
            thresholdScores.add(new ThresholdScore(exceptional, numLevels - 1));

        // Sort thresholds based on metric type
        if (type == KeyResult.MetricType.HIGHER_BETTER) {
            thresholdScores.sort(Comparator.comparingDouble(ts -> ts.threshold));
        } else {
            thresholdScores.sort((ts1, ts2) -> Double.compare(ts2.threshold, ts1.threshold));
        }

        // Find which range the actual value falls into
        double score = scoreLevels.get(0).getScoreValue();
        String level = scoreLevels.get(0).getName().toLowerCase().replace(" ", "_");

        // The maximum achievable score is always 1.0.
        // scoreValue in DB is the LOWER BOUND of each level's range, not the ceiling.
        // e.g. "исключительно" starts at 0.98 but the ceiling is 1.0.
        final int lastIdx = thresholdScores.size() - 1;

        if (type == KeyResult.MetricType.HIGHER_BETTER) {
            boolean found = false;
            for (int i = lastIdx; i >= 0; i--) {
                ThresholdScore ts = thresholdScores.get(i);
                if (actual >= ts.threshold) {
                    int scoreIdx = ts.scoreLevelIndex;

                    if (i == lastIdx) {
                        // At or beyond the highest threshold → perfect score 1.0
                        score = 1.0;
                        level = scoreLevels.get(scoreIdx).getName().toLowerCase().replace(" ", "_");
                    } else {
                        // Interpolate between current level and the next level
                        ThresholdScore nextTs = thresholdScores.get(i + 1);
                        double ratio = (actual - ts.threshold) / Math.max(nextTs.threshold - ts.threshold, 0.001);
                        double startScore = scoreLevels.get(scoreIdx).getScoreValue();
                        double endScore = (i + 1 == lastIdx) ? 1.0
                                : scoreLevels.get(nextTs.scoreLevelIndex).getScoreValue();
                        score = startScore + ratio * (endScore - startScore);
                        level = scoreLevels.get(scoreIdx).getName().toLowerCase().replace(" ", "_");
                    }
                    found = true;
                    break;
                }
            }

            if (!found) {
                score = scoreLevels.get(0).getScoreValue();
                level = scoreLevels.get(0).getName().toLowerCase().replace(" ", "_");
            }
        } else {
            // LOWER_BETTER: smaller actual value is better
            boolean found = false;
            for (int i = lastIdx; i >= 0; i--) {
                ThresholdScore ts = thresholdScores.get(i);
                if (actual <= ts.threshold) {
                    int scoreIdx = ts.scoreLevelIndex;

                    if (i == lastIdx) {
                        // At or below the best threshold → perfect score 1.0
                        score = 1.0;
                        level = scoreLevels.get(scoreIdx).getName().toLowerCase().replace(" ", "_");
                    } else {
                        ThresholdScore nextTs = thresholdScores.get(i + 1);
                        double ratio = 1
                                - (actual - nextTs.threshold) / Math.max(ts.threshold - nextTs.threshold, 0.001);
                        double startScore = scoreLevels.get(scoreIdx).getScoreValue();
                        double endScore = (i + 1 == lastIdx) ? 1.0
                                : scoreLevels.get(nextTs.scoreLevelIndex).getScoreValue();
                        score = startScore + ratio * (endScore - startScore);
                        level = scoreLevels.get(scoreIdx).getName().toLowerCase().replace(" ", "_");
                    }
                    found = true;
                    break;
                }
            }

            if (!found) {
                score = scoreLevels.get(0).getScoreValue();
                level = scoreLevels.get(0).getName().toLowerCase().replace(" ", "_");
            }
        }

        double minScore = scoreLevels.stream().mapToDouble(ScoreLevel::getScoreValue).min().orElse(0.0);
        // Max is always 1.0 — scoreValue is the lower bound of a level, not its ceiling
        score = Math.min(Math.max(score, minScore), 1.0);
        score = Math.round(score * 100.0) / 100.0;

        return ScoreResult.builder()
                .score(score)
                .level(level)
                .color(getColorForLevel(level))
                .percentage(scoreToPercentage(score))
                .build();
    }

    // Helper class for threshold-score mapping
    private static class ThresholdScore {
        double threshold;
        int scoreLevelIndex;

        ThresholdScore(double threshold, int scoreLevelIndex) {
            this.threshold = threshold;
            this.scoreLevelIndex = scoreLevelIndex;
        }
    }

    private ScoreResult calculateWithDefaultLevels(
            double actual, KeyResult.MetricType type,
            Double below, Double meets, Double good, Double veryGood, Double exceptional) {

        // Default score values for 5 levels (0.0 to 1.0 normalized scale)
        // Discrete step function: assign the lower bound of the matched level.
        double scoreBelow = 0.0;
        double scoreMeets = 0.31;
        double scoreGood = 0.51;
        double scoreVeryGood = 0.86;
        double scoreExceptional = 0.98;

        double score;
        String level;

        if (type == KeyResult.MetricType.HIGHER_BETTER) {
            if (actual >= exceptional) {
                score = scoreExceptional;
                level = "исключительно";
            } else if (actual >= veryGood) {
                score = scoreVeryGood;
                level = "превышает_ожидания";
            } else if (actual >= good) {
                score = scoreGood;
                level = "на_уровне_ожиданий";
            } else if (actual >= meets) {
                score = scoreMeets;
                level = "ниже_ожиданий";
            } else if (actual >= below) {
                score = scoreBelow;
                level = "не_соответствует";
            } else {
                score = scoreBelow;
                level = "не_соответствует";
            }
        } else {
            if (actual <= exceptional) {
                score = scoreExceptional;
                level = "исключительно";
            } else if (actual <= veryGood) {
                score = scoreVeryGood;
                level = "превышает_ожидания";
            } else if (actual <= good) {
                score = scoreGood;
                level = "на_уровне_ожиданий";
            } else if (actual <= meets) {
                score = scoreMeets;
                level = "ниже_ожиданий";
            } else if (actual <= below) {
                score = scoreBelow;
                level = "не_соответствует";
            } else {
                score = scoreBelow;
                level = "не_соответствует";
            }
        }

        score = Math.min(Math.max(score, scoreBelow), 1.0);
        score = Math.round(score * 100.0) / 100.0;

        return ScoreResult.builder()
                .score(score)
                .level(level)
                .color(getColorForLevel(level))
                .percentage(scoreToPercentage(score))
                .build();
    }

    /**
     * Calculate weighted score for an Objective (weighted average of KR scores)
     * Formula: OKR = (KR1 × weight1) + (KR2 × weight2) + (KR3 × weight3) /
     * totalWeight
     * Example: KR1(4.5 × 60%) + KR2(4.7 × 30%) + KR3(4.8 × 10%) = 4.59
     */
    public ScoreResult calculateObjectiveScore(Collection<KeyResult> keyResults) {
        if (keyResults == null || keyResults.isEmpty()) {
            return emptyScore();
        }

        // Filter out inactive KRs
        List<KeyResult> activeKRs = keyResults.stream()
                .filter(kr -> kr.getActive() == null || kr.getActive())
                .toList();

        if (activeKRs.isEmpty()) {
            return emptyScore();
        }

        double weightedSum = 0;
        double totalWeight = 0;

        for (KeyResult kr : activeKRs) {
            ScoreResult krScore = calculateKeyResultScore(kr);
            double weight = kr.getWeight() != null ? kr.getWeight() : 0;
            weightedSum += krScore.getScore() * weight;
            totalWeight += weight;
        }

        double avgScore;
        if (totalWeight > 0) {
            // Weights are percentages out of 100, so divide by max(totalWeight, 100)
            // to avoid inflating scores when KR weights don't sum to 100%
            avgScore = weightedSum / Math.max(totalWeight, 100.0);
        } else {
            // Fallback to simple average if no weights defined
            double total = 0;
            for (KeyResult kr : activeKRs) {
                total += calculateKeyResultScore(kr).getScore();
            }
            avgScore = total / activeKRs.size();
        }

        return createScoreResult(avgScore);
    }

    // CalculateDivisionScore

    public ScoreResult calculateDivisionScore(Collection<Department> departments) {
        if (departments == null || departments.isEmpty()) {
            return emptyScore();
        }
        double weightedSum = 0;
        double totalWeight = 0;

        // Count departments with objectives for default weight calculation
        long departmentsWithObjectives = departments.stream()
                .filter(dept -> dept.getObjectives() != null && !dept.getObjectives().isEmpty())
                .count();

        if (departmentsWithObjectives == 0) {
            return emptyScore();
        }

        for (Department dept : departments) {
            // skit departments with no objectives
            if (dept.getObjectives() == null || dept.getObjectives().isEmpty()) {
                continue;
            }

            // Equal weight for all departments (can be customized if needed)
            double weight = 100.0 / departmentsWithObjectives;

            // Calculate department score
            ScoreResult deptScore = calculateDepartmentScore(dept.getObjectives());
            weightedSum += deptScore.getScore() * weight;
            totalWeight += weight;

        }
        double avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        return createScoreResult(avgScore);

    }

    /**
     * Calculate division score with multi-source evaluations
     * Combines automatic OKR score with evaluations (if needed)
     */
    public DivisionScoreResult calculateDivisionScoreWithEvaluations(
            String divisionId,
            Collection<Department> departments) {

        // 1. Calculate automatic OKR score (aggregate of departments)
        ScoreResult autoScoreResult = calculateDivisionScore(departments);
        Double autoScore = autoScoreResult.getScore();

        // 2. Get evaluations for this division (if you want division-level evaluations)
        Map<EvaluatorType, Evaluation> evals;
        try {
            UUID targetId = UUID.fromString(divisionId);
            evals = getEvaluationsForTarget("DIVISION", targetId);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid division ID format for evaluation lookup: {}", divisionId);
            evals = Map.of();
        }

        // 3. Extract evaluations (similar to department logic)
        Evaluation directorEval = evals.get(EvaluatorType.DIRECTOR);
        Double directorScore = directorEval != null ? directorEval.getNumericRating() : null;
        Integer directorStars = directorScore != null ? convertNumericToStars(directorScore) : null;

        // 4. Calculate final score (if evaluations exist)
        Double finalScore = null;
        if (autoScore != null && directorScore != null) {
            // Example: 70% auto, 30% director
            finalScore = (autoScore * 0.70) + (directorScore * 0.30);
            finalScore = Math.round(finalScore * 100.0) / 100.0;
        }

        String scoreLevel = finalScore != null ? getLevelForScore(finalScore) : autoScoreResult.getLevel();
        String color = getColorForLevel(scoreLevel);

        return DivisionScoreResult.builder()
                .automaticOkrScore(autoScore)
                .automaticOkrPercentage(autoScoreResult.getPercentage())
                .directorEvaluation(directorScore)
                .directorStars(directorStars)
                .finalCombinedScore(finalScore)
                .finalPercentage(finalScore != null ? scoreToPercentage(finalScore) : null)
                .scoreLevel(scoreLevel)
                .color(color)
                .hasDirectorEvaluation(directorScore != null)
                .build();
    }

    /**
     * Calculate weighted score for a Department
     */
    public ScoreResult calculateDepartmentScore(Collection<Objective> objectives) {
        if (objectives == null || objectives.isEmpty()) {
            return emptyScore();
        }

        double weightedSum = 0;
        double totalWeight = 0;

        // Count objectives with key results for default weight calculation
        long objectivesWithKRs = objectives.stream()
                .filter(obj -> obj.getKeyResults() != null && !obj.getKeyResults().isEmpty())
                .count();

        if (objectivesWithKRs == 0) {
            return emptyScore();
        }

        for (Objective obj : objectives) {
            // Skip objectives with no key results
            if (obj.getKeyResults() == null || obj.getKeyResults().isEmpty()) {
                continue;
            }

            double weight = (obj.getWeight() != null && obj.getWeight() > 0) ? obj.getWeight()
                    : 100.0 / objectivesWithKRs;
            ScoreResult objScore = calculateObjectiveScore(obj.getKeyResults());
            weightedSum += objScore.getScore() * weight;
            totalWeight += weight;
        }

        // Weights are percentages out of 100, so divide by max(totalWeight, 100)
        // to avoid inflating scores when objective weights don't sum to 100%
        double avgScore = totalWeight > 0 ? weightedSum / Math.max(totalWeight, 100.0) : 0;
        return createScoreResult(avgScore);
    }

    public ScoreResult createScoreResult(double score) {
        // Clamp score: min from score levels, max is always 1.0.
        // scoreValue in DB is each level's lower bound, not the ceiling of the top
        // level.
        List<ScoreLevel> levels = getScoreLevels();
        if (!levels.isEmpty()) {
            double minScore = levels.stream().mapToDouble(ScoreLevel::getScoreValue).min().orElse(0.0);
            score = Math.min(Math.max(score, minScore), 1.0);
        }

        String level = getLevelForScore(score);
        return ScoreResult.builder()
                .score(Math.round(score * 100.0) / 100.0)
                .level(level)
                .color(getColorForLevel(level))
                .percentage(scoreToPercentage(score))
                .build();
    }

    private String getLevelForScore(double score) {
        List<ScoreLevel> levels = getScoreLevels();

        if (levels.isEmpty()) {
            // Fallback to default logic (0.0-1.0 normalized scale)
            if (score >= 0.98)
                return "исключительно";
            if (score >= 0.86)
                return "превышает_ожидания";
            if (score >= 0.51)
                return "на_уровне_ожиданий";
            if (score >= 0.31)
                return "ниже_ожиданий";
            return "не_соответствует";
        }

        // Find the appropriate level based on score value
        for (int i = levels.size() - 1; i >= 0; i--) {
            if (score >= levels.get(i).getScoreValue()) {
                return levels.get(i).getName().toLowerCase().replace(" ", "_");
            }
        }

        return levels.get(0).getName().toLowerCase().replace(" ", "_");
    }

    private String getColorForLevel(String level) {
        List<ScoreLevel> levels = getScoreLevels();

        if (levels.isEmpty()) {
            return DEFAULT_LEVELS.getOrDefault(level, DEFAULT_LEVELS.get("не_соответствует")).color();
        }

        String normalizedLevel = level.replace("_", " ");
        for (ScoreLevel scoreLevel : levels) {
            if (scoreLevel.getName().equalsIgnoreCase(normalizedLevel)) {
                return scoreLevel.getColor();
            }
        }

        return levels.get(0).getColor();
    }

    private double scoreToPercentage(double score) {
        List<ScoreLevel> levels = getScoreLevels();

        // minScore from configured levels; maxScore is always 1.0 (the true ceiling)
        double minScore = 0.0;
        if (!levels.isEmpty()) {
            minScore = levels.stream().mapToDouble(ScoreLevel::getScoreValue).min().orElse(0.0);
        }

        double range = 1.0 - minScore;
        if (range == 0)
            return 0.0;

        double pct = ((score - minScore) / range) * 100.0;
        return Math.round(Math.min(pct, 100.0) * 10.0) / 10.0;
    }

    private ScoreResult emptyScore() {
        List<ScoreLevel> levels = getScoreLevels();

        double minScore;
        String level;
        if (levels.isEmpty()) {
            minScore = 0.0;
            level = "не_соответствует";
        } else {
            // Find the level with the minimum score value
            ScoreLevel minLevel = levels.stream()
                    .min(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                    .orElse(levels.get(0));
            minScore = minLevel.getScoreValue();
            level = minLevel.getName().toLowerCase().replace(" ", "_");
        }

        return ScoreResult.builder()
                .score(minScore)
                .level(level)
                .color(getColorForLevel(level))
                .percentage(0.0)
                .build();
    }

    private double parseDouble(String value) {
        try {
            return value != null ? Double.parseDouble(value) : 0.0;
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    record LevelInfo(double min, double max, String color) {
    }

    record QualitativeGrade(double score, String level) {
    }

    // ============= NEW METHODS FOR MULTI-SOURCE EVALUATION =============

    /**
     * Calculate department score with multi-source evaluations
     * Combines automatic OKR score (60%) with Director (20%) and HR (20%)
     * evaluations
     */
    public DepartmentScoreResult calculateDepartmentScoreWithEvaluations(String departmentId,
            Collection<Objective> objectives) {
        // 1. Calculate automatic OKR score (existing logic) - 60% weight
        ScoreResult autoScoreResult = calculateDepartmentScore(objectives);
        Double autoScore = autoScoreResult.getScore();

        // 2. Get evaluations for this department (handle UUID conversion safely)
        Map<EvaluatorType, Evaluation> evals;
        try {
            UUID targetId = UUID.fromString(departmentId);
            evals = getEvaluationsForTarget("DEPARTMENT", targetId);
        } catch (IllegalArgumentException e) {
            // If departmentId is not a valid UUID, return empty evaluations
            System.err.println("Warning: Invalid department ID format for evaluation lookup: " + departmentId);
            evals = Map.of();
        }

        // 3. Extract Director evaluation
        Evaluation directorEval = evals.get(EvaluatorType.DIRECTOR);
        Double directorScore = directorEval != null ? directorEval.getNumericRating() : null;
        Integer directorStars = directorScore != null ? convertNumericToStars(directorScore) : null;
        String directorComment = directorEval != null ? directorEval.getComment() : null;
        String directorName = directorEval != null ? directorEval.getEvaluator().getFullName() : null;
        String directorAvatar = directorEval != null ? directorEval.getEvaluator().getProfilePhotoUrl() : null;

        // 4. Extract HR evaluation
        Evaluation hrEval = evals.get(EvaluatorType.HR);
        String hrLetter = hrEval != null ? hrEval.getLetterRating() : null;
        Double hrScore = hrLetter != null ? convertHrLetterToNumeric(hrLetter) : null;
        String hrComment = hrEval != null ? hrEval.getComment() : null;
        String hrName = hrEval != null ? hrEval.getEvaluator().getFullName() : null;
        String hrAvatar = hrEval != null ? hrEval.getEvaluator().getProfilePhotoUrl() : null;

        // 5. Extract Business Block evaluation (stored as 1-5 stars, convert to dynamic
        // score range)
        Evaluation businessBlockEval = evals.get(EvaluatorType.BUSINESS_BLOCK);
        Integer businessBlockStars = null;
        Double businessBlockScore = null;
        String businessBlockComment = null;
        String businessBlockName = null;
        String businessBlockAvatar = null;
        if (businessBlockEval != null) {
            businessBlockName = businessBlockEval.getEvaluator().getFullName();
            businessBlockAvatar = businessBlockEval.getEvaluator().getProfilePhotoUrl();
            // Business Block stores star rating (1-5) directly in numericRating
            Double storedRating = businessBlockEval.getNumericRating();
            if (storedRating != null) {
                businessBlockStars = storedRating.intValue(); // The raw star value (1-5)
                // Convert stars to score using score level values directly
                List<ScoreLevel> levels = getScoreLevels();
                if (levels.isEmpty()) {
                    businessBlockScore = switch (businessBlockStars) {
                        case 1 -> 0.0;
                        case 2 -> 0.31;
                        case 3 -> 0.51;
                        case 4 -> 0.86;
                        case 5 -> 0.98;
                        default -> 0.0;
                    };
                } else {
                    List<ScoreLevel> sorted = levels.stream()
                            .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                            .toList();
                    int idx = Math.min(businessBlockStars - 1, sorted.size() - 1);
                    businessBlockScore = sorted.get(idx).getScoreValue();
                }
            }
            businessBlockComment = businessBlockEval.getComment();
        }

        // 6. Calculate weighted final score
        Double finalScore = null;
        if (autoScore != null && directorScore != null && hrScore != null && businessBlockScore != null) {
            // All four evaluation sources: OKR 40%, Director 20%, HR 20%, Business Block
            // 20%
            finalScore = (autoScore * 0.40) + (directorScore * 0.20) + (hrScore * 0.20) + (businessBlockScore * 0.20);
            finalScore = Math.round(finalScore * 100.0) / 100.0;
        } else if (autoScore != null && directorScore != null && hrScore != null) {
            // Three sources (no business block): OKR 60%, Director 20%, HR 20%
            finalScore = (autoScore * 0.60) + (directorScore * 0.20) + (hrScore * 0.20);
            finalScore = Math.round(finalScore * 100.0) / 100.0;
        }

        // 7. Map final score to level and color
        String scoreLevel = finalScore != null ? getLevelForScore(finalScore) : autoScoreResult.getLevel();
        String color = getColorForLevel(scoreLevel);

        return DepartmentScoreResult.builder()
                .automaticOkrScore(autoScore)
                .automaticOkrPercentage(autoScoreResult.getPercentage())
                .directorName(directorName)
                .directorAvatar(directorAvatar)
                .directorEvaluation(directorScore)
                .directorStars(directorStars)
                .directorComment(directorComment)
                .hrName(hrName)
                .hrAvatar(hrAvatar)
                .hrEvaluationLetter(hrLetter)
                .hrEvaluationNumeric(hrScore)
                .hrComment(hrComment)
                .businessBlockName(businessBlockName)
                .businessBlockAvatar(businessBlockAvatar)
                .businessBlockEvaluation(businessBlockScore)
                .businessBlockStars(businessBlockStars)
                .businessBlockComment(businessBlockComment)
                .finalCombinedScore(finalScore)
                .finalPercentage(finalScore != null ? scoreToPercentage(finalScore) : null)
                .scoreLevel(scoreLevel)
                .color(color)
                .hasDirectorEvaluation(directorScore != null)
                .hasHrEvaluation(hrScore != null)
                .hasBusinessBlockEvaluation(businessBlockScore != null)
                .directorSubmittedAt(directorEval != null ? directorEval.getSubmittedAt() : null)
                .directorUpdatedAt(directorEval != null ? directorEval.getUpdatedAt() : null)
                .hrSubmittedAt(hrEval != null ? hrEval.getSubmittedAt() : null)
                .hrUpdatedAt(hrEval != null ? hrEval.getUpdatedAt() : null)
                .businessBlockSubmittedAt(businessBlockEval != null ? businessBlockEval.getSubmittedAt() : null)
                .businessBlockUpdatedAt(businessBlockEval != null ? businessBlockEval.getUpdatedAt() : null)
                .build();
    }

    /**
     * Get submitted evaluations for a target, grouped by evaluator type
     */
    private Map<EvaluatorType, Evaluation> getEvaluationsForTarget(String targetType, UUID targetId) {
        log.info("Fetching evaluations for targetType={}, targetId={}", targetType, targetId);
        List<Evaluation> evals = evaluationRepository.findByTargetTypeAndTargetIdAndStatus(
                targetType, targetId, EvaluationStatus.SUBMITTED);
        log.info("Found {} submitted evaluations for targetId={}", evals.size(), targetId);
        for (Evaluation e : evals) {
            log.info("  - Evaluation: id={}, evaluatorType={}, targetId={}, status={}",
                    e.getId(), e.getEvaluatorType(), e.getTargetId(), e.getStatus());
        }
        return evals.stream()
                .collect(Collectors.toMap(
                        Evaluation::getEvaluatorType,
                        Function.identity(),
                        (e1, e2) -> e1.getCreatedAt().isAfter(e2.getCreatedAt()) ? e1 : e2));
    }

    /**
     * Convert HR letter grade to numeric score using dynamic score levels
     * A = highest (exceptional), B = very_good, C = good, D = meets/lowest
     */
    private Double convertHrLetterToNumeric(String letter) {
        List<ScoreLevel> scoreLevels = getScoreLevels();

        if (scoreLevels.isEmpty()) {
            // Fallback to 0.0-1.0 normalized scale
            return switch (letter) {
                case "A" -> 0.98;
                case "B" -> 0.86;
                case "C" -> 0.51;
                case "D" -> 0.31;
                default -> null;
            };
        }

        // Sort levels by scoreValue
        List<ScoreLevel> sortedLevels = scoreLevels.stream()
                .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                .toList();

        int numLevels = sortedLevels.size();
        return switch (letter) {
            case "A" -> sortedLevels.get(numLevels - 1).getScoreValue(); // Highest
            case "B" -> sortedLevels.get(Math.max(numLevels - 2, 0)).getScoreValue();
            case "C" -> sortedLevels.get(numLevels / 2).getScoreValue(); // Middle
            case "D" -> sortedLevels.get(Math.min(1, numLevels - 1)).getScoreValue();
            default -> null;
        };
    }

    /**
     * Convert Director numeric score back to star rating (1-5) for UI display.
     * Finds the closest score level value to determine the star rating.
     */
    private Integer convertNumericToStars(Double numericScore) {
        if (numericScore == null)
            return null;

        List<ScoreLevel> levels = getScoreLevels();
        if (levels.isEmpty()) {
            double[] defaults = { 0.0, 0.31, 0.51, 0.86, 0.98 };
            int best = 0;
            for (int i = 1; i < defaults.length; i++) {
                if (Math.abs(numericScore - defaults[i]) < Math.abs(numericScore - defaults[best])) {
                    best = i;
                }
            }
            return best + 1;
        }

        List<ScoreLevel> sorted = levels.stream()
                .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                .toList();
        int best = 0;
        for (int i = 1; i < sorted.size(); i++) {
            if (Math.abs(numericScore - sorted.get(i).getScoreValue()) < Math
                    .abs(numericScore - sorted.get(best).getScoreValue())) {
                best = i;
            }
        }
        return best + 1;
    }
}
