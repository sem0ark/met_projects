package com.it355.it355pz02.controller.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import com.it355.it355pz02.model.Category;

import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDTO {
    private Long id;
    private String name;

    public static CategoryDTO fromEntity(Category category) {
        if (category == null) {
            return null;
        }
        return new CategoryDTO(category.getId(), category.getName());
    }
}
