package uz.garantbank.okrTrackingSystem.entity;


/**
 * Status of an evaluation in the workflow.
 * Controls whether the evaluation can be edited and if it's included in score calculations.
 */
public enum EvaluationStatus {
    /**
     * Draft - can be edited, not included in calculations
     */
    DRAFT,

    /**
     * Submitted - locked for editing, included in score calculations
     */
    SUBMITTED,

    /**
     * Approved - final approval by system admin (optional workflow step)
     */
    APPROVED
}
