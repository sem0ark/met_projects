package com.it355.it355pz02.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryPostDTO {
    @NotBlank(message = "Category name is required")
    private String name;
}
