package com.it355.it355pz02.controller;

import com.it355.it355pz02.model.JWTAuthResponseDTO;
import com.it355.it355pz02.model.LoginDTO;
import com.it355.it355pz02.model.RegisterDTO;
import com.it355.it355pz02.model.User;
import com.it355.it355pz02.model.UserRepository;
import com.it355.it355pz02.security.AuthService;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@AllArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private AuthService authService;
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<JWTAuthResponseDTO> authenticate(@RequestBody LoginDTO loginDto) {
        String token = authService.login(loginDto);

        User user = userRepository.findByUsername(loginDto.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + loginDto.getUsername()));

        JWTAuthResponseDTO jwtAuthResponse = new JWTAuthResponseDTO();
        jwtAuthResponse.setAccessToken(token);
        jwtAuthResponse.setUsername(user.getUsername());
        jwtAuthResponse.setRole(user.getRole());

        return ResponseEntity.ok(jwtAuthResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<JWTAuthResponseDTO> register(@Valid @RequestBody RegisterDTO registerDto) {
        String token = authService.register(registerDto);

        User user = userRepository.findByUsername(registerDto.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + registerDto.getUsername()));

        JWTAuthResponseDTO jwtAuthResponse = new JWTAuthResponseDTO();
        jwtAuthResponse.setAccessToken(token);
        jwtAuthResponse.setUsername(user.getUsername());
        jwtAuthResponse.setRole(user.getRole());

        return new ResponseEntity<>(jwtAuthResponse, HttpStatus.CREATED);
    }
}
