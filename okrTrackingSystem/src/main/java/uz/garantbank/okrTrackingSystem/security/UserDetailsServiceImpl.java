package uz.garantbank.okrTrackingSystem.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.entity.User;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;

/**
 * Implementation of Spring Security's UserDetailsService.
 * Loads user-specific data for authentication.
 * this is basically the bridge between database and security system
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.info("Loading user by username: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", username);
                    return new UsernameNotFoundException("User not found with username: " + username);
                });

        log.info("Found user: {}, role: {}, active: {}", user.getUsername(), user.getRole(), user.isActive());

        UserDetails userDetails = UserDetailsImpl.build(user);
        log.info("UserDetails created, enabled: {}", userDetails.isEnabled());

        return userDetails;
    }
}


/**
 * How they work together (The Flow)
 *
 * Request Arrives: A user sends a request with a Token.
 *
 * Filter Intercepts: JwtAuthenticationFilter catches it.
 *
 * Token Validated: JwtTokenProvider confirms the token is real.
 *
 * Identity Loaded: UserDetailsServiceImpl looks up the user in the database to get their latest roles/permissions.
 *
 * Security Context Set: The user is officially "Logged In" for the duration of that specific request.
 */