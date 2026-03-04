package uz.garantbank.okrTrackingSystem.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import uz.garantbank.okrTrackingSystem.entity.User;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

/**
 * Implementation of Spring Security's UserDetails interface.
 * Wraps our User entity for authentication and authorization.
 * This creates the Template to represent the user when authenticating
 * This class translates the user entity into that template
 */
@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {

    private UUID id;
    private String username;
    private String email;
    private String fullName;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;

    private boolean active;

    /**
     * Build UserDetailsImpl from User entity
     *
     * @param user the user entity
     * @return UserDetailsImpl instance
     */
    public static UserDetailsImpl build(User user) {
        // Convert role to Spring Security authority (ROLE_ prefix required)
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPassword(),
                Collections.singletonList(authority),
                user.isActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
