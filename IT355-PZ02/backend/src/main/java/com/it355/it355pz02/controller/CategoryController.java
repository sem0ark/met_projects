package com.it355.it355pz02.controller;

import com.it355.it355pz02.controller.dto.CategoryDTO;
import com.it355.it355pz02.controller.dto.CategoryPostDTO;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.CategoryRepository;
import com.it355.it355pz02.utils.APIException;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @Autowired
    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        List<CategoryDTO> categoryDTOs = categories.stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(categoryDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        Optional<Category> category = categoryRepository.findById(id);
        return category.map(c -> ResponseEntity.ok(CategoryDTO.fromEntity(c)))
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id));
    }

    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryPostDTO categoryPostDTO) {
        if (categoryRepository.findByName(categoryPostDTO.getName()).isPresent()) {
            throw new APIException(HttpStatus.CONFLICT, "Category with name '" + categoryPostDTO.getName() + "' already exists.");
        }

        Category category = new Category();
        category.setName(categoryPostDTO.getName());
        // Description from CategoryPostDTO is currently not used in Category model
        // If you add description to Category model, map it here.

        Category savedCategory = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryDTO.fromEntity(savedCategory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryPostDTO categoryPostDTO) {
        Optional<Category> existingCategoryOptional = categoryRepository.findById(id);

        if (existingCategoryOptional.isEmpty()) {
            throw new APIException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id);
        }

        Category existingCategory = existingCategoryOptional.get();

        // Check if the new name conflicts with another existing category (excluding itself)
        if (categoryRepository.findByName(categoryPostDTO.getName())
                .filter(c -> !c.getId().equals(id))
                .isPresent()) {
            throw new APIException(HttpStatus.CONFLICT, "Category with name '" + categoryPostDTO.getName() + "' already exists.");
        }

        existingCategory.setName(categoryPostDTO.getName());

        Category updatedCategory = categoryRepository.save(existingCategory);
        return ResponseEntity.ok(CategoryDTO.fromEntity(updatedCategory));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new APIException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id);
        }
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
