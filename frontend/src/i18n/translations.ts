export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  // App Header
  appTitle: string;
  organizationOverview: string;
  departmentDetails: string;

  // Sidebar
  controlPanel: string;
  departments: string;
  noDepartments: string;
  settings: string;
  export: string;
  import: string;
  demo: string;
  myProfile: string;
  userManagement: string;
  teamOverview: string;
  organization: string;
  performanceAlerts: string;
  logout: string;
  readOnlyMode: string;
  editEnabled: string;

  // Stats
  departmentsLabel: string;
  objectivesLabel: string;
  keyResultsLabel: string;
  avgScore: string;

  // Organization
  organizationScore: string;
  organizationScoreBreakdown: string;
  orgAverage: string;
  allDepartments: string;
  divisionObjectives: string;
  departmentObjectives: string;
  groupObjectives: string;
  leaderObjectives: string;
  noObjectivesFound: string;
  objectives: string;

  // Department View
  departmentScore: string;
  scoreSummary: string;
  backToDashboard: string;
  listView: string;
  gridView: string;
  noObjectivesYet: string;
  addObjectivesFromSettings: string;
  leaderPersonalGoals: string;
  leaderScore: string;
  departmentGoals: string;
  evaluated: string;

  // Objective Card
  weight: string;
  keyResult: string;
  keyResults: string;
  avg: string;
  scoreAssessment: string;
  refreshScores: string;
  scoreLevel: string;
  averageScore: string;
  resultsBreakdown: string;
  actual: string;
  score: string;
  krWeightsWarning: string;

  // Score Levels
  below: string;
  meets: string;
  good: string;
  veryGood: string;
  exceptional: string;

  // Metric Types
  higherIsBetter: string;
  lowerIsBetter: string;
  qualitative: string;

  // Settings Modal
  manageDepartmentsObjectivesKRs: string;
  createNewDepartment: string;
  departmentName: string;
  create: string;
  existingDepartments: string;
  delete: string;
  objective: string;
  createNewObjective: string;
  selectDepartment: string;
  objectiveName: string;
  weightPercent: string;
  existingObjectives: string;
  noObjectivesYetText: string;
  createNewKeyResult: string;
  selectObjective: string;
  keyResultName: string;
  descriptionOptional: string;
  unitExample: string;
  thresholdValues: string;
  levels: string;
  enterActualMetricValues: string;
  createKeyResult: string;
  existingKeyResults: string;
  noKeyResultsYet: string;
  exceedsLimitExisting: string;
  existingKrsAvailable: string;
  exceedsLimitOther: string;
  otherKrsAvailable: string;
  weightExceeded: string;
  weightsBalanced: string;
  totalWeightRemaining: string;
  manageOkrStructure: string;
  hideThresholds: string;
  setThresholds: string;
  editThresholds: string;
  creatingKr: string;
  addKeyResult: string;
  failedToUpdateKr: string;
  savingChanges: string;
  noObjectivesYetClick: string;
  noDepartmentsYetClick: string;
  onlyAdminsCanEditScoreLevels: string;
  deleteDivision: string;
  deleteDepartment: string;
  deleteObjective: string;
  editKeyResult: string;
  deleteKeyResult: string;
  addGroup: string;
  deleteGroup: string;
  manageMembers: string;
  noEmployeesInDepartment: string;
  membersUpdated: string;

  // Score Levels Manager
  scoreLevelConfiguration: string;
  configureGlobalScoreLevels: string;
  levelName: string;
  scoreValue: string;
  colorClickToPick: string;
  preview: string;
  chooseAColor: string;
  customColor: string;
  close: string;
  addLevel: string;
  addDept: string;
  addObjectiveBtn: string;
  addKrBtn: string;
  addBtn: string;
  saveChanges: string;
  saving: string;
  resetToDefaults: string;
  unsavedChanges: string;
  failedToLoadScoreLevels: string;
  mustHaveAtLeast2Levels: string;
  scoreLevelsUpdated: string;
  failedToUpdateScoreLevels: string;
  resetConfirmation: string;
  scoreLevelsReset: string;
  failedToResetScoreLevels: string;
  newLevel: string;
  removeLevel: string;

  // Department Modal
  performanceDetails: string;

  // Organization Structure
  expandAll: string;
  collapseAll: string;
  createDivision: string;
  orgStructureTitle: string;
  orgStructureDesc: string;
  hierarchicalView: string;
  nodePath: string;
  noDivisionsYet: string;
  createFirstDivision: string;
  divisionsCount: string;
  departmentsCount: string;
  groupsCount: string;
  employeesCount: string;
  leaderLabel: string;
  deptsShort: string;
  empShort: string;
  unassignedDepts: string;
  needsDivision: string;
  headquarters: string;
  loadingOrgStructure: string;

  // Speedometer
  rating: string;

  // Confirmations and Alerts
  confirmDeleteDepartment: string;
  confirmDeleteObjective: string;
  confirmDeleteKeyResult: string;
  confirmLoadDemoData: string;
  demoDataLoaded: string;
  failedToLoadDemoData: string;
  failedToCreateDepartment: string;
  failedToDeleteDepartment: string;
  failedToCreateObjective: string;
  failedToDeleteObjective: string;
  failedToCreateKeyResult: string;
  failedToDeleteKeyResult: string;
  failedToLoadDepartments: string;
  closeMonth: string;
  closeMonthConfirm: string;
  closing: string;
  failedToExportExcel: string;
  importSuccess: string;
  importFailed: string;
  importInProgress: string;
  onlyXlsxSupported: string;

  // Loading
  loadingOKRTracker: string;

  // Language
  language: string;
  english: string;
  russian: string;
  uzbek: string;

  // Evaluations
  directorEvaluation: string;
  leaderEvaluation: string;
  hrEvaluation: string;
  businessBlockEvaluation: string;
  automaticOkrScore: string;
  finalCombinedScore: string;
  notEvaluated: string;
  awaitingDirectorRating: string;
  awaitingHrRating: string;
  awaitingBusinessRating: string;
  separateDisplay: string;
  notIncludedInWeightedScore: string;
  weightedFormula: string;
  weightedFormulaWithBusiness: string;
  finalScoreNotAvailable: string;
  requiresAllEvaluations: string;
  basedOnKeyResultThresholds: string;
  performanceGrade: string;
  starRating: string;
  ratingGuide: string;
  commentOptional: string;
  addYourComments: string;
  submitEvaluation: string;
  updateEvaluation: string;
  newEvaluation: string;
  correctEvaluation: string;
  newEvaluationTooltip: string;
  correctEvaluationTooltip: string;
  evaluationSavedSuccessfully: string;
  failedToSaveEvaluation: string;
  pleaseSelectRating: string;
  loadingEvaluations: string;
  noPermissionToEvaluate: string;
  onlyEvaluatorsCanProvide: string;
  yourEvaluations: string;
  provideYourEvaluation: string;

  // HR Grade Labels (A=Best, D=Lowest)
  gradeA: string;
  gradeALabel: string;
  gradeADescription: string;
  gradeB: string;
  gradeBLabel: string;
  gradeBDescription: string;
  gradeC: string;
  gradeCLabel: string;
  gradeCDescription: string;
  gradeD: string;
  gradeDLabel: string;
  gradeDDescription: string;

  // Director Star Labels
  star1Label: string;
  star2Label: string;
  star3Label: string;
  star4Label: string;
  star5Label: string;

  // Progress
  progress: string;

  // Evaluation Timestamps
  submitted: string;
  lastUpdated: string;

  // Watermark
  watermark: string;
  watermarkSettings: string;
  enableWatermark: string;
  watermarkType: string;
  watermarkTypeText: string;
  watermarkTypeImage: string;
  watermarkText: string;
  watermarkOpacity: string;
  watermarkImageUpload: string;
  watermarkCurrentImage: string;
  watermarkSaved: string;
  watermarkFailed: string;
  watermarkImageFailed: string;

  // Disciplinary
  goodStanding: string;
  underWatch: string;
  warningStatus: string;
  finedStatus: string;
  terminationRisk: string;
  atRiskOfTermination: string;
  financialPenaltyApplied: string;
  formalWarningIssued: string;
  performanceBeingMonitored: string;
  viewFullPerformanceDetails: string;
  belowExpectationsCount: string;
  belowExpectationsEvaluation: string;
  belowExpectationsEvaluations: string;
  disciplinaryDescWatch: string;
  disciplinaryDescWarning: string;
  disciplinaryDescFine: string;
  disciplinaryDescTermination: string;

  // User Profile
  loadingProfile: string;
  userNotFound: string;
  back: string;
  jobTitle: string;
  inactive: string;
  cancel: string;
  save: string;
  editProfile: string;
  contactInformation: string;
  email: string;
  phone: string;
  username: string;
  about: string;
  memberSince: string;
  lastLogin: string;
  assignedDepartments: string;
  noDepartmentsAssigned: string;
  performanceEvaluationHistory: string;
  totalEvaluations: string;
  belowExpectations: string;
  satisfactory: string;
  belowExpectationsRate: string;
  eachDotOneEvaluation: string;
  recentEvaluations: string;
  belowExpectationsLabel: string;
  satisfactoryLabel: string;
  noEvaluationsYet: string;
  noComment: string;

  // Performance Alerts Page
  loadingPerformanceAlerts: string;
  failedToLoadPerformanceAlerts: string;
  performanceAlertsTitle: string;
  employeesWithBelowExpectations: string;
  filterByStatus: string;
  allAtRisk: string;
  showing: string;
  of: string;
  noPerformanceAlerts: string;
  allEmployeesGoodStanding: string;
  employee: string;
  totalEvals: string;
  disciplinaryStatus: string;
  latestEvaluationsCol: string;
  action: string;
  viewProfile: string;
  showingEmployeesWithConcerns: string;

  // Team Overview
  loadingTeamOverview: string;
  failedToLoadTeamData: string;
  teamOverviewTitle: string;
  viewAllTeamMembers: string;
  employeesNeedAttention: string;
  terminationRiskCount: string;
  finedCount: string;
  warnedCount: string;
  showAtRiskOnly: string;
  showAll: string;
  search: string;
  searchPlaceholder: string;
  role: string;
  allRoles: string;
  department: string;
  allDepartments2: string;
  activeUsersOnly: string;
  performanceFilter: string;
  all: string;
  atRisk: string;
  totalMembers: string;
  active: string;
  noUsersFound: string;
  tryAdjustingFilters: string;
  showingXOfYTeamMembers: string;

  // User Management
  confirmDeleteUser: string;
  loadingUsers: string;
  userManagementTitle: string;
  manageUsersRolesDepartments: string;
  createUser: string;
  totalUsers: string;
  criticalFineTermination: string;
  none: string;
  more: string;
  status: string;
  performance: string;
  lastLoginCol: string;
  actions: string;
  editUser: string;
  assignDepartmentsAction: string;
  assignGroups: string;
  noGroupsAvailable: string;
  deleteUser: string;
  noUsersMatchingFilters: string;
  showingXOfYUsers: string;
  user: string;

  // Attachment
  attachmentRequired: string;
  attachFileFirst: string;
  noEditPermission: string;
  attachFile: string;
  file: string;
  fileRequired: string;
  download: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // App Header
    appTitle: 'OKR Performance Tracker',
    organizationOverview: 'Organization Overview',
    departmentDetails: 'Details',

    // Sidebar
    controlPanel: 'Control Panel',
    departments: 'Departments',
    noDepartments: 'No departments',
    settings: 'Settings',
    export: 'Export',
    import: 'Import',
    demo: 'Demo',
    myProfile: 'My Profile',
    userManagement: 'User Management',
    teamOverview: 'Team Overview',
    organization: 'Organization',
    performanceAlerts: 'Performance Alerts',
    logout: 'Logout',
    readOnlyMode: 'Read-Only Mode',
    editEnabled: 'Edit Enabled',

    // Stats
    departmentsLabel: 'Departments',
    objectivesLabel: 'Objectives',
    keyResultsLabel: 'Key Results',
    avgScore: 'Avg Score',

    // Organization
    organizationScore: 'Organization Score',
    organizationScoreBreakdown: 'Organization Score Breakdown',
    orgAverage: 'Org Average',
    allDepartments: 'All Departments',
    divisionObjectives: 'Division Objectives',
    departmentObjectives: 'Department Objectives',
    groupObjectives: 'Group Objectives',
    leaderObjectives: 'Leader Objectives',
    noObjectivesFound: 'No objectives found',
    objectives: 'objectives',

    // Department View
    departmentScore: 'Department Score',
    scoreSummary: 'Score Summary',
    backToDashboard: 'Back to Dashboard',
    listView: 'List View',
    gridView: 'Grid View',
    noObjectivesYet: 'No Objectives Yet',
    addObjectivesFromSettings: 'Add objectives to this department from settings!',
    leaderPersonalGoals: 'Leader Personal Goals',
    leaderScore: 'Leader Score',
    departmentGoals: 'Department Goals',
    evaluated: 'Evaluated',

    // Objective Card
    weight: 'Weight',
    keyResult: 'Key Result',
    keyResults: 'Key Results',
    avg: 'Avg',
    scoreAssessment: 'Score Assessment',
    refreshScores: 'Refresh Scores',
    scoreLevel: 'Score Level',
    averageScore: 'Average Score',
    resultsBreakdown: 'Results Breakdown',
    actual: 'Actual',
    score: 'Score',
    krWeightsWarning: 'KR weights',

    // Score Levels
    below: 'Does not meet',
    meets: 'Below expectations',
    good: 'Meets expectations',
    veryGood: 'Exceeds expectations',
    exceptional: 'Exceptional',

    // Metric Types
    higherIsBetter: 'Higher is Better',
    lowerIsBetter: 'Lower is Better',
    qualitative: 'Qualitative',

    // Settings Modal
    manageDepartmentsObjectivesKRs: 'Manage departments, objectives, and key results',
    createNewDepartment: 'Create New Department',
    departmentName: 'Department name',
    create: 'Create',
    existingDepartments: 'Existing Departments',
    delete: 'Delete',
    objective: 'objective',
    createNewObjective: 'Create New Objective',
    selectDepartment: 'Select department',
    objectiveName: 'Objective name',
    weightPercent: 'Weight (%)',
    existingObjectives: 'Existing Objectives',
    noObjectivesYetText: 'No objectives yet',
    createNewKeyResult: 'Create New Key Result',
    selectObjective: 'Select objective',
    keyResultName: 'Key result name',
    descriptionOptional: 'Description (optional)',
    unitExample: 'Unit (e.g., %, $, users)',
    thresholdValues: 'Threshold Values',
    levels: 'levels',
    enterActualMetricValues: 'Enter the actual metric values that correspond to each score level',
    createKeyResult: 'Create Key Result',
    existingKeyResults: 'Existing Key Results',
    noKeyResultsYet: 'No key results yet',
    exceedsLimitExisting: 'Exceeds limit! Existing KRs use',
    existingKrsAvailable: 'Existing KRs:',
    exceedsLimitOther: 'Exceeds limit! Other KRs use',
    otherKrsAvailable: 'Other KRs:',
    weightExceeded: 'Weight exceeded!',
    weightsBalanced: 'Weights balanced',
    totalWeightRemaining: 'Total weight:',
    manageOkrStructure: 'Manage your OKR structure and configuration',
    hideThresholds: 'Hide',
    setThresholds: 'Set',
    editThresholds: 'Edit',
    creatingKr: 'Creating...',
    addKeyResult: '+ Add Key Result',
    failedToUpdateKr: 'Failed to update key result',
    savingChanges: 'Saving...',
    noObjectivesYetClick: 'No objectives yet — click "+ Add Objective" above',
    noDepartmentsYetClick: 'No departments yet — click "+ Add Dept" above',
    onlyAdminsCanEditScoreLevels: 'Only administrators can edit score levels.',
    deleteDivision: 'Delete division',
    deleteDepartment: 'Delete department',
    deleteObjective: 'Delete objective',
    editKeyResult: 'Edit key result',
    deleteKeyResult: 'Delete key result',
    addGroup: 'Add Group',
    deleteGroup: 'Delete group',
    manageMembers: 'Manage Members',
    noEmployeesInDepartment: 'No employees in this department',
    membersUpdated: 'Group members updated',

    // Score Levels Manager
    scoreLevelConfiguration: 'Score Level Configuration',
    configureGlobalScoreLevels: 'Configure the global score levels. Changes are sorted by score value when saved.',
    levelName: 'Level Name',
    scoreValue: 'Score Value',
    colorClickToPick: 'Color (click to pick)',
    preview: 'Preview',
    chooseAColor: 'Choose a color:',
    customColor: 'Custom color:',
    close: 'Close',
    addLevel: 'Add Level',
    addDept: 'Add Dept',
    addObjectiveBtn: 'Add Objective',
    addKrBtn: 'Add KR',
    addBtn: '+ Add',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    resetToDefaults: 'Reset to Defaults',
    unsavedChanges: '* You have unsaved changes',
    failedToLoadScoreLevels: 'Failed to load score levels',
    mustHaveAtLeast2Levels: 'You must have at least 2 score levels',
    scoreLevelsUpdated: 'Score levels updated successfully!',
    failedToUpdateScoreLevels: 'Failed to update score levels',
    resetConfirmation: 'Reset to default score levels? This will discard all customizations.',
    scoreLevelsReset: 'Score levels reset to defaults',
    failedToResetScoreLevels: 'Failed to reset score levels',
    newLevel: 'New Level',
    removeLevel: 'Remove level',

    // Department Modal
    performanceDetails: 'Performance Details',

    // Organization Structure
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    createDivision: 'Create Division',
    orgStructureTitle: 'Organization Structure',
    orgStructureDesc: 'Manage divisions, departments, and employee assignments',
    hierarchicalView: 'Hierarchical org structure view',
    nodePath: 'Division → Department → Employee',
    noDivisionsYet: 'No divisions yet',
    createFirstDivision: 'Create your first division to start building the organization structure',
    divisionsCount: 'Divisions',
    departmentsCount: 'Departments',
    groupsCount: 'Groups',
    employeesCount: 'Employees',
    leaderLabel: 'Leader:',
    deptsShort: 'Depts',
    empShort: 'Emp',
    unassignedDepts: 'Unassigned Departments',
    needsDivision: 'Needs Division',
    headquarters: 'Headquarters',
    loadingOrgStructure: 'Loading organization structure...',

    // Speedometer
    rating: 'Rating',

    // Confirmations and Alerts
    confirmDeleteDepartment: 'Are you sure you want to delete this department?',
    confirmDeleteObjective: 'Are you sure you want to delete this objective?',
    confirmDeleteKeyResult: 'Are you sure you want to delete this key result?',
    confirmLoadDemoData: 'This will replace all existing data with demo data. Continue?',
    demoDataLoaded: 'Demo data loaded successfully!',
    failedToLoadDemoData: 'Failed to load demo data',
    failedToCreateDepartment: 'Failed to create department',
    failedToDeleteDepartment: 'Failed to delete department',
    failedToCreateObjective: 'Failed to create objective',
    failedToDeleteObjective: 'Failed to delete objective',
    failedToCreateKeyResult: 'Failed to create key result',
    failedToDeleteKeyResult: 'Failed to delete key result',
    failedToLoadDepartments: 'Failed to load departments',
    closeMonth: 'Close the Month',
    closeMonthConfirm: 'Close the current month and save scores? This action will snapshot all department scores.',
    closing: 'Closing...',
    failedToExportExcel: 'Failed to export Excel',
    importSuccess: 'Import completed successfully!',
    importFailed: 'Import failed',
    importInProgress: 'Importing...',
    onlyXlsxSupported: 'Only .xlsx files are supported',

    // Loading
    loadingOKRTracker: 'Loading OKR Tracker...',

    // Language
    language: 'Language',
    english: 'English',
    russian: 'Russian',
    uzbek: 'Uzbek',

    // Evaluations
    directorEvaluation: 'Director Evaluation',
    leaderEvaluation: 'Leader Evaluation',
    hrEvaluation: 'HR Evaluation',
    businessBlockEvaluation: 'Business Block',
    automaticOkrScore: 'Automatic OKR Score',
    finalCombinedScore: 'Final Combined Score',
    notEvaluated: 'Not Evaluated',
    awaitingDirectorRating: 'Awaiting director rating',
    awaitingHrRating: 'Awaiting HR rating',
    awaitingBusinessRating: 'Awaiting business rating',
    separateDisplay: 'Separate Display',
    notIncludedInWeightedScore: 'Not included in weighted score',
    weightedFormula: 'Weighted Formula: (OKR × 60%) + (Director × 20%) + (HR × 20%)',
    weightedFormulaWithBusiness: 'Weighted Formula: (OKR × 40%) + (Director × 20%) + (HR × 20%) + (Business × 20%)',
    finalScoreNotAvailable: 'Final Score Not Available',
    requiresAllEvaluations: 'Requires OKR + Director + HR evaluations (or all 4 with Business Block)',
    basedOnKeyResultThresholds: 'Based on key result thresholds',
    performanceGrade: 'Performance Grade (A-D)',
    starRating: 'Rating (1-5 stars)',
    ratingGuide: 'Rating Guide:',
    commentOptional: 'Comment (optional)',
    addYourComments: 'Add your evaluation comments...',
    submitEvaluation: 'Submit Evaluation',
    updateEvaluation: 'Update Evaluation',
    newEvaluation: 'New Evaluation',
    correctEvaluation: 'Correct Evaluation',
    newEvaluationTooltip: 'Submit a new evaluation (counts toward performance tracking)',
    correctEvaluationTooltip: 'Fix your previous evaluation (does not count as a new evaluation)',
    evaluationSavedSuccessfully: 'Evaluation saved successfully!',
    failedToSaveEvaluation: 'Failed to save evaluation',
    pleaseSelectRating: 'Please select a rating',
    loadingEvaluations: 'Loading evaluations...',
    noPermissionToEvaluate: 'You do not have permission to evaluate this',
    onlyEvaluatorsCanProvide: 'Only Directors, HR, and Business Block leaders can provide evaluations.',
    yourEvaluations: 'Your Evaluations',
    provideYourEvaluation: 'Provide Your Evaluation',

    // HR Grade Labels (A=Best, D=Lowest)
    gradeA: 'A',
    gradeALabel: 'Outstanding',
    gradeADescription: 'Outstanding performance',
    gradeB: 'B',
    gradeBLabel: 'Exceeds',
    gradeBDescription: 'Exceeds expectations',
    gradeC: 'C',
    gradeCLabel: 'Meets',
    gradeCDescription: 'Meets expectations',
    gradeD: 'D',
    gradeDLabel: 'Needs Improvement',
    gradeDDescription: 'Needs improvement',

    // Director Star Labels
    star1Label: 'Needs Improvement',
    star2Label: 'Below Expectations',
    star3Label: 'Meets Expectations',
    star4Label: 'Exceeds Expectations',
    star5Label: 'Outstanding',

    // Progress
    progress: 'Progress',

    // Evaluation Timestamps
    submitted: 'Submitted',
    lastUpdated: 'Last Updated',

    // Watermark
    watermark: 'Watermark',
    watermarkSettings: 'Watermark Settings',
    enableWatermark: 'Enable Watermark',
    watermarkType: 'Type',
    watermarkTypeText: 'Text',
    watermarkTypeImage: 'Image',
    watermarkText: 'Watermark Text',
    watermarkOpacity: 'Opacity',
    watermarkImageUpload: 'Upload Image',
    watermarkCurrentImage: 'Current image',
    watermarkSaved: 'Watermark settings saved!',
    watermarkFailed: 'Failed to save watermark settings',
    watermarkImageFailed: 'Failed to upload watermark image',

    // Disciplinary
    goodStanding: 'Good Standing',
    underWatch: 'Under Watch',
    warningStatus: 'Warning',
    finedStatus: 'Fined',
    terminationRisk: 'Termination Risk',
    atRiskOfTermination: 'At Risk of Termination',
    financialPenaltyApplied: 'Financial Penalty Applied',
    formalWarningIssued: 'Formal Warning Issued',
    performanceBeingMonitored: 'Performance Being Monitored',
    viewFullPerformanceDetails: 'View full performance details',
    belowExpectationsCount: 'below-expectations',
    belowExpectationsEvaluation: 'below-expectations evaluation',
    belowExpectationsEvaluations: 'below-expectations evaluations',
    disciplinaryDescWatch: 'performance is being monitored.',
    disciplinaryDescWarning: 'formal warning issued.',
    disciplinaryDescFine: 'subject to financial penalty.',
    disciplinaryDescTermination: 'at risk of termination.',

    // User Profile
    loadingProfile: 'Loading profile...',
    userNotFound: 'User not found',
    back: 'Back',
    jobTitle: 'Job title',
    inactive: 'Inactive',
    cancel: 'Cancel',
    save: 'Save',
    editProfile: 'Edit Profile',
    contactInformation: 'Contact Information',
    email: 'Email',
    phone: 'Phone',
    username: 'Username',
    about: 'About',
    memberSince: 'Member since',
    lastLogin: 'Last login',
    assignedDepartments: 'Assigned Departments',
    noDepartmentsAssigned: 'No departments assigned',
    performanceEvaluationHistory: 'Performance Evaluation History',
    totalEvaluations: 'Total Evaluations',
    belowExpectations: 'Below Expectations',
    satisfactory: 'Satisfactory',
    belowExpectationsRate: 'Below expectations rate',
    eachDotOneEvaluation: 'Each dot = 1 evaluation',
    recentEvaluations: 'Recent Evaluations',
    belowExpectationsLabel: 'Below expectations',
    satisfactoryLabel: 'Satisfactory',
    noEvaluationsYet: 'No evaluations received yet',
    noComment: 'No comment',

    // Performance Alerts Page
    loadingPerformanceAlerts: 'Loading performance alerts...',
    failedToLoadPerformanceAlerts: 'Failed to load performance alerts',
    performanceAlertsTitle: 'Performance Alerts',
    employeesWithBelowExpectations: 'Employees with below-expectations evaluations',
    filterByStatus: 'Filter by status:',
    allAtRisk: 'All At-Risk',
    showing: 'Showing',
    of: 'of',
    noPerformanceAlerts: 'No performance alerts',
    allEmployeesGoodStanding: 'All employees are in good standing',
    employee: 'Employee',
    totalEvals: 'Total Evals',
    disciplinaryStatus: 'Disciplinary Status',
    latestEvaluationsCol: 'Latest Evaluations',
    action: 'Action',
    viewProfile: 'View Profile',
    showingEmployeesWithConcerns: 'employee(s) with performance concerns',

    // Team Overview
    loadingTeamOverview: 'Loading team overview...',
    failedToLoadTeamData: 'Failed to load team data',
    teamOverviewTitle: 'Team Overview',
    viewAllTeamMembers: 'View all team members and their performance scores',
    employeesNeedAttention: 'employee(s) need attention',
    terminationRiskCount: 'termination risk',
    finedCount: 'fined',
    warnedCount: 'warned',
    showAtRiskOnly: 'Show at-risk only',
    showAll: 'Show all',
    search: 'Search',
    searchPlaceholder: 'Name, username, or email...',
    role: 'Role',
    allRoles: 'All Roles',
    department: 'Department',
    allDepartments2: 'All Departments',
    activeUsersOnly: 'Active users only',
    performanceFilter: 'Performance filter:',
    all: 'All',
    atRisk: 'At Risk',
    totalMembers: 'Total Members',
    active: 'Active',
    noUsersFound: 'No users found',
    tryAdjustingFilters: 'Try adjusting your filters',
    showingXOfYTeamMembers: 'team members',

    // User Management
    confirmDeleteUser: 'Are you sure you want to delete this user? This action cannot be undone.',
    loadingUsers: 'Loading users...',
    userManagementTitle: 'User Management',
    manageUsersRolesDepartments: 'Manage users, roles, and department assignments',
    createUser: 'Create User',
    totalUsers: 'Total Users',
    criticalFineTermination: 'Critical (Fine/Termination)',
    none: 'None',
    more: 'more',
    status: 'Status',
    performance: 'Performance',
    lastLoginCol: 'Last Login',
    actions: 'Actions',
    editUser: 'Edit User',
    assignDepartmentsAction: 'Assign Departments',
    assignGroups: 'Assign Groups',
    noGroupsAvailable: 'No groups available',
    deleteUser: 'Delete User',
    noUsersMatchingFilters: 'No users found matching your filters.',
    showingXOfYUsers: 'users',
    user: 'User',

    // Attachment
    attachmentRequired: 'Attachment is required',
    attachFileFirst: 'Please attach a file first',
    noEditPermission: 'You do not have permission to edit this department',
    attachFile: 'Attach file',
    file: 'File',
    fileRequired: 'File *',
    download: 'Download',
  },

  ru: {
    // App Header
    appTitle: 'OKR Трекер эффективности',
    organizationOverview: 'Обзор организации',
    departmentDetails: 'Детали',

    // Sidebar
    controlPanel: 'Панель управления',
    departments: 'Отделы',
    noDepartments: 'Нет отделов',
    settings: 'Настройки',
    export: 'Экспорт',
    import: 'Импорт',
    demo: 'Демо',
    myProfile: 'Мой профиль',
    userManagement: 'Управление пользователями',
    teamOverview: 'Обзор команды',
    organization: 'Организация',
    performanceAlerts: 'Оповещения',
    logout: 'Выход',
    readOnlyMode: 'Только чтение',
    editEnabled: 'Редактирование',

    // Stats
    departmentsLabel: 'Отделы',
    objectivesLabel: 'Цели',
    keyResultsLabel: 'Ключевые результаты',
    avgScore: 'Средняя оценка',

    // Organization
    organizationScore: 'Оценка организации',
    organizationScoreBreakdown: 'Детализация оценки организации',
    orgAverage: 'Среднее по орг.',
    allDepartments: 'Все отделы',
    divisionObjectives: 'Цели дивизионов',
    departmentObjectives: 'Цели отделов',
    groupObjectives: 'Цели групп',
    leaderObjectives: 'Цели руководителей',
    noObjectivesFound: 'Цели не найдены',
    objectives: 'целей',

    // Department View
    departmentScore: 'Оценка отдела',
    scoreSummary: 'Сводка оценок',
    backToDashboard: 'Назад к панели',
    listView: 'Список',
    gridView: 'Сетка',
    noObjectivesYet: 'Пока нет целей',
    addObjectivesFromSettings: 'Добавьте цели для этого отдела в настройках!',
    leaderPersonalGoals: 'Личные цели руководителя',
    leaderScore: 'Оценка руководителя',
    departmentGoals: 'Цели Департамента',
    evaluated: 'Оценено',

    // Objective Card
    weight: 'Вес',
    keyResult: 'Ключевой результат',
    keyResults: 'Ключевые результаты',
    avg: 'Сред.',
    scoreAssessment: 'Оценка показателей',
    refreshScores: 'Обновить оценки',
    scoreLevel: 'Уровень оценки',
    averageScore: 'Средняя оценка',
    resultsBreakdown: 'Детализация результатов',
    actual: 'Факт',
    score: 'Оценка',
    krWeightsWarning: 'Вес КР',

    // Score Levels
    below: 'Не соответствует',
    meets: 'Ниже ожиданий',
    good: 'На уровне ожиданий',
    veryGood: 'Превышает ожидания',
    exceptional: 'Исключительно',

    // Metric Types
    higherIsBetter: 'Больше - лучше',
    lowerIsBetter: 'Меньше - лучше',
    qualitative: 'Качественный',

    // Settings Modal
    manageDepartmentsObjectivesKRs: 'Управление отделами, целями и ключевыми результатами',
    createNewDepartment: 'Создать новый отдел',
    departmentName: 'Название отдела',
    create: 'Создать',
    existingDepartments: 'Существующие отделы',
    delete: 'Удалить',
    objective: 'цель',
    createNewObjective: 'Создать новую цель',
    selectDepartment: 'Выберите отдел',
    objectiveName: 'Название цели',
    weightPercent: 'Вес (%)',
    existingObjectives: 'Существующие цели',
    noObjectivesYetText: 'Пока нет целей',
    createNewKeyResult: 'Создать новый ключевой результат',
    selectObjective: 'Выберите цель',
    keyResultName: 'Название ключевого результата',
    descriptionOptional: 'Описание (необязательно)',
    unitExample: 'Единица измерения (напр., %, $, пользователи)',
    thresholdValues: 'Пороговые значения',
    levels: 'уровней',
    enterActualMetricValues: 'Введите фактические значения метрик, соответствующие каждому уровню оценки',
    createKeyResult: 'Создать ключевой результат',
    existingKeyResults: 'Существующие ключевые результаты',
    noKeyResultsYet: 'Пока нет ключевых результатов',
    exceedsLimitExisting: 'Превышает лимит! Существующие КР используют',
    existingKrsAvailable: 'Существующие КР:',
    exceedsLimitOther: 'Превышает лимит! Другие КР используют',
    otherKrsAvailable: 'Другие КР:',
    weightExceeded: 'Вес превышен!',
    weightsBalanced: 'Веса сбалансированы',
    totalWeightRemaining: 'Общий вес:',
    manageOkrStructure: 'Управление структурой OKR и конфигурацией',
    hideThresholds: 'Скрыть',
    setThresholds: 'Установить',
    editThresholds: 'Редактировать',
    creatingKr: 'Создание...',
    addKeyResult: '+ Добавить ключевой результат',
    failedToUpdateKr: 'Не удалось обновить ключевой результат',
    savingChanges: 'Сохранение...',
    noObjectivesYetClick: 'Пока нет целей — нажмите "+ Добавить цель" выше',
    noDepartmentsYetClick: 'Пока нет отделов — нажмите "+ Добавить отдел" выше',
    onlyAdminsCanEditScoreLevels: 'Только администраторы могут редактировать уровни оценок.',
    deleteDivision: 'Удалить дивизион',
    deleteDepartment: 'Удалить отдел',
    deleteObjective: 'Удалить цель',
    editKeyResult: 'Редактировать ключевой результат',
    deleteKeyResult: 'Удалить ключевой результат',
    addGroup: 'Добавить группу',
    deleteGroup: 'Удалить группу',
    manageMembers: 'Участники',
    noEmployeesInDepartment: 'Нет сотрудников в этом отделе',
    membersUpdated: 'Участники группы обновлены',

    // Score Levels Manager
    scoreLevelConfiguration: 'Настройка уровней оценки',
    configureGlobalScoreLevels: 'Настройте глобальные уровни оценки. При сохранении изменения сортируются по значению оценки.',
    levelName: 'Название уровня',
    scoreValue: 'Значение оценки',
    colorClickToPick: 'Цвет (нажмите для выбора)',
    preview: 'Предпросмотр',
    chooseAColor: 'Выберите цвет:',
    customColor: 'Пользовательский цвет:',
    close: 'Закрыть',
    addLevel: 'Добавить уровень',
    addDept: 'Добавить Отдел',
    addObjectiveBtn: 'Добавить Цель',
    addKrBtn: 'Добавить КР',
    addBtn: '+ Добавить',
    saveChanges: 'Сохранить изменения',
    saving: 'Сохранение...',
    resetToDefaults: 'Сбросить на умолчания',
    unsavedChanges: '* Есть несохранённые изменения',
    failedToLoadScoreLevels: 'Не удалось загрузить уровни оценки',
    mustHaveAtLeast2Levels: 'Должно быть минимум 2 уровня оценки',
    scoreLevelsUpdated: 'Уровни оценки успешно обновлены!',
    failedToUpdateScoreLevels: 'Не удалось обновить уровни оценки',
    resetConfirmation: 'Сбросить на уровни по умолчанию? Все настройки будут потеряны.',
    scoreLevelsReset: 'Уровни оценки сброшены на значения по умолчанию',
    failedToResetScoreLevels: 'Не удалось сбросить уровни оценки',
    newLevel: 'Новый уровень',
    removeLevel: 'Удалить уровень',

    // Department Modal
    performanceDetails: 'Детали эффективности',

    // Organization Structure
    expandAll: 'Развернуть все',
    collapseAll: 'Свернуть все',
    createDivision: 'Создать дивизион',
    orgStructureTitle: 'Организационная структура',
    orgStructureDesc: 'Управление дивизионами, отделами и сотрудниками',
    hierarchicalView: 'Иерархический вид орг. структуры',
    nodePath: 'Дивизион → Отдел → Сотрудник',
    noDivisionsYet: 'Пока нет дивизионов',
    createFirstDivision: 'Создайте ваш первый дивизион, чтобы начать строить структуру',
    divisionsCount: 'Дивизионы',
    departmentsCount: 'Отделы',
    groupsCount: 'Группы',
    employeesCount: 'Сотрудники',
    leaderLabel: 'Руководитель:',
    deptsShort: 'Отд',
    empShort: 'Сот',
    unassignedDepts: 'Нераспределенные отделы',
    needsDivision: 'Нужен дивизион',
    headquarters: 'Штаб-квартира',
    loadingOrgStructure: 'Загрузка орг. структуры...',

    // Speedometer
    rating: 'Рейтинг',

    // Confirmations and Alerts
    confirmDeleteDepartment: 'Вы уверены, что хотите удалить этот отдел?',
    confirmDeleteObjective: 'Вы уверены, что хотите удалить эту цель?',
    confirmDeleteKeyResult: 'Вы уверены, что хотите удалить этот ключевой результат?',
    confirmLoadDemoData: 'Это заменит все существующие данные демо-данными. Продолжить?',
    demoDataLoaded: 'Демо-данные успешно загружены!',
    failedToLoadDemoData: 'Не удалось загрузить демо-данные',
    failedToCreateDepartment: 'Не удалось создать отдел',
    failedToDeleteDepartment: 'Не удалось удалить отдел',
    failedToCreateObjective: 'Не удалось создать цель',
    failedToDeleteObjective: 'Не удалось удалить цель',
    failedToCreateKeyResult: 'Не удалось создать ключевой результат',
    failedToDeleteKeyResult: 'Не удалось удалить ключевой результат',
    failedToLoadDepartments: 'Не удалось загрузить отделы',
    closeMonth: 'Закрыть месяц',
    closeMonthConfirm: 'Закрыть текущий месяц и сохранить баллы? Будет сделан снимок баллов всех отделов.',
    closing: 'Закрытие...',
    failedToExportExcel: 'Не удалось экспортировать в Excel',
    importSuccess: 'Импорт завершён успешно!',
    importFailed: 'Ошибка импорта',
    importInProgress: 'Импортируется...',
    onlyXlsxSupported: 'Поддерживается только формат .xlsx',

    // Loading
    loadingOKRTracker: 'Загрузка OKR Трекера...',

    // Language
    language: 'Язык',
    english: 'Английский',
    russian: 'Русский',
    uzbek: 'Узбекский',

    // Evaluations
    directorEvaluation: 'Оценка директора',
    leaderEvaluation: 'Оценка руководителя',
    hrEvaluation: 'Оценка HR',
    businessBlockEvaluation: 'Бизнес-блок',
    automaticOkrScore: 'Автоматическая оценка OKR',
    finalCombinedScore: 'Итоговая комбинированная оценка',
    notEvaluated: 'Не оценено',
    awaitingDirectorRating: 'Ожидание оценки директора',
    awaitingHrRating: 'Ожидание оценки HR',
    awaitingBusinessRating: 'Ожидание оценки бизнес-блока',
    separateDisplay: 'Отдельное отображение',
    notIncludedInWeightedScore: 'Не включено в взвешенную оценку',
    weightedFormula: 'Формула: (OKR × 60%) + (Директор × 20%) + (HR × 20%)',
    weightedFormulaWithBusiness: 'Формула: (OKR × 40%) + (Директор × 20%) + (HR × 20%) + (Бизнес × 20%)',
    finalScoreNotAvailable: 'Итоговая оценка недоступна',
    requiresAllEvaluations: 'Требуется OKR + Директор + HR (или все 4 с Бизнес-блоком)',
    basedOnKeyResultThresholds: 'На основе пороговых значений ключевых результатов',
    performanceGrade: 'Оценка эффективности (A-D)',
    starRating: 'Рейтинг (1-5 звёзд)',
    ratingGuide: 'Руководство по оценке:',
    commentOptional: 'Комментарий (необязательно)',
    addYourComments: 'Добавьте ваши комментарии...',
    submitEvaluation: 'Отправить оценку',
    updateEvaluation: 'Обновить оценку',
    newEvaluation: 'Новая оценка',
    correctEvaluation: 'Исправить оценку',
    newEvaluationTooltip: 'Отправить новую оценку (учитывается в отслеживании эффективности)',
    correctEvaluationTooltip: 'Исправить предыдущую оценку (не считается новой оценкой)',
    evaluationSavedSuccessfully: 'Оценка успешно сохранена!',
    failedToSaveEvaluation: 'Не удалось сохранить оценку',
    pleaseSelectRating: 'Пожалуйста, выберите оценку',
    loadingEvaluations: 'Загрузка оценок...',
    noPermissionToEvaluate: 'У вас нет прав для оценки',
    onlyEvaluatorsCanProvide: 'Только директора, HR и руководители бизнес-блока могут проводить оценку.',
    yourEvaluations: 'Ваши оценки',
    provideYourEvaluation: 'Проведите оценку',

    // HR Grade Labels (A=Best, D=Lowest)
    gradeA: 'A',
    gradeALabel: 'Отлично',
    gradeADescription: 'Отличная работа',
    gradeB: 'B',
    gradeBLabel: 'Превышает',
    gradeBDescription: 'Превышает ожидания',
    gradeC: 'C',
    gradeCLabel: 'Соответствует',
    gradeCDescription: 'Соответствует ожиданиям',
    gradeD: 'D',
    gradeDLabel: 'Требует улучшения',
    gradeDDescription: 'Требует улучшения',

    // Director Star Labels
    star1Label: 'Требует улучшения',
    star2Label: 'Ниже ожиданий',
    star3Label: 'Соответствует ожиданиям',
    star4Label: 'Превышает ожидания',
    star5Label: 'Отлично',

    // Progress
    progress: 'Прогресс',

    // Evaluation Timestamps
    submitted: 'Отправлено',
    lastUpdated: 'Последнее обновление',

    // Watermark
    watermark: 'Водяной знак',
    watermarkSettings: 'Настройки водяного знака',
    enableWatermark: 'Включить водяной знак',
    watermarkType: 'Тип',
    watermarkTypeText: 'Текст',
    watermarkTypeImage: 'Изображение',
    watermarkText: 'Текст водяного знака',
    watermarkOpacity: 'Прозрачность',
    watermarkImageUpload: 'Загрузить изображение',
    watermarkCurrentImage: 'Текущее изображение',
    watermarkSaved: 'Настройки водяного знака сохранены!',
    watermarkFailed: 'Не удалось сохранить настройки водяного знака',
    watermarkImageFailed: 'Не удалось загрузить изображение',

    // Disciplinary
    goodStanding: 'Хороший статус',
    underWatch: 'Под наблюдением',
    warningStatus: 'Предупреждение',
    finedStatus: 'Штраф',
    terminationRisk: 'Риск увольнения',
    atRiskOfTermination: 'Риск увольнения',
    financialPenaltyApplied: 'Применён финансовый штраф',
    formalWarningIssued: 'Вынесено формальное предупреждение',
    performanceBeingMonitored: 'Эффективность под наблюдением',
    viewFullPerformanceDetails: 'Подробнее об эффективности',
    belowExpectationsCount: 'ниже ожиданий',
    belowExpectationsEvaluation: 'оценка ниже ожиданий',
    belowExpectationsEvaluations: 'оценок ниже ожиданий',
    disciplinaryDescWatch: 'эффективность находится под наблюдением.',
    disciplinaryDescWarning: 'вынесено формальное предупреждение.',
    disciplinaryDescFine: 'применён финансовый штраф.',
    disciplinaryDescTermination: 'риск увольнения.',

    // User Profile
    loadingProfile: 'Загрузка профиля...',
    userNotFound: 'Пользователь не найден',
    back: 'Назад',
    jobTitle: 'Должность',
    inactive: 'Неактивен',
    cancel: 'Отмена',
    save: 'Сохранить',
    editProfile: 'Редактировать',
    contactInformation: 'Контактная информация',
    email: 'Эл. почта',
    phone: 'Телефон',
    username: 'Логин',
    about: 'О себе',
    memberSince: 'Участник с',
    lastLogin: 'Последний вход',
    assignedDepartments: 'Назначенные отделы',
    noDepartmentsAssigned: 'Нет назначенных отделов',
    performanceEvaluationHistory: 'История оценки эффективности',
    totalEvaluations: 'Всего оценок',
    belowExpectations: 'Ниже ожиданий',
    satisfactory: 'Удовлетворительно',
    belowExpectationsRate: 'Доля ниже ожиданий',
    eachDotOneEvaluation: 'Каждая точка = 1 оценка',
    recentEvaluations: 'Последние оценки',
    belowExpectationsLabel: 'Ниже ожиданий',
    satisfactoryLabel: 'Удовлетворительно',
    noEvaluationsYet: 'Оценок ещё нет',
    noComment: 'Без комментариев',

    // Performance Alerts Page
    loadingPerformanceAlerts: 'Загрузка оповещений...',
    failedToLoadPerformanceAlerts: 'Не удалось загрузить оповещения',
    performanceAlertsTitle: 'Оповещения об эффективности',
    employeesWithBelowExpectations: 'Сотрудники с оценками ниже ожиданий',
    filterByStatus: 'Фильтр по статусу:',
    allAtRisk: 'Все в зоне риска',
    showing: 'Показано',
    of: 'из',
    noPerformanceAlerts: 'Нет оповещений',
    allEmployeesGoodStanding: 'Все сотрудники в хорошем статусе',
    employee: 'Сотрудник',
    totalEvals: 'Всего оценок',
    disciplinaryStatus: 'Дисциплинарный статус',
    latestEvaluationsCol: 'Последние оценки',
    action: 'Действие',
    viewProfile: 'Профиль',
    showingEmployeesWithConcerns: 'сотрудник(ов) с проблемами',

    // Team Overview
    loadingTeamOverview: 'Загрузка обзора команды...',
    failedToLoadTeamData: 'Не удалось загрузить данные команды',
    teamOverviewTitle: 'Обзор команды',
    viewAllTeamMembers: 'Просмотр всех сотрудников и их оценок',
    employeesNeedAttention: 'сотрудник(ов) требуют внимания',
    terminationRiskCount: 'риск увольнения',
    finedCount: 'оштрафованных',
    warnedCount: 'предупреждённых',
    showAtRiskOnly: 'Только в зоне риска',
    showAll: 'Показать всех',
    search: 'Поиск',
    searchPlaceholder: 'Имя, логин или эл. почта...',
    role: 'Роль',
    allRoles: 'Все роли',
    department: 'Отдел',
    allDepartments2: 'Все отделы',
    activeUsersOnly: 'Только активные',
    performanceFilter: 'Фильтр эффективности:',
    all: 'Все',
    atRisk: 'В зоне риска',
    totalMembers: 'Всего сотрудников',
    active: 'Активные',
    noUsersFound: 'Пользователи не найдены',
    tryAdjustingFilters: 'Попробуйте изменить фильтры',
    showingXOfYTeamMembers: 'сотрудников',

    // User Management
    confirmDeleteUser: 'Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.',
    loadingUsers: 'Загрузка пользователей...',
    userManagementTitle: 'Управление пользователями',
    manageUsersRolesDepartments: 'Управление пользователями, ролями и назначениями отделов',
    createUser: 'Создать пользователя',
    totalUsers: 'Всего пользователей',
    criticalFineTermination: 'Критические (Штраф/Увольнение)',
    none: 'Нет',
    more: 'ещё',
    status: 'Статус',
    performance: 'Эффективность',
    lastLoginCol: 'Последний вход',
    actions: 'Действия',
    editUser: 'Редактировать',
    assignDepartmentsAction: 'Назначить отделы',
    assignGroups: 'Назначить группы',
    noGroupsAvailable: 'Нет доступных групп',
    deleteUser: 'Удалить',
    noUsersMatchingFilters: 'Пользователи по фильтру не найдены.',
    showingXOfYUsers: 'пользователей',
    user: 'Пользователь',

    // Attachment
    attachmentRequired: 'Необходимо прикрепить файл-основание',
    attachFileFirst: 'Сначала прикрепите файл-основание',
    noEditPermission: 'У вас нет прав для редактирования этого отдела',
    attachFile: 'Прикрепить файл',
    file: 'Файл',
    fileRequired: 'Файл *',
    download: 'Скачать',
  },

  uz: {
    // App Header
    appTitle: 'OKR Samaradorlik Kuzatuvchisi',
    organizationOverview: 'Tashkilot sharhi',
    departmentDetails: 'Tafsilotlar',

    // Sidebar
    controlPanel: 'Boshqaruv paneli',
    departments: "Bo'limlar",
    noDepartments: "Bo'limlar yo'q",
    settings: 'Sozlamalar',
    export: 'Eksport',
    import: 'Import',
    demo: 'Demo',
    myProfile: 'Mening profilim',
    userManagement: "Foydalanuvchilar boshqaruvi",
    teamOverview: "Jamoa sharhi",
    organization: 'Tashkilot',
    performanceAlerts: 'Ogohlantirishlar',
    logout: 'Chiqish',
    readOnlyMode: "Faqat o'qish",
    editEnabled: 'Tahrirlash yoqilgan',

    // Stats
    departmentsLabel: "Bo'limlar",
    objectivesLabel: 'Maqsadlar',
    keyResultsLabel: 'Asosiy natijalar',
    avgScore: "O'rtacha ball",

    // Organization
    organizationScore: 'Tashkilot bahosi',
    organizationScoreBreakdown: 'Tashkilot bahosi tafsiloti',
    orgAverage: "Tash. o'rtacha",
    allDepartments: "Barcha bo'limlar",
    divisionObjectives: 'Divizion maqsadlari',
    departmentObjectives: "Bo'lim maqsadlari",
    groupObjectives: 'Guruh maqsadlari',
    leaderObjectives: 'Rahbar maqsadlari',
    noObjectivesFound: "Maqsadlar topilmadi",
    objectives: 'maqsadlar',

    // Department View
    departmentScore: "Bo'lim bahosi",
    scoreSummary: 'Baholash xulosasi',
    backToDashboard: 'Bosh panelga qaytish',
    listView: "Ro'yxat",
    gridView: 'Jadval',
    noObjectivesYet: "Hozircha maqsadlar yo'q",
    addObjectivesFromSettings: "Sozlamalardan bu bo'limga maqsadlar qo'shing!",
    leaderPersonalGoals: 'Rahbar shaxsiy maqsadlari',
    leaderScore: 'Rahbar bahosi',
    departmentGoals: "Bo'lim maqsadlari",
    evaluated: 'Baholangan',

    // Objective Card
    weight: "Og'irlik",
    keyResult: 'Asosiy natija',
    keyResults: 'Asosiy natijalar',
    avg: "O'rt.",
    scoreAssessment: "Baholash ko'rsatkichlari",
    refreshScores: 'Baholarni yangilash',
    scoreLevel: 'Baho darajasi',
    averageScore: "O'rtacha ball",
    resultsBreakdown: 'Natijalar tafsiloti',
    actual: 'Haqiqiy',
    score: 'Ball',
    krWeightsWarning: "AN og'irliklari",

    // Score Levels
    below: 'Mos kelmaydi',
    meets: 'Kutilganidan past',
    good: 'Kutilgan darajada',
    veryGood: 'Kutilganidan yuqori',
    exceptional: 'Ajoyib',

    // Metric Types
    higherIsBetter: "Ko'proq - yaxshiroq",
    lowerIsBetter: 'Kamroq - yaxshiroq',
    qualitative: "Sifat ko'rsatkichi",

    // Settings Modal
    manageDepartmentsObjectivesKRs: "Bo'limlar, maqsadlar va asosiy natijalarni boshqarish",
    createNewDepartment: "Yangi bo'lim yaratish",
    departmentName: "Bo'lim nomi",
    create: 'Yaratish',
    existingDepartments: "Mavjud bo'limlar",
    delete: "O'chirish",
    objective: 'maqsad',
    createNewObjective: 'Yangi maqsad yaratish',
    selectDepartment: "Bo'limni tanlang",
    objectiveName: 'Maqsad nomi',
    weightPercent: "Og'irlik (%)",
    existingObjectives: 'Mavjud maqsadlar',
    noObjectivesYetText: "Hozircha maqsadlar yo'q",
    createNewKeyResult: 'Yangi asosiy natija yaratish',
    selectObjective: 'Maqsadni tanlang',
    keyResultName: 'Asosiy natija nomi',
    descriptionOptional: 'Tavsif (ixtiyoriy)',
    unitExample: "O'lchov birligi (masalan, %, $, foydalanuvchilar)",
    thresholdValues: 'Chegara qiymatlari',
    levels: 'daraja',
    enterActualMetricValues: "Har bir baho darajasiga mos keladigan haqiqiy ko'rsatkich qiymatlarini kiriting",
    createKeyResult: 'Asosiy natija yaratish',
    existingKeyResults: 'Mavjud asosiy natijalar',
    noKeyResultsYet: "Hozircha asosiy natijalar yo'q",
    exceedsLimitExisting: "Limitdan oshdi! Mavjud ANlar ishlatadi",
    existingKrsAvailable: "Mavjud ANlar:",
    exceedsLimitOther: "Limitdan oshdi! Boshqa ANlar ishlatadi",
    otherKrsAvailable: "Boshqa ANlar:",
    weightExceeded: "Og'irlik oshdi!",
    weightsBalanced: "Og'irliklar muvozanatda",
    totalWeightRemaining: "Umumiy og'irlik:",
    manageOkrStructure: "OKR tuzilmasi va konfiguratsiyasini boshqarish",
    hideThresholds: "Yashirish",
    setThresholds: "O'rnatish",
    editThresholds: "Tahrirlash",
    creatingKr: "Yaratilmoqda...",
    addKeyResult: "+ Asosiy natija qo'shish",
    failedToUpdateKr: "Asosiy natijani yangilash muvaffaqiyatsiz",
    savingChanges: "Saqlanmoqda...",
    noObjectivesYetClick: "Hozircha maqsadlar yo'q — yuqoridagi \"+ Maqsad qo'shish\" tugmasini bosing",
    noDepartmentsYetClick: "Hozircha bo'limlar yo'q — yuqoridagi \"+ Bo'lim qo'shish\" tugmasini bosing",
    onlyAdminsCanEditScoreLevels: "Faqat administratorlar baho darajalarini tahrirlashi mumkin.",
    deleteDivision: "Bo'linmani o'chirish",
    deleteDepartment: "Bo'limni o'chirish",
    deleteObjective: "Maqsadni o'chirish",
    editKeyResult: "Asosiy natijani tahrirlash",
    deleteKeyResult: "Asosiy natijani o'chirish",
    addGroup: "Guruh qo'shish",
    deleteGroup: "Guruhni o'chirish",
    manageMembers: "A'zolarni boshqarish",
    noEmployeesInDepartment: "Bu bo'limda xodimlar yo'q",
    membersUpdated: "Guruh a'zolari yangilandi",

    // Score Levels Manager
    scoreLevelConfiguration: 'Baho darajalarini sozlash',
    configureGlobalScoreLevels: "Global baho darajalarini sozlang. O'zgarishlar saqlanganda baho qiymati bo'yicha saralanadi.",
    levelName: 'Daraja nomi',
    scoreValue: 'Baho qiymati',
    colorClickToPick: 'Rang (tanlash uchun bosing)',
    preview: "Ko'rib chiqish",
    chooseAColor: 'Rangni tanlang:',
    customColor: 'Maxsus rang:',
    close: 'Yopish',
    addLevel: 'Daraja qo\'shish',
    addDept: 'Bo\'lim qo\'shish',
    addObjectiveBtn: 'Maqsad qo\'shish',
    addKrBtn: 'K.N qo\'shish',
    addBtn: '+ Qo\'shish',
    saveChanges: "O'zgarishlarni saqlash",
    saving: 'Saqlanmoqda...',
    resetToDefaults: 'Standartga qaytarish',
    unsavedChanges: "* Saqlanmagan o'zgarishlar mavjud",
    failedToLoadScoreLevels: "Baho darajalarini yuklab bo'lmadi",
    mustHaveAtLeast2Levels: "Kamida 2 ta baho darajasi bo'lishi kerak",
    scoreLevelsUpdated: 'Baho darajalari muvaffaqiyatli yangilandi!',
    failedToUpdateScoreLevels: "Baho darajalarini yangilab bo'lmadi",
    resetConfirmation: "Standart baho darajalariga qaytarilsinmi? Barcha sozlamalar yo'qoladi.",
    scoreLevelsReset: 'Baho darajalari standart qiymatlarga qaytarildi',
    failedToResetScoreLevels: "Baho darajalarini qaytarib bo'lmadi",
    newLevel: 'Yangi daraja',
    removeLevel: "Darajani o'chirish",

    // Department Modal
    performanceDetails: 'Samaradorlik tafsilotlari',

    // Organization Structure
    expandAll: 'Barchasini yoyish',
    collapseAll: 'Barchasini yig\'ish',
    createDivision: 'Bo\'linma yaratish',
    orgStructureTitle: 'Tashkiliy tuzilma',
    orgStructureDesc: 'Bo\'linmalar, bo\'limlar va xodimlarni boshqarish',
    hierarchicalView: 'Tashkiliy tuzilmaning ierarxik ko\'rinishi',
    nodePath: 'Bo\'linma → Bo\'lim → Xodim',
    noDivisionsYet: 'Hali bo\'linmalar yo\'q',
    createFirstDivision: 'Tuzilmani qurishni boshlash uchun birinchi bo\'linmani yarating',
    divisionsCount: 'Bo\'linmalar',
    departmentsCount: 'Bo\'limlar',
    groupsCount: 'Guruhlar',
    employeesCount: 'Xodimlar',
    leaderLabel: 'Rahbar:',
    deptsShort: 'Bo\'l',
    empShort: 'Xod',
    unassignedDepts: 'Birlashtirilmagan bo\'limlar',
    needsDivision: 'Bo\'linma kerak',
    headquarters: 'Bosh ofis',
    loadingOrgStructure: 'Tashkiliy tuzilma yuklanmoqda...',

    // Speedometer
    rating: 'Reyting',

    // Confirmations and Alerts
    confirmDeleteDepartment: "Bu bo'limni o'chirishni xohlaysizmi?",
    confirmDeleteObjective: "Bu maqsadni o'chirishni xohlaysizmi?",
    confirmDeleteKeyResult: "Bu asosiy natijani o'chirishni xohlaysizmi?",
    confirmLoadDemoData: "Bu barcha mavjud ma'lumotlarni demo ma'lumotlari bilan almashtiradi. Davom ettirilsinmi?",
    demoDataLoaded: "Demo ma'lumotlar muvaffaqiyatli yuklandi!",
    failedToLoadDemoData: "Demo ma'lumotlarni yuklab bo'lmadi",
    failedToCreateDepartment: "Bo'lim yaratib bo'lmadi",
    failedToDeleteDepartment: "Bo'limni o'chirib bo'lmadi",
    failedToCreateObjective: "Maqsad yaratib bo'lmadi",
    failedToDeleteObjective: "Maqsadni o'chirib bo'lmadi",
    failedToCreateKeyResult: "Asosiy natija yaratib bo'lmadi",
    failedToDeleteKeyResult: "Asosiy natijani o'chirib bo'lmadi",
    failedToLoadDepartments: "Bo'limlarni yuklab bo'lmadi",
    closeMonth: "Oyni yopish",
    closeMonthConfirm: "Joriy oyni yopish va ballarni saqlash? Barcha bo'limlar ballari saqlanadi.",
    closing: "Yopilmoqda...",
    failedToExportExcel: "Excelga eksport qilib bo'lmadi",
    importSuccess: "Import muvaffaqiyatli yakunlandi!",
    importFailed: "Import amalga oshmadi",
    importInProgress: "Import qilinmoqda...",
    onlyXlsxSupported: "Faqat .xlsx formati qo'llab-quvvatlanadi",

    // Loading
    loadingOKRTracker: 'OKR Kuzatuvchisi yuklanmoqda...',

    // Language
    language: 'Til',
    english: 'Inglizcha',
    russian: 'Ruscha',
    uzbek: "O'zbekcha",

    // Evaluations
    directorEvaluation: 'Direktor bahosi',
    leaderEvaluation: 'Rahbar bahosi',
    hrEvaluation: 'HR bahosi',
    businessBlockEvaluation: 'Biznes blok',
    automaticOkrScore: 'Avtomatik OKR bahosi',
    finalCombinedScore: 'Yakuniy umumiy baho',
    notEvaluated: 'Baholanmagan',
    awaitingDirectorRating: 'Direktor bahosini kutish',
    awaitingHrRating: 'HR bahosini kutish',
    awaitingBusinessRating: 'Biznes bahosini kutish',
    separateDisplay: "Alohida ko'rsatish",
    notIncludedInWeightedScore: 'Vaznli bahoga kiritilmagan',
    weightedFormula: 'Formula: (OKR x 60%) + (Direktor x 20%) + (HR x 20%)',
    weightedFormulaWithBusiness: 'Formula: (OKR x 40%) + (Direktor x 20%) + (HR x 20%) + (Biznes x 20%)',
    finalScoreNotAvailable: 'Yakuniy baho mavjud emas',
    requiresAllEvaluations: 'OKR + Direktor + HR talab qilinadi (yoki Biznes-blok bilan 4 ta)',
    basedOnKeyResultThresholds: 'Asosiy natijalar chegaralariga asoslangan',
    performanceGrade: 'Samaradorlik bahosi (A-D)',
    starRating: 'Reyting (1-5 yulduz)',
    ratingGuide: "Baholash ko'rsatmasi:",
    commentOptional: 'Izoh (ixtiyoriy)',
    addYourComments: "Izohlaringizni qo'shing...",
    submitEvaluation: 'Bahoni yuborish',
    updateEvaluation: 'Bahoni yangilash',
    newEvaluation: 'Yangi baho',
    correctEvaluation: 'Bahoni tuzatish',
    newEvaluationTooltip: 'Yangi baho yuborish (samaradorlik kuzatuviga hisoblanadi)',
    correctEvaluationTooltip: 'Oldingi bahoni tuzatish (yangi baho sifatida hisoblanmaydi)',
    evaluationSavedSuccessfully: 'Baho muvaffaqiyatli saqlandi!',
    failedToSaveEvaluation: "Bahoni saqlab bo'lmadi",
    pleaseSelectRating: 'Iltimos, baho tanlang',
    loadingEvaluations: 'Baholar yuklanmoqda...',
    noPermissionToEvaluate: "Sizda baholash huquqi yo'q",
    onlyEvaluatorsCanProvide: "Faqat direktorlar, HR va biznes blok rahbarlari baho berishi mumkin.",
    yourEvaluations: 'Sizning baholaringiz',
    provideYourEvaluation: 'Baho bering',

    // HR Grade Labels (A=Best, D=Lowest)
    gradeA: 'A',
    gradeALabel: "A'lo",
    gradeADescription: "A'lo ishlash",
    gradeB: 'B',
    gradeBLabel: 'Oshib ketadi',
    gradeBDescription: 'Kutilganidan oshib ketadi',
    gradeC: 'C',
    gradeCLabel: 'Mos keladi',
    gradeCDescription: 'Kutilganlarga mos keladi',
    gradeD: 'D',
    gradeDLabel: 'Yaxshilash kerak',
    gradeDDescription: 'Yaxshilash talab qilinadi',

    // Director Star Labels
    star1Label: 'Yaxshilash kerak',
    star2Label: 'Kutilganidan past',
    star3Label: 'Kutilganlarga mos',
    star4Label: 'Kutilganidan yuqori',
    star5Label: "A'lo",

    // Progress
    progress: 'Jarayon',

    // Evaluation Timestamps
    submitted: 'Yuborilgan',
    lastUpdated: 'Oxirgi yangilanish',

    // Watermark
    watermark: 'Suv belgisi',
    watermarkSettings: 'Suv belgisi sozlamalari',
    enableWatermark: 'Suv belgisini yoqish',
    watermarkType: 'Turi',
    watermarkTypeText: 'Matn',
    watermarkTypeImage: 'Rasm',
    watermarkText: 'Suv belgisi matni',
    watermarkOpacity: 'Shaffoflik',
    watermarkImageUpload: 'Rasm yuklash',
    watermarkCurrentImage: 'Joriy rasm',
    watermarkSaved: 'Suv belgisi sozlamalari saqlandi!',
    watermarkFailed: "Suv belgisi sozlamalarini saqlab bo'lmadi",
    watermarkImageFailed: "Suv belgisi rasmini yuklab bo'lmadi",

    // Disciplinary
    goodStanding: 'Yaxshi holat',
    underWatch: 'Kuzatuv ostida',
    warningStatus: 'Ogohlantirish',
    finedStatus: 'Jarima',
    terminationRisk: "Ishdan bo'shatish xavfi",
    atRiskOfTermination: "Ishdan bo'shatish xavfi",
    financialPenaltyApplied: 'Moliyaviy jarima qo\'llanildi',
    formalWarningIssued: 'Rasmiy ogohlantirish berildi',
    performanceBeingMonitored: 'Samaradorlik kuzatilmoqda',
    viewFullPerformanceDetails: "To'liq samaradorlik tafsilotlari",
    belowExpectationsCount: 'kutilganidan past',
    belowExpectationsEvaluation: "kutilganidan past baho",
    belowExpectationsEvaluations: "kutilganidan past baholar",
    disciplinaryDescWatch: "samaradorlik kuzatilmoqda.",
    disciplinaryDescWarning: "rasmiy ogohlantirish berildi.",
    disciplinaryDescFine: "moliyaviy jarima qo'llanildi.",
    disciplinaryDescTermination: "ishdan bo'shatish xavfi.",

    // User Profile
    loadingProfile: 'Profil yuklanmoqda...',
    userNotFound: 'Foydalanuvchi topilmadi',
    back: 'Orqaga',
    jobTitle: 'Lavozim',
    inactive: 'Nofaol',
    cancel: 'Bekor qilish',
    save: 'Saqlash',
    editProfile: 'Tahrirlash',
    contactInformation: "Aloqa ma'lumotlari",
    email: 'Elektron pochta',
    phone: 'Telefon',
    username: 'Foydalanuvchi nomi',
    about: 'Haqida',
    memberSince: "A'zo bo'lgan sana",
    lastLogin: 'Oxirgi kirish',
    assignedDepartments: "Tayinlangan bo'limlar",
    noDepartmentsAssigned: "Bo'limlar tayinlanmagan",
    performanceEvaluationHistory: 'Samaradorlik baholash tarixi',
    totalEvaluations: 'Jami baholar',
    belowExpectations: 'Kutilganidan past',
    satisfactory: 'Qoniqarli',
    belowExpectationsRate: 'Kutilganidan past darajasi',
    eachDotOneEvaluation: 'Har bir nuqta = 1 baho',
    recentEvaluations: 'Oxirgi baholar',
    belowExpectationsLabel: 'Kutilganidan past',
    satisfactoryLabel: 'Qoniqarli',
    noEvaluationsYet: 'Hozircha baholar yo\'q',
    noComment: 'Izohsiz',

    // Performance Alerts Page
    loadingPerformanceAlerts: 'Ogohlantirishlar yuklanmoqda...',
    failedToLoadPerformanceAlerts: "Ogohlantirishlarni yuklab bo'lmadi",
    performanceAlertsTitle: 'Samaradorlik ogohlantirishlari',
    employeesWithBelowExpectations: "Kutilganidan past baholarga ega xodimlar",
    filterByStatus: "Status bo'yicha filtrlash:",
    allAtRisk: 'Barcha xavflilar',
    showing: "Ko'rsatilmoqda",
    of: 'dan',
    noPerformanceAlerts: 'Ogohlantirishlar yo\'q',
    allEmployeesGoodStanding: 'Barcha xodimlar yaxshi holatda',
    employee: 'Xodim',
    totalEvals: 'Jami baholar',
    disciplinaryStatus: 'Intizomiy holat',
    latestEvaluationsCol: 'Oxirgi baholar',
    action: 'Harakat',
    viewProfile: 'Profilni ko\'rish',
    showingEmployeesWithConcerns: 'xodim(lar) muammoli',

    // Team Overview
    loadingTeamOverview: 'Jamoa sharhi yuklanmoqda...',
    failedToLoadTeamData: "Jamoa ma'lumotlarini yuklab bo'lmadi",
    teamOverviewTitle: 'Jamoa sharhi',
    viewAllTeamMembers: "Barcha jamoa a'zolari va ularning baholarini ko'rish",
    employeesNeedAttention: "xodim(lar) e'tiborga muhtoj",
    terminationRiskCount: "bo'shatish xavfi",
    finedCount: 'jarimaga tortilgan',
    warnedCount: 'ogohlantirilgan',
    showAtRiskOnly: 'Faqat xavflilarni',
    showAll: "Hammasini ko'rsatish",
    search: 'Qidirish',
    searchPlaceholder: 'Ism, login yoki pochta...',
    role: 'Rol',
    allRoles: 'Barcha rollar',
    department: "Bo'lim",
    allDepartments2: "Barcha bo'limlar",
    activeUsersOnly: 'Faqat faol',
    performanceFilter: 'Samaradorlik filtri:',
    all: 'Barchasi',
    atRisk: 'Xavfli',
    totalMembers: "Jami a'zolar",
    active: 'Faol',
    noUsersFound: 'Foydalanuvchilar topilmadi',
    tryAdjustingFilters: "Filtrlarni o'zgartirib ko'ring",
    showingXOfYTeamMembers: "jamoa a'zolari",

    // User Management
    confirmDeleteUser: "Bu foydalanuvchini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.",
    loadingUsers: 'Foydalanuvchilar yuklanmoqda...',
    userManagementTitle: 'Foydalanuvchilar boshqaruvi',
    manageUsersRolesDepartments: "Foydalanuvchilar, rollar va bo'lim tayinlashlarini boshqarish",
    createUser: 'Foydalanuvchi yaratish',
    totalUsers: 'Jami foydalanuvchilar',
    criticalFineTermination: "Jiddiy (Jarima/Bo'shatish)",
    none: "Yo'q",
    more: 'yana',
    status: 'Holat',
    performance: 'Samaradorlik',
    lastLoginCol: 'Oxirgi kirish',
    actions: 'Harakatlar',
    editUser: 'Tahrirlash',
    assignDepartmentsAction: "Bo'lim tayinlash",
    assignGroups: "Guruhlarni tayinlash",
    noGroupsAvailable: "Guruhlar mavjud emas",
    deleteUser: "O'chirish",
    noUsersMatchingFilters: "Filtrga mos foydalanuvchilar topilmadi.",
    showingXOfYUsers: 'foydalanuvchilar',
    user: 'Foydalanuvchi',

    // Attachment
    attachmentRequired: 'Fayl biriktirish talab qilinadi',
    attachFileFirst: 'Avval fayl biriktiring',
    noEditPermission: "Bu bo'limni tahrirlash huquqingiz yo'q",
    attachFile: 'Fayl biriktirish',
    file: 'Fayl',
    fileRequired: 'Fayl *',
    download: 'Yuklab olish',
  }
};
