package uz.garantbank.okrTrackingSystem.service;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.dto.user.DepartmentSummaryDTO;
import uz.garantbank.okrTrackingSystem.entity.Department;
import uz.garantbank.okrTrackingSystem.entity.Division;
import uz.garantbank.okrTrackingSystem.entity.User;
import uz.garantbank.okrTrackingSystem.repository.DepartmentRepository;
import uz.garantbank.okrTrackingSystem.repository.DivisionRepository;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class DivisionService {

    private final DivisionRepository divisionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final ScoreCalculationService scoreCalculationService;

    // Constructor injection (recommended over @Autowired)
    public DivisionService(
            DivisionRepository divisionRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            ScoreCalculationService scoreCalculationService
    ) {
        this.divisionRepository = divisionRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.scoreCalculationService = scoreCalculationService;
    }

    /**
     * Create a new division
     */
    public DivisionDTO createDivision(CreateDivisionRequest request) {
        log.debug("Creating division: {}", request.getName());
        // Validation
        if (divisionRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Division with this name already exists");
        }

        // Create entity
        Division division = new Division();
        division.setName(request.getName());

        // Set leader if provided
        if (request.getLeaderId() != null) {
            User leader = userRepository.findById(request.getLeaderId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            division.setDivisionLeader(leader);
        }

        // Save to database
        Division saved = divisionRepository.save(division);

        // Convert to DTO and return
        return convertToDTO(saved);
    }

    /**
     * Get all divisions with their departments
     */
    public List<DivisionDTO> getAllDivisions() {
        List<Division> divisions = divisionRepository.findAllWithDepartments();
        return divisions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get single division by ID
     */
    public DivisionDTO getDivisionById(String id) {
        Division division = divisionRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));
        return convertToDTO(division);
    }

    /**
     * Update division
     */
    public DivisionDTO updateDivision(String id, UpdateDivisionRequest request) {
        Division division = divisionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Update name if provided
        if (request.getName() != null && !request.getName().isBlank()) {
            // Check for duplicate name
            if (!division.getName().equals(request.getName())
                    && divisionRepository.existsByName(request.getName())) {
                throw new IllegalArgumentException("Division with this name already exists");
            }
            division.setName(request.getName());
        }

        // Update leader if provided
        if (request.getLeaderId() != null) {
            User leader = userRepository.findById(request.getLeaderId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            division.setDivisionLeader(leader);
        }

        Division updated = divisionRepository.save(division);
        return convertToDTO(updated);
    }

    /**
     * Delete division and cascade-delete all its departments, objectives, and key results.
     */
    @Transactional
    public void deleteDivision(String id) {
        log.debug("Deleting division: {}", id);
        Division division = divisionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Cascade: delete all departments in this division first
        List<Department> departments = departmentRepository.findByDivisionId(id);
        if (!departments.isEmpty()) {
            log.info("Cascade-deleting {} department(s) in division '{}'", departments.size(), division.getName());
            departmentRepository.deleteAll(departments);
        }

        divisionRepository.delete(division);
    }

    /**
     * Get division with calculated score
     */
    public DivisionWithScoreDTO getDivisionWithScore(String divisionId) {
        Division division = divisionRepository.findByIdWithDepartments(divisionId)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Calculate division score
        ScoreResult score = scoreCalculationService.calculateDivisionScore(
                division.getDepartments()
        );

        DivisionWithScoreDTO dto = new DivisionWithScoreDTO();
        dto.setId(division.getId());
        dto.setName(division.getName());
        dto.setScore(score.getScore());
        dto.setScoreLevel(score.getLevel());
        dto.setColor(score.getColor());
        dto.setPercentage(score.getPercentage());

        return dto;
    }


    /**
     * Get all departments in a division
     */
    public List<DepartmentSummaryDTO> getDepartmentsByDivisionId(String divisionId) {
        // Verify division exists
        if (!divisionRepository.existsById(divisionId)) {
            throw new IllegalArgumentException("Division not found with ID: " + divisionId);
        }

        return departmentRepository.findByDivisionId(divisionId).stream()
                .map(dept -> new DepartmentSummaryDTO(dept.getId(), dept.getName()))
                .collect(Collectors.toList());
    }

    /**
     * Convert Entity to DTO
     */
    private DivisionDTO convertToDTO(Division division) {
        DivisionDTO dto = new DivisionDTO();
        dto.setId(division.getId());
        dto.setName(division.getName());
        dto.setCreatedAt(division.getCreatedAt());
        dto.setUpdatedAt(division.getUpdatedAt());

        // Convert leader to summary
        if (division.getDivisionLeader() != null) {
            User leader = division.getDivisionLeader();
            UserSummaryDTO leaderDTO = new UserSummaryDTO(
                    leader.getId(),
                    leader.getUsername(),
                    leader.getFullName(),
                    leader.getProfilePhotoUrl()
            );
            dto.setDivisionLeader(leaderDTO);
        }

        // Convert departments to summaries
        if (division.getDepartments() != null) {
            List<DepartmentSummaryDTO> deptSummaries = division.getDepartments()
                    .stream()
                    .map(dept -> new DepartmentSummaryDTO(dept.getId(), dept.getName()))
                    .collect(Collectors.toList());
            dto.setDepartments(deptSummaries);
        }

        return dto;
    }
}

