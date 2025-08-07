package com.it355.it355pz02.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.it355.it355pz02.model.User;
import com.it355.it355pz02.model.UserRepository;

import lombok.AllArgsConstructor;


@Component
@AllArgsConstructor
public class SeedUsers implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(SeedUsers.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        logger.info("Adding default users for testing: 'admin' and 'user'");

        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin"));
            admin.setRole(User.Role.ADMIN);
            userRepository.save(admin);
        } else {
            logger.info("Admin user 'admin' already exists.");
        }

        if (userRepository.findByUsername("user").isEmpty()) {
            User regularUser = new User();
            regularUser.setUsername("user");
            regularUser.setPasswordHash(passwordEncoder.encode("user"));
            regularUser.setRole(User.Role.USER);
            userRepository.save(regularUser);
        } else {
            logger.info("Regular user 'user' already exists.");
        }

        logger.info("Database seeding completed.");
    }
}
