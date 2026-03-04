package uz.garantbank.okrTrackingSystem.entity;


/**
 * Level at which an objective is defined.
 * Determines whether the objective belongs to a department or an individual employee.
 */
public enum ObjectiveLevel {
    /**
     * Department-level objective
     * - Belongs to a department
     * - Contributes to department score
     */
    DEPARTMENT,

    /**
     * Individual employee objective
     * - Assigned to a specific employee by Director
     * - Contributes to employee's personal score
     */
    INDIVIDUAL
}
