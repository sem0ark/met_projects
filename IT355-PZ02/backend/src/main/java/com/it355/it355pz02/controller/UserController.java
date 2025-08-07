package com.it355.it355pz02.controller;

import com.it355.it355pz02.utils.APIException;
import com.it355.it355pz02.model.UserPostDTO;
import com.it355.it355pz02.model.User;
import com.it355.it355pz02.model.UserDTO;
import com.it355.it355pz02.model.UserRepository;
import com.it355.it355pz02.model.UserUpdateDTO;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@AllArgsConstructor
@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private String getCurrentAuthenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return null;
    }

    private UserDTO convertToDto(User user) {
        return new UserDTO(user.getId(), user.getUsername(), user.getRole());
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<UserDTO> userDTOs = users.stream()
                .map(this::convertToDto)
                .filter(user -> user.getRole() == User.Role.USER)
                .collect(Collectors.toList());
        return ResponseEntity.ok(userDTOs);
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "User not found with id: " + id));
        return ResponseEntity.ok(convertToDto(user));
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserPostDTO registerDto) {
        logger.info("Admin user '{}' is attempting to create new user: {}", getCurrentAuthenticatedUsername(), registerDto.getUsername());

        if (userRepository.existsByUsername(registerDto.getUsername())) {
            logger.warn("User creation failed: Username '{}' already exists.", registerDto.getUsername());
            throw new APIException(HttpStatus.BAD_REQUEST, "Username is already taken!");
        }

        User newUser = new User();
        newUser.setUsername(registerDto.getUsername());
        newUser.setPasswordHash(passwordEncoder.encode(registerDto.getPassword()));
        newUser.setRole(User.Role.USER);

        User savedUser = userRepository.save(newUser);
        logger.info("New user '{}' created by admin '{}'.", savedUser.getUsername(), getCurrentAuthenticatedUsername());
        return new ResponseEntity<>(convertToDto(savedUser), HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateDTO userUpdateDto) {
        logger.info("Admin user '{}' is attempting to update user with ID: {}", getCurrentAuthenticatedUsername(), id);

        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "User not found with id: " + id));

        if (existingUser.getRole() == User.Role.ADMIN) {
            logger.warn("Admin '{}' attempted to modify admin user '{}' (ID: {}). Operation denied.", getCurrentAuthenticatedUsername(), existingUser.getUsername(), existingUser.getId());
            throw new APIException(HttpStatus.FORBIDDEN, "Admins cannot modify admin users.");
        }

        if (!existingUser.getUsername().equals(userUpdateDto.getUsername())) {
            if (userRepository.existsByUsername(userUpdateDto.getUsername())) {
                throw new APIException(HttpStatus.BAD_REQUEST, "Username '" + userUpdateDto.getUsername() + "' is already taken.");
            }
            existingUser.setUsername(userUpdateDto.getUsername());
        }

        if (userUpdateDto.getPassword() != null && !userUpdateDto.getPassword().isEmpty()) {
            existingUser.setPasswordHash(passwordEncoder.encode(userUpdateDto.getPassword()));
            logger.info("Password for user ID: {} updated.", id);
        }

        User updatedUser = userRepository.save(existingUser);
        logger.info("User ID: {} updated successfully by admin '{}'.", id, getCurrentAuthenticatedUsername());
        return ResponseEntity.ok(convertToDto(updatedUser));
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        logger.info("Admin user '{}' is attempting to delete user with ID: {}", getCurrentAuthenticatedUsername(), id);

        User userToDelete = userRepository.findById(id)
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "User not found with id: " + id));

        if (userToDelete.getRole() == User.Role.ADMIN && !Objects.equals(userToDelete.getUsername(), getCurrentAuthenticatedUsername())) {
            logger.warn("Admin '{}' attempted to delete another admin user '{}' (ID: {}). Operation denied.", getCurrentAuthenticatedUsername(), userToDelete.getUsername(), userToDelete.getId());
            throw new APIException(HttpStatus.FORBIDDEN, "Admins cannot delete other admin users.");
        }
 
        if (Objects.equals(userToDelete.getUsername(), getCurrentAuthenticatedUsername())) {
             logger.warn("Admin '{}' attempted to delete their own account (ID: {}). Operation denied.", getCurrentAuthenticatedUsername(), userToDelete.getId());
             throw new APIException(HttpStatus.FORBIDDEN, "You cannot delete your own admin account.");
        }

        userRepository.delete(userToDelete);
        logger.info("User ID: {} deleted successfully by admin '{}'.", id, getCurrentAuthenticatedUsername());
        return ResponseEntity.ok("User deleted successfully!");
    }
}