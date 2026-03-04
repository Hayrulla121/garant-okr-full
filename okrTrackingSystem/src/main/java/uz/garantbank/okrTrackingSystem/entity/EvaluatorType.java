package uz.garantbank.okrTrackingSystem.entity;


/**
 * Types of evaluators in the multi-source evaluation system.
 * Each type has different rating scales and weights in the final score calculation.
 */
public enum EvaluatorType {
    /**
     * Director evaluation
     * - UI: 1-5 stars
     * - Backend: 4.25-5.0 numeric range
     * - Weight: 20% of final score
     */
    DIRECTOR,

    /**
     * HR evaluation
     * - Scale: A, B, C, D letter grades
     * - Converted to numeric: A=5.0, B=4.75, C=4.5, D=4.25
     * - Weight: 20% of final score
     */
    HR,

    /**
     * Business Block evaluation
     * - Scale: 1-5 numeric rating
     * - Display: Separate speedometer (not included in weighted final score)
     * - Purpose: Additional management perspective
     */
    BUSINESS_BLOCK
}
