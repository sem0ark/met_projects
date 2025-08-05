package com.it355.it355pz02.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash; // Stores the hashed password

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(nullable = false)
    private Role role;

    public enum Role {
        ADMIN,
        USER
    }
}
