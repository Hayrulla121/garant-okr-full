package uz.garantbank.okrTrackingSystem.entity;


/**
 * Level at which an objective is defined.
 * Determines whether the objective belongs to a department or an individual employee.
 */
public enum ObjectiveLevel {
    /**
     * Division-level objective
     * - Belongs to a division
     * - Contributes to division score
     */
    DIVISION,

    /**
     * Department-level objective
     * - Belongs to a department
     * - Contributes to department score
     */
    DEPARTMENT,

    /**
     * Group-level objective
     * - Belongs to a group within a department
     * - Contributes to group score
     */
    GROUP,

    /**
     * Individual employee objective
     * - Assigned to a specific employee by Director
     * - Contributes to employee's personal score
     */
    INDIVIDUAL
}
