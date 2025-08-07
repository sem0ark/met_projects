package com.it355.it355pz02.controller;

import com.it355.it355pz02.model.JWTAuthResponseDTO;
import com.it355.it355pz02.model.LoginDTO;
import com.it355.it355pz02.model.UserPostDTO;
import com.it355.it355pz02.model.User;
import com.it355.it355pz02.model.UserRepository;
import com.it355.it355pz02.security.AuthService;
import com.it355.it355pz02.utils.APIException;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@AllArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // https://www.geeksforgeeks.org/springboot/spring-boot-logging/
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private AuthService authService;
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<JWTAuthResponseDTO> authenticate(@RequestBody LoginDTO loginDto) {
        String token = authService.login(loginDto);

        User user = userRepository.findByUsername(loginDto.getUsername())
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "User not found with username: " + loginDto.getUsername()));

        JWTAuthResponseDTO jwtAuthResponse = new JWTAuthResponseDTO();
        jwtAuthResponse.setAccessToken(token);
        jwtAuthResponse.setUsername(user.getUsername());
        jwtAuthResponse.setRole(user.getRole());

        return ResponseEntity.ok(jwtAuthResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<JWTAuthResponseDTO> register(@Valid @RequestBody UserPostDTO registerDto) {
        String token = authService.register(registerDto);

        User user = userRepository.findByUsername(registerDto.getUsername())
                .orElseThrow(() -> new APIException(HttpStatus.BAD_REQUEST, "Username '" + registerDto.getUsername() + "' is already taken."));

        JWTAuthResponseDTO jwtAuthResponse = new JWTAuthResponseDTO();
        jwtAuthResponse.setAccessToken(token);
        jwtAuthResponse.setUsername(user.getUsername());
        jwtAuthResponse.setRole(user.getRole());
        logger.warn("Got a new user!");

        logger.warn("Got a new user: " + user.toString() + "  pass hash  " + user.getPasswordHash());

        return new ResponseEntity<>(jwtAuthResponse, HttpStatus.CREATED);
    }
}
