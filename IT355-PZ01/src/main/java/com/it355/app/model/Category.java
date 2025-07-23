package com.it355.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // See https://www.baeldung.com/jpa-query-unrelated-entities
    // will be handled by the database with ON DELETE SET NULL
    // To make sure we DON'T delete products when removing a category
    @OneToMany(mappedBy = "category")
    private List<Product> products;
}
