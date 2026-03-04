package uz.garantbank.okrTrackingSystem.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import uz.garantbank.okrTrackingSystem.entity.Division;
import uz.garantbank.okrTrackingSystem.repository.DivisionRepository;

import java.util.Collection;

@Slf4j
@Service
public class DivisionAccessService {

    private final DivisionRepository divisionRepository;

    public DivisionAccessService(DivisionRepository divisionRepository) {
        this.divisionRepository = divisionRepository;
    }

    /**
     * Check if user can edit a division
     *
     * Rules:
     * - ADMIN can edit all divisions
     * - DIRECTOR can edit all divisions
     * - Division leader can edit their own division
     */
    public boolean canUserEditDivision(Authentication authentication, String divisionId) {
        if (authentication == null) return false;

        String username = authentication.getName();
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();

        // Admin and Director can edit all
        if (hasRole(authorities, "ADMIN") || hasRole(authorities, "DIRECTOR")) {
            return true;
        }

        // Check if user is the division leader
        Division division = divisionRepository.findById(divisionId).orElse(null);
        if (division != null && division.getDivisionLeader() != null) {
            return division.getDivisionLeader().getUsername().equals(username);
        }

        return false;
    }

    private boolean hasRole(Collection<? extends GrantedAuthority> authorities, String role) {
        return authorities.stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_" + role));
    }
}