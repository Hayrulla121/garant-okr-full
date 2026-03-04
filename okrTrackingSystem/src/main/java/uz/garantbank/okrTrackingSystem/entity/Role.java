package uz.garantbank.okrTrackingSystem.entity;


/**
 * User roles in the OKR tracking system.
 * Defines the organizational hierarchy and access levels.
 */
public enum Role {
    /**
     * Regular employee - can view own OKRs
     */
    EMPLOYEE,

    /**
     * Department leader - manages department OKRs
     */
    DEPARTMENT_LEADER,

    /**
     * HR department staff - evaluates employees and departments with letter grades (A-D)
     */
    HR,

    /**
     * Top leadership/CEO - evaluates with star ratings (1-5 stars → 4.25-5.0 backend)
     */
    DIRECTOR,

    /**
     * Business block leaders - evaluates departments with 1-5 rating
     */
    BUSINESS_BLOCK,

    /**
     * System administrator - full access to manage users and system
     */
    ADMIN
}
